/**
 * RBAC Models
 */

export const Role = {
  name: 'Role',
  table: 'rbac_roles',
  columns: {
    id: { type: 'int', primary: true, autoIncrement: true },
    name: { type: 'varchar', length: 100, unique: true, notNull: true },
    description: { type: 'varchar', length: 255 },
    permissions: { type: 'json', default: '[]' },
    isSystem: { type: 'boolean', default: false },
    isActive: { type: 'boolean', default: true },
    createdAt: { type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
    updatedAt: { type: 'timestamp', default: 'CURRENT_TIMESTAMP' }
  }
};

export const Permission = {
  name: 'Permission',
  table: 'rbac_permissions',
  columns: {
    id: { type: 'int', primary: true, autoIncrement: true },
    name: { type: 'varchar', length: 100, unique: true, notNull: true },
    code: { type: 'varchar', length: 150, unique: true, notNull: true },
    description: { type: 'varchar', length: 255 },
    groupName: { type: 'varchar', length: 100 },
    category: { type: 'varchar', length: 50 },
    isActive: { type: 'boolean', default: true },
    createdAt: { type: 'timestamp', default: 'CURRENT_TIMESTAMP' }
  }
};

export const AccessRule = {
  name: 'AccessRule',
  table: 'rbac_access_rules',
  columns: {
    id: { type: 'int', primary: true, autoIncrement: true },
    name: { type: 'varchar', length: 100, notNull: true },
    model: { type: 'varchar', length: 100, notNull: true },
    roleId: { type: 'int', foreignKey: { table: 'rbac_roles', column: 'id' } },
    permission: { type: 'varchar', length: 50, notNull: true },
    field: { type: 'varchar', length: 100 },
    filter: { type: 'json' },
    isActive: { type: 'boolean', default: true },
    priority: { type: 'int', default: 0 },
    createdAt: { type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
    updatedAt: { type: 'timestamp', default: 'CURRENT_TIMESTAMP' }
  }
};

export default {
  Role,
  Permission,
  AccessRule
};
