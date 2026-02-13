import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * Security Profile — Salesforce-inspired object-level CRUD permissions.
 * Each user has exactly ONE profile per company.
 */
export class Profile extends Model {
  declare id: number;
  declare name: string;
  declare codename: string;
  declare description: string | null;
  declare profile_type: string;
  declare is_system: boolean;
  declare is_active: boolean;
  declare login_hours: object | null;
  declare login_ip_ranges: object | null;
  declare session_timeout_minutes: number;
  declare company_id: number | null;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    Profile.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        codename: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        description: { type: DataTypes.TEXT, allowNull: true },
        profile_type: {
          type: DataTypes.ENUM('standard', 'system_admin', 'custom', 'guest', 'portal'),
          defaultValue: 'custom',
        },
        is_system: { type: DataTypes.BOOLEAN, defaultValue: false },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        login_hours: { type: DataTypes.JSON, allowNull: true },
        login_ip_ranges: { type: DataTypes.JSON, allowNull: true },
        session_timeout_minutes: { type: DataTypes.INTEGER, defaultValue: 480 },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
      },
      {
        sequelize,
        tableName: 'security_profiles',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { fields: ['company_id'] },
          { fields: ['profile_type'] },
        ],
      },
    );
  }
}

/**
 * Object Permission — CRUD permissions per model, attached to a Profile.
 */
export class ObjectPermission extends Model {
  declare id: number;
  declare profile_id: number;
  declare model_name: string;
  declare can_create: boolean;
  declare can_read: boolean;
  declare can_edit: boolean;
  declare can_delete: boolean;
  declare view_all: boolean;
  declare modify_all: boolean;

  static initModel(sequelize: Sequelize) {
    ObjectPermission.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        profile_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'security_profiles', key: 'id' },
        },
        model_name: { type: DataTypes.STRING(255), allowNull: false },
        can_create: { type: DataTypes.BOOLEAN, defaultValue: false },
        can_read: { type: DataTypes.BOOLEAN, defaultValue: true },
        can_edit: { type: DataTypes.BOOLEAN, defaultValue: false },
        can_delete: { type: DataTypes.BOOLEAN, defaultValue: false },
        view_all: { type: DataTypes.BOOLEAN, defaultValue: false },
        modify_all: { type: DataTypes.BOOLEAN, defaultValue: false },
      },
      {
        sequelize,
        tableName: 'security_object_permissions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { unique: true, fields: ['profile_id', 'model_name'] },
        ],
      },
    );
  }
}
