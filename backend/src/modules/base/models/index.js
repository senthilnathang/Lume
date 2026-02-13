/**
 * Base Module Models
 * Simplified version - skipping complex associations for now
 */

import InstalledModuleFactory from './installed-module.model.js';
import MenuFactory from './menu.model.js';
import PermissionFactory from './permission.model.js';
import RoleFactory from './role.model.js';
import GroupFactory from './group.model.js';
import RecordRuleFactory from './record-rule.model.js';
import SequenceFactory from './sequence.model.js';
import AuditLogFactory from './audit-log.model.js';

export {
  InstalledModuleFactory,
  MenuFactory,
  PermissionFactory,
  RoleFactory,
  GroupFactory,
  RecordRuleFactory,
  SequenceFactory,
  AuditLogFactory
};

// Factory function to create all models
export const createModels = (sequelize, services = {}) => {
  const models = {};
  
  // Create all models first without associations
  const { model: InstalledModule } = InstalledModuleFactory(sequelize, services.securityService);
  models.InstalledModule = InstalledModule;
  
  const { model: Menu } = MenuFactory(sequelize, services.securityService);
  models.Menu = Menu;
  
  const { model: Permission } = PermissionFactory(sequelize, services.securityService);
  models.Permission = Permission;
  
  const { model: Role } = RoleFactory(sequelize, services.securityService);
  models.Role = Role;
  
  const { model: Group } = GroupFactory(sequelize, services.securityService);
  models.Group = Group;
  
  const { model: RecordRule } = RecordRuleFactory(sequelize, services.securityService);
  models.RecordRule = RecordRule;
  
  const { model: Sequence } = SequenceFactory(sequelize, services.securityService);
  models.Sequence = Sequence;
  
  const { model: AuditLog } = AuditLogFactory(sequelize);
  models.AuditLog = AuditLog;
  
  // Skip associations for now - can be added later
  // This avoids circular dependency issues during initialization
  
  return models;
};

export default createModels;
