import { SecurityService, matchesPermission } from '../../src/modules/base/services/security.service.js';

describe('group-based grants (F1.3)', () => {
  function groupDb() {
    const store = {
      'usergroups.9': JSON.stringify(['editors', 'support']),
      'groupgrants.editors': JSON.stringify(['articles.*']),
      'groupgrants.support': JSON.stringify(['tickets.read']),
    };
    const db = makeDb();
    db.setting = {
      findFirst: async ({ where }) => (
        where.key in store ? { key: where.key, value: store[where.key] } : null
      ),
    };
    return db;
  }

  test('unions group grants with role permissions', async () => {
    const svc = new SecurityService(null, groupDb());
    expect(await svc.checkPermission(9, 'articles.delete')).toBe(true);
    expect(await svc.checkPermission(9, 'tickets.read')).toBe(true);
    expect(await svc.checkPermission(9, 'articles.read')).toBe(true);
    expect(await svc.checkPermission(9, 'billing.read')).toBe(false);
  });

  test('users without groups get role permissions only', async () => {
    const db = groupDb();
    db.setting.findFirst = async () => null;
    const svc = new SecurityService(null, db);
    expect(await svc.checkPermission(9, 'tickets.read')).toBe(false);
    expect(await svc.checkPermission(9, 'articles.read')).toBe(true);
  });
});

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
    role: {
      findUnique: async () => role,
      findMany: async () => [{ ...role, metadata: null }],
    },
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
