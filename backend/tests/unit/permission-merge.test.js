import { SecurityService } from '../../src/modules/base/services/security.service.js';

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
