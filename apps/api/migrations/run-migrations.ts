import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { createConnection, Connection, RowDataPacket } from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { sqlStatements } from './sql-statements';

export function migrationFiles(directory: string): string[] {
  return fs.readdirSync(directory).filter(name => /^\d{3}_[a-z0-9_]+\.sql$/.test(name)).sort();
}

export async function migrationStatus(connection: Connection, directory: string) {
  const [tables] = await connection.query<RowDataPacket[]>(
    "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='migrations'",
  );
  const executed = tables.length
    ? (await connection.query<RowDataPacket[]>('SELECT filename FROM migrations'))[0].map(row => row.filename)
    : [];
  return migrationFiles(directory).map(filename => ({ filename, executed: executed.includes(filename) }));
}

export async function applyMigrations(connection: Connection, filenames: string[], directory: string) {
  const available = migrationFiles(directory);
  if (!filenames.length || new Set(filenames).size !== filenames.length || filenames.some(name => !available.includes(name))) {
    throw new Error('Select unique, existing migration filenames explicitly');
  }
  const scripts = [...filenames].sort().map(filename => ({ filename,
    statements: sqlStatements(fs.readFileSync(path.join(directory, filename), 'utf8')) }));
  if (scripts.some(script => !script.statements.length)) throw new Error('Empty migration');
  const [[database]] = await connection.query<RowDataPacket[]>('SELECT DATABASE() AS name');
  if (!database.name) throw new Error('A database must be selected');
  const lockName = 'lume-migrations-' + createHash('sha256').update(database.name).digest('hex').slice(0, 40);
  const [[lock]] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?, 10) AS acquired', [lockName]);
  if (lock.acquired !== 1) throw new Error('Migration lock unavailable');
  try {
    await connection.query(`CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY, filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, execution_time_ms INT
    )`);
    const status = await migrationStatus(connection, directory);
    for (const script of scripts) {
      if (status.find(row => row.filename === script.filename)?.executed) {
        console.log(`Already applied: ${script.filename}`); continue;
      }
      const started = Date.now();
      try {
        for (const statement of script.statements) await connection.query(statement);
        await connection.execute('INSERT INTO migrations (filename, execution_time_ms) VALUES (?, ?)',
          [script.filename, Date.now() - started]);
        console.log(`Applied: ${script.filename}`);
      } catch (error: any) {
        throw new Error(`${script.filename} failed (${error.code || 'database error'}). Earlier statements may have committed; inspect the schema before retrying.`);
      }
    }
  } finally { await connection.query('SELECT RELEASE_LOCK(?)', [lockName]); }
}

async function main() {
  dotenv.config({ quiet: true });
  const args = process.argv.slice(2);
  if (args.length && !(args.length === 1 && args[0] === '--status') && !(args[0] === '--apply' && args.length > 1)) {
    throw new Error('Usage: npm run db:migrate:sql -- --status | --apply <filename.sql> ...');
  }
  const connection = process.env.DATABASE_URL ? await createConnection(process.env.DATABASE_URL) : await createConnection({
    host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root', password: process.env.DB_PASS ?? process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || 'lume',
  });
  try {
    if (args[0] === '--apply') await applyMigrations(connection, args.slice(1), __dirname);
    else for (const row of await migrationStatus(connection, __dirname)) console.log(`${row.executed ? 'applied' : 'unrecorded'} ${row.filename}`);
  } finally { await connection.end(); }
}

if (typeof require !== 'undefined' && require.main === module) main().catch((error: any) => {
  console.error(error.code || error.message);
  process.exitCode = 1;
});
