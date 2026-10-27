import { jest } from '@jest/globals';
import { Connection, createConnection } from 'mysql2/promise';
import { frameworkPreflight } from '../../../scripts/framework-preflight';
import { createHarness, Harness } from './harness';

jest.setTimeout(120000);
describe('read-only framework database preflight', () => {
  let h: Harness, connection: Connection;
  beforeAll(async () => {
    h = await createHarness();
    const [database] = await h.prisma.$queryRawUnsafe('SELECT DATABASE() AS name');
    const url = new URL(process.env.GRAPHQL_TEST_DATABASE_URL || process.env.DATABASE_URL!);
    url.pathname = `/${database.name}`;
    connection = await createConnection(url.toString());
  });
  afterAll(async () => { await connection?.end(); await h?.close(); });
  it('recognizes all core mappings without changing records or creating a ledger', async () => {
    const users = await h.prisma.user.findMany();
    const records = await h.prisma.entityRecord.findMany();
    const result = await frameworkPreflight(connection);
    expect(result.compatible).toBe(true);
    expect(result.models).toHaveLength(23);
    expect(result.tenantReconciliation).toEqual({ unregisteredCompanyIds: [1, 2], invalidCompanySources: [], invalidUserAssignments: 0 });
    expect(result.models.every(model => model.exists && model.missingColumns.length === 0)).toBe(true);
    expect(await h.prisma.user.findMany()).toEqual(users);
    expect(await h.prisma.entityRecord.findMany()).toEqual(records);
    expect((await connection.query("SHOW TABLES LIKE 'migrations'"))[0]).toEqual([]);
  });
  it('reports a missing runtime column without repairing or mutating it', async () => {
    await connection.query('ALTER TABLE entities DROP COLUMN ai_metadata');
    try {
      const result = await frameworkPreflight(connection);
      expect(result.compatible).toBe(false);
      expect(result.models.find(model => model.model === 'Entity')?.missingColumns).toEqual(['ai_metadata']);
      expect((await connection.query("SHOW COLUMNS FROM entities LIKE 'ai_metadata'"))[0]).toEqual([]);
    } finally { await connection.query('ALTER TABLE entities ADD COLUMN ai_metadata LONGTEXT NULL'); }
  });
  it('reports unregistered record and user company IDs without inferring ownership', async () => {
    await h.prisma.tenantRegistry.create({ data: { id: 1, name: 'One', domain: 'one.example', config: '{}' } });
    await h.prisma.user.update({ where: { id: 2 }, data: { metadata: '{"company_id":3}' } });
    await h.prisma.user.update({ where: { id: 3 }, data: { metadata: 'invalid legacy metadata' } });
    const result = await frameworkPreflight(connection);
    expect(result.tenantReconciliation).toEqual({ unregisteredCompanyIds: [2, 3], invalidCompanySources: [], invalidUserAssignments: 1 });
    expect(await h.prisma.tenantRegistry.count()).toBe(1);
    expect((await h.prisma.user.findUnique({ where: { id: 3 } })).metadata).toBe('invalid legacy metadata');
  });
  it('flags legacy null permission activity without silently granting access', async () => {
    const permission = await h.prisma.permission.create({ data: { name: 'legacy.null', display_name: 'Legacy null flag', isActive: null } });
    const result = await frameworkPreflight(connection);
    expect(result.compatible).toBe(false);
    expect(result.identityState).toContainEqual({ model: 'Permission', nullActiveRows: 1 });
    expect((await h.prisma.permission.findUnique({ where: { id: permission.id } })).isActive).toBeNull();
  });
});
