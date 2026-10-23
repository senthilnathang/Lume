import { jest } from '@jest/globals';
import { createHarness, type Harness } from './harness';

jest.setTimeout(120000);
describe('GraphQL permission catalog (real MySQL)', () => {
  let h: Harness;
  let inactiveId: number;
  let nullActiveId: number;
  const fields = 'id name displayName description category isActive createdAt updatedAt';
  beforeAll(async () => {
    h = await createHarness();
    await h.prisma.permission.createMany({ data: Array.from({ length: 105 }, (_, i) => ({
      name: `catalog.${i}`, display_name: `Catalog ${i}`, category: 'catalog', description: 'Catalog entry',
    })) });
    inactiveId = (await h.prisma.permission.create({ data: {
      name: 'catalog.disabled', display_name: 'Disabled', category: 'catalog', isActive: false,
    } })).id;
    nullActiveId = (await h.prisma.permission.create({ data: {
      name: 'catalog.legacy', display_name: 'Legacy', category: 'catalog', isActive: null,
    } })).id;
  });
  afterAll(async () => { await h?.close(); });

  it('returns stored permission metadata with default pagination', async () => {
    const response = await h.query(`{ permissions { ${fields} } }`);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.permissions).toHaveLength(20);
    const first = response.body.data.permissions[0];
    const stored = await h.prisma.permission.findUnique({ where: { id: Number(first.id) } });
    expect(first).toMatchObject({ name: stored.name, displayName: stored.display_name, category: stored.category, isActive: true });
    expect(new Date(first.createdAt).toISOString()).toBe(stored.createdAt.toISOString());
    expect(new Date(first.updatedAt).toISOString()).toBe(stored.updatedAt.toISOString());
  });

  it('filters before paginating in stable ID order', async () => {
    const response = await h.query('{ first:permissions(category:"catalog",pagination:{limit:3}) { name } second:permissions(category:"catalog",pagination:{page:2,limit:3}) { name } }');
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.first.map((p: any) => p.name)).toEqual(['catalog.0', 'catalog.1', 'catalog.2']);
    expect(response.body.data.second.map((p: any) => p.name)).toEqual(['catalog.3', 'catalog.4', 'catalog.5']);
  });

  it('caps large pages and excludes disabled or null-active permissions', async () => {
    const response = await h.query('{ capped:permissions(category:"catalog",pagination:{limit:1000}) { id } end:permissions(category:"catalog",pagination:{page:2,limit:100}) { id name } }');
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.capped).toHaveLength(100);
    expect(response.body.data.end.map((p: any) => p.name)).toEqual(['catalog.100','catalog.101','catalog.102','catalog.103','catalog.104']);
  });

  it('returns empty arrays for unknown categories and pages beyond the end', async () => {
    const response = await h.query('{ unknown:permissions(category:"missing") { id } beyond:permissions(pagination:{page:999}) { id } }');
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data).toEqual({ unknown: [], beyond: [] });
  });

  it('loads active permissions and returns null for missing or inactive IDs', async () => {
    const stored = await h.prisma.permission.findFirst({ where: { name: 'catalog.0' } });
    const response = await h.query(`{ found:permission(id:${stored.id}) { ${fields} } disabled:permission(id:${inactiveId}) { id } legacy:permission(id:${nullActiveId}) { id } missing:permission(id:999999) { id } }`);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.found).toMatchObject({ name: 'catalog.0', displayName: 'Catalog 0', description: 'Catalog entry' });
    expect(response.body.data.disabled).toBeNull();
    expect(response.body.data.legacy).toBeNull();
    expect(response.body.data.missing).toBeNull();
  });

  it.each(['{ permission(id:0) { id } }', '{ permission(id:-1) { id } }', '{ permissions(pagination:{page:0}) { id } }', '{ permissions(pagination:{limit:-1}) { id } }'])('rejects invalid input: %s', async query => {
    expect((await h.query(query)).body.errors[0].extensions.code).toBe('BAD_REQUEST');
  });

  it('requires authentication and the role-read permission', async () => {
    for (const query of ['{ permissions { id } }', '{ permission(id:1) { id } }']) {
      expect((await h.query(query, null)).body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
      expect((await h.query(query, h.token('member'))).body.errors[0].extensions.code).toBe('FORBIDDEN');
    }
    const permission = await h.prisma.permission.create({ data: { name: 'base.roles.read', display_name: 'Read roles' } });
    await h.prisma.rolePermission.create({ data: { roleId: 2, permissionId: permission.id } });
    const response = await h.query(`{ permission(id:${permission.id}) { name } permissions(category:"catalog",pagination:{limit:1}) { name } }`, h.token('member'));
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data).toEqual({ permission: { name: 'base.roles.read' }, permissions: [{ name: 'catalog.0' }] });
  });
});
