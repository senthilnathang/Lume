/**
 * Core Module Models Index
 * Exports all models from the core module
 */

import User from '../../modules/user/user.model.js';
import Role from '../../modules/auth/role.model.js';
import Permission from '../../modules/auth/permission.model.js';
import RolePermission from '../../modules/auth/rolePermission.model.js';
import Setting from '../../modules/settings/setting.model.js';
import AuditLog from '../../modules/audit/auditLog.model.js';

export {
  User,
  Role,
  Permission,
  RolePermission,
  Setting,
  AuditLog
};

export default {
  User,
  Role,
  Permission,
  RolePermission,
  Setting,
  AuditLog
};
