import { Sequelize } from 'sequelize';

// Core models
import { User } from './user.model';
import { Company } from './company.model';
import { Role } from './role.model';
import { Permission } from './permission.model';
import { Group } from './group.model';

// Junction tables
import { RolePermission } from './role-permission.model';
import { UserCompanyRole } from './user-company-role.model';
import { UserGroup } from './user-group.model';
import { GroupPermission } from './group-permission.model';

// RBAC models
import { ContentType } from './content-type.model';
import { MenuItem } from './menu-item.model';
import { AccessRule } from './access-rule.model';
import { UserMenuPermission } from './user-menu-permission.model';
import { RoleMenuPermission } from './role-menu-permission.model';
import { GroupMenuPermission } from './group-menu-permission.model';

// Security / Zero Trust
import { DeviceRegistry } from './device-registry.model';
import { SecuritySession } from './security-session.model';
import { TrustEvent } from './trust-event.model';
import { UserSecuritySettings } from './user-security-settings.model';
import { SecuritySetting } from './security-setting.model';
import { SecurityPolicyTemplate } from './security-policy-template.model';

// Access control
import { RLSPolicy } from './rls-policy.model';
import { FieldPermission } from './field-permission.model';
import { ModelAccess } from './model-access.model';

// Logging
import { ActivityLog } from './activity-log.model';
import { AuditLog } from './audit-log.model';

// Misc
import { Attachment } from './attachment.model';
import { Message } from './message.model';
import { Invitation } from './invitation.model';
import { PasswordHistory } from './password-history.model';
import { SocialAccount } from './social-account.model';

// ============================================================================
// Model Initialization
// ============================================================================

let modelsInitialized = false;

export function initModels(sequelize: Sequelize): void {
  if (modelsInitialized) return;

  // Initialize all models (order matters for FK references)
  User.initModel(sequelize);
  Company.initModel(sequelize);
  Role.initModel(sequelize);
  Permission.initModel(sequelize);
  Group.initModel(sequelize);

  // Junction tables
  RolePermission.initModel(sequelize);
  UserCompanyRole.initModel(sequelize);
  UserGroup.initModel(sequelize);
  GroupPermission.initModel(sequelize);

  // RBAC
  ContentType.initModel(sequelize);
  MenuItem.initModel(sequelize);
  AccessRule.initModel(sequelize);
  UserMenuPermission.initModel(sequelize);
  RoleMenuPermission.initModel(sequelize);
  GroupMenuPermission.initModel(sequelize);

  // Security
  DeviceRegistry.initModel(sequelize);
  SecuritySession.initModel(sequelize);
  TrustEvent.initModel(sequelize);
  UserSecuritySettings.initModel(sequelize);
  SecuritySetting.initModel(sequelize);
  SecurityPolicyTemplate.initModel(sequelize);

  // Access control
  RLSPolicy.initModel(sequelize);
  FieldPermission.initModel(sequelize);
  ModelAccess.initModel(sequelize);

  // Logging
  ActivityLog.initModel(sequelize);
  AuditLog.initModel(sequelize);

  // Misc
  Attachment.initModel(sequelize);
  Message.initModel(sequelize);
  Invitation.initModel(sequelize);
  PasswordHistory.initModel(sequelize);
  SocialAccount.initModel(sequelize);

  // Set up associations
  setupAssociations();

  modelsInitialized = true;
}

// ============================================================================
// Associations
// ============================================================================

function setupAssociations(): void {
  // ── User ↔ Company ──────────────────────────────────────────────────
  User.belongsTo(Company, { foreignKey: 'current_company_id', as: 'currentCompany' });
  Company.hasMany(User, { foreignKey: 'current_company_id', as: 'users' });

  // ── Company self-reference (parent/child) ──────────────────────────
  Company.belongsTo(Company, { foreignKey: 'parent_company_id', as: 'parentCompany' });
  Company.hasMany(Company, { foreignKey: 'parent_company_id', as: 'subsidiaries' });

  // ── Role hierarchy ─────────────────────────────────────────────────
  Role.belongsTo(Role, { foreignKey: 'parent_id', as: 'parentRole' });
  Role.hasMany(Role, { foreignKey: 'parent_id', as: 'childRoles' });
  Role.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

  // ── Group hierarchy ────────────────────────────────────────────────
  Group.belongsTo(Group, { foreignKey: 'parent_id', as: 'parentGroup' });
  Group.hasMany(Group, { foreignKey: 'parent_id', as: 'childGroups' });
  Group.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

  // ── Role ↔ Permission (M:M through role_permissions) ───────────────
  Role.belongsToMany(Permission, {
    through: RolePermission,
    foreignKey: 'role_id',
    otherKey: 'permission_id',
    as: 'permissions',
  });
  Permission.belongsToMany(Role, {
    through: RolePermission,
    foreignKey: 'permission_id',
    otherKey: 'role_id',
    as: 'roles',
  });

  // ── Group ↔ Permission (M:M through group_permissions) ─────────────
  Group.belongsToMany(Permission, {
    through: GroupPermission,
    foreignKey: 'group_id',
    otherKey: 'permission_id',
    as: 'permissions',
  });
  Permission.belongsToMany(Group, {
    through: GroupPermission,
    foreignKey: 'permission_id',
    otherKey: 'group_id',
    as: 'groups',
  });

  // ── User ↔ Group (M:M through user_groups) ────────────────────────
  User.belongsToMany(Group, {
    through: UserGroup,
    foreignKey: 'user_id',
    otherKey: 'group_id',
    as: 'groups',
  });
  Group.belongsToMany(User, {
    through: UserGroup,
    foreignKey: 'group_id',
    otherKey: 'user_id',
    as: 'members',
  });

  // ── User ↔ Company ↔ Role (ternary through user_company_roles) ────
  UserCompanyRole.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  UserCompanyRole.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
  UserCompanyRole.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
  User.hasMany(UserCompanyRole, { foreignKey: 'user_id', as: 'companyRoles' });
  Company.hasMany(UserCompanyRole, { foreignKey: 'company_id', as: 'userRoles' });
  Role.hasMany(UserCompanyRole, { foreignKey: 'role_id', as: 'userCompanyRoles' });

  // ── MenuItem hierarchy ─────────────────────────────────────────────
  MenuItem.belongsTo(MenuItem, { foreignKey: 'parent_id', as: 'parent' });
  MenuItem.hasMany(MenuItem, { foreignKey: 'parent_id', as: 'children' });

  // ── Menu Permissions ───────────────────────────────────────────────
  UserMenuPermission.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  UserMenuPermission.belongsTo(MenuItem, { foreignKey: 'menu_item_id', as: 'menuItem' });
  RoleMenuPermission.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
  RoleMenuPermission.belongsTo(MenuItem, { foreignKey: 'menu_item_id', as: 'menuItem' });
  GroupMenuPermission.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });
  GroupMenuPermission.belongsTo(MenuItem, { foreignKey: 'menu_item_id', as: 'menuItem' });

  MenuItem.hasMany(UserMenuPermission, { foreignKey: 'menu_item_id', as: 'userPermissions' });
  MenuItem.hasMany(RoleMenuPermission, { foreignKey: 'menu_item_id', as: 'rolePermissions' });
  MenuItem.hasMany(GroupMenuPermission, { foreignKey: 'menu_item_id', as: 'groupPermissions' });

  // ── AccessRule ─────────────────────────────────────────────────────
  AccessRule.belongsTo(ContentType, { foreignKey: 'content_type_id', as: 'contentType' });
  AccessRule.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  AccessRule.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });
  AccessRule.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
  ContentType.hasMany(AccessRule, { foreignKey: 'content_type_id', as: 'accessRules' });

  // ── Zero Trust: Device ↔ User ─────────────────────────────────────
  DeviceRegistry.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  User.hasMany(DeviceRegistry, { foreignKey: 'user_id', as: 'devices' });

  // ── Security Session ↔ User/Device ─────────────────────────────────
  SecuritySession.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  SecuritySession.belongsTo(DeviceRegistry, { foreignKey: 'device_id', as: 'device' });
  User.hasMany(SecuritySession, { foreignKey: 'user_id', as: 'securitySessions' });

  // ── Trust Events ───────────────────────────────────────────────────
  TrustEvent.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  User.hasMany(TrustEvent, { foreignKey: 'user_id', as: 'trustEvents' });

  // ── User Security Settings ─────────────────────────────────────────
  UserSecuritySettings.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  User.hasOne(UserSecuritySettings, { foreignKey: 'user_id', as: 'securitySettings' });

  // ── Security Setting (simplified) ──────────────────────────────────
  SecuritySetting.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  // ── Security Policy Template ───────────────────────────────────────
  SecurityPolicyTemplate.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

  // ── RLS Policy ─────────────────────────────────────────────────────
  RLSPolicy.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
  RLSPolicy.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

  // ── Field Permission ───────────────────────────────────────────────
  FieldPermission.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
  FieldPermission.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

  // ── Model Access ───────────────────────────────────────────────────
  ModelAccess.belongsTo(ContentType, { foreignKey: 'content_type_id', as: 'contentType' });
  ModelAccess.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });
  ModelAccess.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

  // ── Activity & Audit Logs ──────────────────────────────────────────
  ActivityLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  ActivityLog.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
  AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  AuditLog.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

  // ── Attachments (polymorphic) ──────────────────────────────────────
  Attachment.belongsTo(User, { foreignKey: 'user_id', as: 'uploader' });
  Attachment.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

  // ── Messages (threaded) ────────────────────────────────────────────
  Message.belongsTo(User, { foreignKey: 'user_id', as: 'author' });
  Message.belongsTo(Message, { foreignKey: 'parent_id', as: 'parent' });
  Message.hasMany(Message, { foreignKey: 'parent_id', as: 'replies' });

  // ── Invitations ────────────────────────────────────────────────────
  Invitation.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
  Invitation.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
  Invitation.belongsTo(User, { foreignKey: 'invited_by_id', as: 'invitedBy' });

  // ── Password History ───────────────────────────────────────────────
  PasswordHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  User.hasMany(PasswordHistory, { foreignKey: 'user_id', as: 'passwordHistory' });

  // ── Social Accounts ────────────────────────────────────────────────
  SocialAccount.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  User.hasMany(SocialAccount, { foreignKey: 'user_id', as: 'socialAccounts' });
}

// ============================================================================
// Re-exports
// ============================================================================

export {
  // Core
  User,
  Company,
  Role,
  Permission,
  Group,
  // Junctions
  RolePermission,
  UserCompanyRole,
  UserGroup,
  GroupPermission,
  // RBAC
  ContentType,
  MenuItem,
  AccessRule,
  UserMenuPermission,
  RoleMenuPermission,
  GroupMenuPermission,
  // Security
  DeviceRegistry,
  SecuritySession,
  TrustEvent,
  UserSecuritySettings,
  SecuritySetting,
  SecurityPolicyTemplate,
  // Access control
  RLSPolicy,
  FieldPermission,
  ModelAccess,
  // Logging
  ActivityLog,
  AuditLog,
  // Misc
  Attachment,
  Message,
  Invitation,
  PasswordHistory,
  SocialAccount,
};
