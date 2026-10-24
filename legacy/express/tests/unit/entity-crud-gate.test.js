import { SecurityService } from '../../src/modules/base/services/security.service.js';

function makeDb({ scopedPermissions = [] } = {}) {
  return {
    user: { findUnique: async () => ({ id: 9, role_id: 3 }) },
    role: {
      findUnique: async () => ({ id: 3, name: 'editor', isActive: true, metadata: null }),
      findMany: async () => [{ id: 3, name: 'editor', isActive: true, metadata: null }],
    },
    rolePermission: { findMany: async () => [] },
    permission: {
      findMany: async ({ where } = {}) => {
        if (where?.name?.startsWith) {
          return scopedPermissions
            .filter((p) => p.startsWith(where.name.startsWith))
            .map((name) => ({ name }));
        }
        return [];
      },
    },
    setting: { findFirst: async () => null },
  };
}

describe('entity CRUD gate (F1.5)', () => {
  test('legacy allow when no scoped permissions are seeded', async () => {
    const svc = new SecurityService(null, makeDb());
    expect(await svc.isEntityGateActive('employee')).toBe(false);
    expect(await svc.checkEntityAccess(9, 'employee', 'delete')).toBe(true);
  });

  test('denies ungranted actions once scoped permissions exist', async () => {
    const svc = new SecurityService(null, makeDb({ scopedPermissions: ['employee.read', 'employee.create'] }));
    expect(await svc.isEntityGateActive('employee')).toBe(true);
    expect(await svc.checkEntityAccess(9, 'employee', 'read')).toBe(false);
    expect(await svc.checkEntityAccess(9, 'other', 'read')).toBe(true);
  });

  test('grants exact and wildcard matches', async () => {
    const db = makeDb({ scopedPermissions: ['employee.read'] });
    db.setting.findFirst = async ({ where }) => (
      where.key === 'permsets.user.9'
        ? { key: where.key, value: JSON.stringify(['employee.*']) }
        : null
    );
    const svc = new SecurityService(null, db);
    expect(await svc.checkEntityAccess(9, 'employee', 'delete')).toBe(true);
  });

  test('rejects empty entity or action', async () => {
    const svc = new SecurityService(null, makeDb());
    expect(await svc.checkEntityAccess(9, '', 'read')).toBe(false);
    expect(await svc.checkEntityAccess(9, 'employee', '')).toBe(false);
  });
});
