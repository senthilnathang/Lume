import { SecurityService, parseParentRoleId } from '../../src/modules/base/services/security.service.js';

function makeDb({ userRoleId = 2 } = {}) {
  const roles = [
    { id: 1, name: 'super_admin', isActive: true, metadata: null },
    { id: 2, name: 'manager', isActive: true, metadata: JSON.stringify({ parentRoleId: null }) },
    { id: 3, name: 'editor', isActive: true, metadata: JSON.stringify({ parentRoleId: 2 }) },
    { id: 4, name: 'intern', isActive: false, metadata: JSON.stringify({ parentRoleId: 2 }) },
  ];
  const grants = {
    2: [{ permission: { name: 'team.read' } }],
    3: [{ permission: { name: 'articles.read' } }],
    4: [{ permission: { name: 'secret.read' } }],
  };
  return {
    user: { findUnique: async () => ({ id: 9, role_id: userRoleId }) },
    role: {
      findUnique: async ({ where }) => roles.find((r) => r.id === where.id) || null,
      findMany: async () => roles,
    },
    rolePermission: {
      findMany: async ({ where }) => {
        const ids = Array.isArray(where?.roleId?.in) ? where.roleId.in : [where?.roleId];
        return ids.flatMap((id) => grants[id] || []);
      },
    },
    permission: { findMany: async () => [] },
    setting: { findFirst: async () => null },
  };
}

describe('role hierarchy inheritance (F1.2)', () => {
  test('parses parent links from metadata', () => {
    expect(parseParentRoleId({ metadata: JSON.stringify({ parentRoleId: 2 }) })).toBe(2);
    expect(parseParentRoleId({ metadata: null })).toBeNull();
    expect(parseParentRoleId({ metadata: 'garbage' })).toBeNull();
  });

  test('parent-role holders inherit active child permissions', async () => {
    const svc = new SecurityService(null, makeDb({ userRoleId: 2 }));
    expect(await svc.checkPermission(9, 'team.read')).toBe(true);
    expect(await svc.checkPermission(9, 'articles.read')).toBe(true);
    expect(await svc.checkPermission(9, 'secret.read')).toBe(false);
  });

  test('child-role holders do not inherit upward', async () => {
    const svc = new SecurityService(null, makeDb({ userRoleId: 3 }));
    expect(await svc.checkPermission(9, 'articles.read')).toBe(true);
    expect(await svc.checkPermission(9, 'team.read')).toBe(false);
  });

  test('invalidateAll clears every instance cache', async () => {
    const db = makeDb({ userRoleId: 2 });
    const a = new SecurityService(null, db);
    const b = new SecurityService(null, db);
    expect(await a.checkPermission(9, 'team.read')).toBe(true);
    expect(a.permissionCache.size).toBe(1);
    expect(SecurityService.invalidateAll()).toBeGreaterThanOrEqual(2);
    expect(a.permissionCache.size).toBe(0);
    expect(b.permissionCache.size).toBe(0);
  });
});
