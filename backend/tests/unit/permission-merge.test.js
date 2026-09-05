import { SecurityService, matchesPermission } from '../../src/modules/base/services/security.service.js';

describe('wildcard permission matching', () => {
  test('matches exact, star, and partial wildcards', () => {
    expect(matchesPermission('articles.read', 'articles.read')).toBe(true);
    expect(matchesPermission('*', 'anything.at.all')).toBe(true);
    expect(matchesPermission('*.*', 'articles.read')).toBe(true);
    expect(matchesPermission('articles.*', 'articles.delete')).toBe(true);
    expect(matchesPermission('*.read', 'articles.read')).toBe(true);
    expect(matchesPermission('articles.read', 'articles.write')).toBe(false);
    expect(matchesPermission('articles.*', 'pages.read')).toBe(false);
    expect(matchesPermission('*.read', 'articles.write')).toBe(false);
  });

  test('grants with wildcards expand checks', async () => {
    const svc = new SecurityService(null, makeDb({ grants: ['articles.*'] }));
    expect(await svc.checkPermission(9, 'articles.delete')).toBe(true);
    expect(await svc.checkPermission(9, 'pages.read')).toBe(false);
  });

  test('admin tiers carry wildcard markers', async () => {
    const svc = new SecurityService(null, makeDb({ role: { id: 1, name: 'super_admin', isActive: true } }));
    const perms = await svc.getEffectivePermissions(9);
    expect(perms).toEqual(expect.arrayContaining(['*', '*.*']));
    expect(await svc.checkPermission(9, 'nope.nothing')).toBe(true);
  });
});

function makeDb({ role = { id: 3, name: 'editor', isActive: true }, grants = [] } = {}) {
  return {
    user: { findUnique: async () => ({ id: 9, role_id: 3 }) },
    role: { findUnique: async () => role },
    rolePermission: {
      findMany: async () => [{ permission: { name: 'articles.read' } }],
      findFirst: async () => null,
    },
    permission: { findMany: async () => [{ name: 'articles.read' }, { name: 'articles.write' }] },
    setting: {
      findFirst: async ({ where }) => (
        where.key === 'permsets.user.9' ? { key: where.key, value: JSON.stringify(grants) } : null
      ),
    },
  };
}

describe('permission-set merge (SecurityService)', () => {
  test('merges role permissions with direct grants', async () => {
    const svc = new SecurityService(null, makeDb({ grants: ['articles.write'] }));
    expect(await svc.checkPermission(9, 'articles.read')).toBe(true);
    expect(await svc.checkPermission(9, 'articles.write')).toBe(true);
    expect(await svc.checkPermission(9, 'articles.delete')).toBe(false);
    expect(await svc.getUserPermissions(9)).toEqual(
      expect.arrayContaining(['articles.read', 'articles.write'])
    );
  });

  test('inactive role denies everything including grants', async () => {
    const svc = new SecurityService(
      null, makeDb({ role: { id: 3, name: 'editor', isActive: false }, grants: ['articles.write'] })
    );
    expect(await svc.checkPermission(9, 'articles.write')).toBe(false);
    expect(await svc.getUserPermissions(9)).toEqual([]);
  });

  test('caches effective permissions and clearCache invalidates', async () => {
    let calls = 0;
    const db = makeDb();
    const inner = db.rolePermission.findMany;
    db.rolePermission.findMany = async (...a) => { calls += 1; return inner(...a); };
    const svc = new SecurityService(null, db);
    await svc.getUserPermissions(9);
    await svc.getUserPermissions(9);
    expect(calls).toBe(1);
    svc.clearCache();
    await svc.getUserPermissions(9);
    expect(calls).toBe(2);
  });
});
