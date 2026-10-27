import { Prisma } from '@prisma/client';
import { Connection, createConnection, RowDataPacket } from 'mysql2/promise';
import dotenv from 'dotenv';
import frameworkModels from './framework-models.json';
import { tenantMembership } from '../src/core/services/tenant-membership';

/** Read-only column/mapping and identity-state audit; never imports or rewrites data. */
export async function frameworkPreflight(connection: Connection) {
  const [columns] = await connection.query<RowDataPacket[]>(`
    SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName
    FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()`);
  const tables = new Map<string, Set<string>>();
  for (const row of columns) {
    if (!tables.has(row.tableName)) tables.set(row.tableName, new Set());
    tables.get(row.tableName)!.add(row.columnName);
  }
  const models = frameworkModels.map(name => {
    const model = Prisma.dmmf.datamodel.models.find(candidate => candidate.name === name);
    if (!model) throw new Error(`Unknown framework model: ${name}`);
    const table = model.dbName ?? model.name;
    const required = model.fields.filter(field => field.kind !== 'object').map(field => field.dbName ?? field.name);
    return { model: name, table, exists: tables.has(table), missingColumns: required.filter(column => !tables.get(table)?.has(column)) };
  });
  const identityState: Array<{ model: string; nullActiveRows: number }> = [];
  for (const name of ['User', 'Role', 'Permission']) {
    const model = Prisma.dmmf.datamodel.models.find(candidate => candidate.name === name)!;
    const table = model.dbName ?? model.name;
    const field = model.fields.find(candidate => candidate.name === 'isActive')!;
    const column = field.dbName ?? field.name;
    if (!tables.get(table)?.has(column)) continue;
    // Identifiers come only from generated schema metadata; mysql2 escapes them.
    const [rows] = await connection.query<RowDataPacket[]>('SELECT COUNT(*) AS count FROM ?? WHERE ?? IS NULL', [table, column]);
    identityState.push({ model: name, nullActiveRows: Number(rows[0].count) });
  }
  const companyIds = new Set<number>();
  const invalidCompanySources: string[] = [];
  for (const [table, columns] of tables) {
    if (!columns.has('company_id')) continue;
    const [rows] = await connection.query<RowDataPacket[]>('SELECT DISTINCT company_id AS id FROM ?? WHERE company_id IS NOT NULL', [table]);
    for (const row of rows) {
      const id = Number(row.id);
      if (Number.isSafeInteger(id) && id > 0 && id <= 2147483647) companyIds.add(id);
      else if (!invalidCompanySources.includes(table)) invalidCompanySources.push(table);
    }
  }
  let invalidUserAssignments = 0;
  if (tables.get('users')?.has('metadata')) {
    const [rows] = await connection.query<RowDataPacket[]>('SELECT metadata FROM users WHERE metadata IS NOT NULL');
    for (const row of rows) {
      try {
        const { companyId } = tenantMembership(row.metadata);
        if (companyId !== null) companyIds.add(companyId);
      } catch { invalidUserAssignments++; }
    }
  }
  const registered = new Set<number>();
  if (tables.get('tenant_registry')?.has('id')) {
    const [rows] = await connection.query<RowDataPacket[]>('SELECT id FROM tenant_registry');
    for (const row of rows) registered.add(Number(row.id));
  }
  return {
    readOnly: true,
    scope: 'Core columns, null identity flags and observed company-ID registration; not membership, type/index, data parity, backup or release certification',
    compatible: models.every(model => model.exists && !model.missingColumns.length) && identityState.every(row => row.nullActiveRows === 0),
    models, identityState,
    tenantReconciliation: { unregisteredCompanyIds: [...companyIds].filter(id => !registered.has(id)).sort((a, b) => a - b), invalidCompanySources, invalidUserAssignments },
  };
}

async function main() {
  dotenv.config({ quiet: true });
  const url = process.env.FRAMEWORK_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('FRAMEWORK_DATABASE_URL or DATABASE_URL is required');
  const connection = await createConnection(url);
  try {
    const result = await frameworkPreflight(connection);
    console.log(JSON.stringify(result, null, 2));
    if (!result.compatible) process.exitCode = 2;
  } finally { await connection.end(); }
}

if (typeof require !== 'undefined' && require.main === module) main().catch(error => {
  console.error(error.code || 'Framework preflight failed; check connection and schema configuration');
  process.exitCode = 1;
});
