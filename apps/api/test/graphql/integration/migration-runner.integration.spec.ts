import { jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createConnection, Connection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { applyMigrations, migrationStatus } from '../../../migrations/run-migrations';

dotenv.config({ quiet: true });
jest.setTimeout(30000);
describe('SQL migration runner (disposable MySQL database)', () => {
  let admin: Connection, db: Connection, name: string, directory: string, target: string;
  beforeEach(async () => {
    const url = new URL(process.env.GRAPHQL_TEST_DATABASE_URL || process.env.DATABASE_URL!);
    admin = await createConnection(url.toString());
    name = 'lume_migration_test_' + randomUUID().replace(/-/g, '');
    await admin.query('CREATE DATABASE ??', [name]);
    url.pathname = '/' + name; target = url.toString();
    db = await createConnection(target);
    directory = mkdtempSync(join(tmpdir(), 'lume-migrations-'));
  });
  afterEach(async () => {
    await db?.end();
    if (admin) { if (name) await admin.query('DROP DATABASE ??', [name]); await admin.end(); }
    if (directory) rmSync(directory, { recursive: true });
  });
  const file = (name: string, sql: string) => writeFileSync(join(directory, name), sql);

  it('reports unrecorded files without creating a ledger or executing SQL', async () => {
    file('001_first.sql', 'CREATE TABLE example(id INT);');
    expect(await migrationStatus(db, directory)).toEqual([{filename:'001_first.sql', executed:false}]);
    expect((await db.query('SHOW TABLES'))[0]).toEqual([]);
  });
  it('executes trigger blocks and quoted semicolons, then skips recorded migrations', async () => {
    file('001_first.sql', "CREATE TABLE example(id INT, note TEXT);\nDELIMITER $$\nCREATE TRIGGER set_note BEFORE INSERT ON example FOR EACH ROW BEGIN SET NEW.note = 'real;value'; END$$\nDELIMITER ;\nINSERT INTO example(id) VALUES (1);");
    await applyMigrations(db, ['001_first.sql'], directory);
    await applyMigrations(db, ['001_first.sql'], directory);
    expect((await db.query('SELECT * FROM example'))[0]).toEqual([{id:1,note:'real;value'}]);
    expect(await migrationStatus(db, directory)).toEqual([{filename:'001_first.sql',executed:true}]);
  });
  it('serializes competing runners and only applies a migration once', async () => {
    file('001_first.sql', 'CREATE TABLE example(id INT); INSERT INTO example VALUES(1);');
    const second = await createConnection(target);
    try { await Promise.all([applyMigrations(db,['001_first.sql'],directory), applyMigrations(second,['001_first.sql'],directory)]); }
    finally { await second.end(); }
    expect((await db.query('SELECT * FROM example'))[0]).toEqual([{id:1}]);
  });
  it('executes migration 002 and generates sequential record version numbers', async () => {
    await db.query('CREATE TABLE users(id INT PRIMARY KEY)');
    const filename = '002_create_record_versions_table.sql';
    file(filename, readFileSync(join('migrations',filename),'utf8'));
    await applyMigrations(db,[filename],directory);
    for (let i=0;i<2;i++) await db.query("INSERT INTO record_versions(entity_name,record_id,version_number,data_snapshot) VALUES ('deal',1,NULL,'{}')");
    expect((await db.query('SELECT version_number FROM record_versions ORDER BY id'))[0]).toEqual([{version_number:1},{version_number:2}]);
  });
  it('applies all legacy files against the current base layout without replacing existing fields', async () => {
    await db.query('CREATE TABLE users(id INT PRIMARY KEY)');
    await db.query('CREATE TABLE entities(id INT PRIMARY KEY, name VARCHAR(191), label VARCHAR(191), description TEXT, module_id INT, updated_at DATETIME, INDEX entities_module_id(module_id))');
    await db.query("INSERT INTO entities VALUES(1,'deal','Deal','Keep description',1,'2026-01-01')");
    await db.query('CREATE TABLE entity_fields(id INT PRIMARY KEY, entity_id INT, name VARCHAR(255), UNIQUE KEY entity_fields_entity_id_name(entity_id,name))');
    await db.query('CREATE TABLE entity_records(id INT PRIMARY KEY)');
    const names = ['001_create_workflow_runs_table.sql','002_create_record_versions_table.sql','003_create_workflow_versions_table.sql','004_create_policies_table.sql','005_add_ai_metadata_to_entities.sql','006_add_field_indexing_support.sql','007_create_module_versions_table.sql','008_create_plugin_management_tables.sql'];
    for (const name of names) file(name,readFileSync(join('migrations',name),'utf8'));
    await applyMigrations(db,names,directory);
    expect((await migrationStatus(db,directory)).every(row=>row.executed)).toBe(true);
    expect((await db.query('SELECT description, ai_metadata FROM entities'))[0]).toEqual([{description:'Keep description',ai_metadata:null}]);
    await db.query('INSERT INTO entity_records VALUES(1)');
    await db.query("INSERT INTO entity_record_search_index(entity_name,record_id,field_name) VALUES('deal',1,'name')");
    await db.query('DELETE FROM entity_records WHERE id=1');
    expect((await db.query('SELECT * FROM entity_record_search_index'))[0]).toEqual([]);
  });
  it('does not record a failed migration or run later files and releases the lock', async () => {
    file('001_first.sql', 'CREATE TABLE example(id INT); INSERT INTO missing_table VALUES(1);');
    file('002_next.sql', 'CREATE TABLE later(id INT);');
    await expect(applyMigrations(db,['001_first.sql','002_next.sql'],directory)).rejects.toThrow('may have committed');
    expect((await db.query('SELECT * FROM migrations'))[0]).toEqual([]);
    expect((await db.query("SHOW TABLES LIKE 'later'"))[0]).toEqual([]);
    const second = await createConnection(target);
    try { await applyMigrations(second,['002_next.sql'],directory); } finally { await second.end(); }
  });
  it.each([false, true])('migration 017 preserves documents and existing soft-delete values (column exists: %s)', async exists => {
    await db.query(`CREATE TABLE documents(id INT PRIMARY KEY, title VARCHAR(255)${exists ? ', deleted_at DATETIME NULL' : ''})`);
    await db.query("INSERT INTO documents(id,title) VALUES(1,'Keep document')");
    if (exists) await db.query("UPDATE documents SET deleted_at='2026-01-01' WHERE id=1");
    const filename = '017_align_document_soft_delete.sql';
    file(filename, readFileSync(join('migrations', filename), 'utf8'));
    await applyMigrations(db, [filename], directory);
    await applyMigrations(db, [filename], directory);
    const [rows]: any = await db.query('SELECT id,title,deleted_at FROM documents');
    expect(rows[0].title).toBe('Keep document');
    expect(rows[0].deleted_at == null).toBe(!exists);
    if (exists) expect(rows[0].deleted_at.getFullYear()).toBe(2026);
  });
  it('validates the entire selection before any changes', async () => {
    file('001_first.sql', 'CREATE TABLE example(id INT);');
    file('002_broken.sql', "SELECT 'unterminated");
    await expect(applyMigrations(db,['001_first.sql','002_broken.sql'],directory)).rejects.toThrow('Unterminated');
    await expect(applyMigrations(db,['../001_first.sql'],directory)).rejects.toThrow('existing');
    await expect(applyMigrations(db,[],directory)).rejects.toThrow('explicitly');
    expect((await db.query('SHOW TABLES'))[0]).toEqual([]);
  });
});
