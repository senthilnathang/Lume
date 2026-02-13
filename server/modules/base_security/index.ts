import type { ModuleDefinition } from '../_types';
import { manifest } from './__manifest__';

// Models
import { Profile, ObjectPermission } from './models/profile.model';
import {
  PermissionSet,
  PermissionSetGroup,
  PermissionSetGroupMember,
  PermissionSetObjectPermission,
  PermissionSetFieldPermission,
} from './models/permission-set.model';
import { SharingRule } from './models/sharing-rule.model';
import {
  FieldSecurityProfile,
  FieldSecurityRule,
  FieldSecurityRoleAssignment,
} from './models/field-security.model';
import {
  OPAPolicy,
  PolicySet,
  PolicySetMember,
  PolicyEvaluationLog,
} from './models/policy.model';
import {
  AttributeDefinition,
  AccessControlRule,
  DataClassification,
} from './models/abac.model';
import { UserProfile, UserPermissionSetAssignment } from './models/user-profile.model';

export {
  Profile,
  ObjectPermission,
  PermissionSet,
  PermissionSetGroup,
  PermissionSetGroupMember,
  PermissionSetObjectPermission,
  PermissionSetFieldPermission,
  SharingRule,
  FieldSecurityProfile,
  FieldSecurityRule,
  FieldSecurityRoleAssignment,
  OPAPolicy,
  PolicySet,
  PolicySetMember,
  PolicyEvaluationLog,
  AttributeDefinition,
  AccessControlRule,
  DataClassification,
  UserProfile,
  UserPermissionSetAssignment,
};

const baseSecurityModule: ModuleDefinition = {
  manifest,
  initModels(sequelize) {
    Profile.initModel(sequelize);
    ObjectPermission.initModel(sequelize);
    PermissionSet.initModel(sequelize);
    PermissionSetGroup.initModel(sequelize);
    PermissionSetGroupMember.initModel(sequelize);
    PermissionSetObjectPermission.initModel(sequelize);
    PermissionSetFieldPermission.initModel(sequelize);
    SharingRule.initModel(sequelize);
    FieldSecurityProfile.initModel(sequelize);
    FieldSecurityRule.initModel(sequelize);
    FieldSecurityRoleAssignment.initModel(sequelize);
    OPAPolicy.initModel(sequelize);
    PolicySet.initModel(sequelize);
    PolicySetMember.initModel(sequelize);
    PolicyEvaluationLog.initModel(sequelize);
    AttributeDefinition.initModel(sequelize);
    AccessControlRule.initModel(sequelize);
    DataClassification.initModel(sequelize);
    UserProfile.initModel(sequelize);
    UserPermissionSetAssignment.initModel(sequelize);
  },
  async seedData() {
    const existing = await Profile.count();
    if (existing > 0) return;

    await Profile.bulkCreate([
      { name: 'System Administrator', codename: 'system_admin', profile_type: 'system_admin', is_system: true },
      { name: 'Standard User', codename: 'standard_user', profile_type: 'standard', is_system: true },
      { name: 'Read Only', codename: 'read_only', profile_type: 'standard', is_system: true },
      { name: 'Guest', codename: 'guest', profile_type: 'guest', is_system: true },
    ]);
  },
};

export default baseSecurityModule;
