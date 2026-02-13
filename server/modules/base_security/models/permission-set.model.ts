import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * Permission Set — additive permissions that stack on top of a Profile.
 */
export class PermissionSet extends Model {
  declare id: number;
  declare name: string;
  declare codename: string;
  declare description: string | null;
  declare is_session_based: boolean;
  declare session_duration_minutes: number | null;
  declare is_system: boolean;
  declare is_active: boolean;
  declare company_id: number | null;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    PermissionSet.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        codename: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        description: { type: DataTypes.TEXT, allowNull: true },
        is_session_based: { type: DataTypes.BOOLEAN, defaultValue: false },
        session_duration_minutes: { type: DataTypes.INTEGER, allowNull: true },
        is_system: { type: DataTypes.BOOLEAN, defaultValue: false },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
      },
      {
        sequelize,
        tableName: 'security_permission_sets',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [{ fields: ['company_id'] }],
      },
    );
  }
}

/**
 * Permission Set Group — bundles multiple permission sets.
 */
export class PermissionSetGroup extends Model {
  declare id: number;
  declare name: string;
  declare codename: string;
  declare description: string | null;
  declare is_active: boolean;
  declare company_id: number | null;

  static initModel(sequelize: Sequelize) {
    PermissionSetGroup.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        codename: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        description: { type: DataTypes.TEXT, allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
      },
      {
        sequelize,
        tableName: 'security_permission_set_groups',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    );
  }
}

/**
 * Permission Set Group Member — links permission sets to groups.
 */
export class PermissionSetGroupMember extends Model {
  declare id: number;
  declare group_id: number;
  declare permission_set_id: number;

  static initModel(sequelize: Sequelize) {
    PermissionSetGroupMember.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        group_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'security_permission_set_groups', key: 'id' },
        },
        permission_set_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'security_permission_sets', key: 'id' },
        },
      },
      {
        sequelize,
        tableName: 'security_permission_set_group_members',
        timestamps: false,
        indexes: [
          { unique: true, name: 'psgm_group_pset_uniq', fields: ['group_id', 'permission_set_id'] },
        ],
      },
    );
  }
}

/**
 * Permission Set Object Permission — additive object-level CRUD.
 */
export class PermissionSetObjectPermission extends Model {
  declare id: number;
  declare permission_set_id: number;
  declare model_name: string;
  declare can_create: boolean;
  declare can_read: boolean;
  declare can_edit: boolean;
  declare can_delete: boolean;
  declare view_all: boolean;
  declare modify_all: boolean;

  static initModel(sequelize: Sequelize) {
    PermissionSetObjectPermission.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        permission_set_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'security_permission_sets', key: 'id' },
        },
        model_name: { type: DataTypes.STRING(255), allowNull: false },
        can_create: { type: DataTypes.BOOLEAN, defaultValue: false },
        can_read: { type: DataTypes.BOOLEAN, defaultValue: false },
        can_edit: { type: DataTypes.BOOLEAN, defaultValue: false },
        can_delete: { type: DataTypes.BOOLEAN, defaultValue: false },
        view_all: { type: DataTypes.BOOLEAN, defaultValue: false },
        modify_all: { type: DataTypes.BOOLEAN, defaultValue: false },
      },
      {
        sequelize,
        tableName: 'security_perm_set_object_perms',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { unique: true, name: 'psop_pset_model_uniq', fields: ['permission_set_id', 'model_name'] },
        ],
      },
    );
  }
}

/**
 * Permission Set Field Permission — per-field read/edit within a perm set.
 */
export class PermissionSetFieldPermission extends Model {
  declare id: number;
  declare permission_set_id: number;
  declare model_name: string;
  declare field_name: string;
  declare can_read: boolean;
  declare can_edit: boolean;

  static initModel(sequelize: Sequelize) {
    PermissionSetFieldPermission.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        permission_set_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'security_permission_sets', key: 'id' },
        },
        model_name: { type: DataTypes.STRING(255), allowNull: false },
        field_name: { type: DataTypes.STRING(255), allowNull: false },
        can_read: { type: DataTypes.BOOLEAN, defaultValue: true },
        can_edit: { type: DataTypes.BOOLEAN, defaultValue: false },
      },
      {
        sequelize,
        tableName: 'security_perm_set_field_perms',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { unique: true, name: 'psfp_pset_model_field_uniq', fields: ['permission_set_id', 'model_name', 'field_name'] },
        ],
      },
    );
  }
}
