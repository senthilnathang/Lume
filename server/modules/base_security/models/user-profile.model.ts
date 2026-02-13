import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * User Profile Assignment — links user to profile per company (one-to-one).
 */
export class UserProfile extends Model {
  declare id: number;
  declare user_id: number;
  declare company_id: number;
  declare profile_id: number;
  declare assigned_by: number | null;
  declare assigned_at: Date;
  declare note: string | null;
  declare is_active: boolean;

  static initModel(sequelize: Sequelize) {
    UserProfile.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
        },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'companies', key: 'id' },
        },
        profile_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'security_profiles', key: 'id' },
        },
        assigned_by: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
        },
        assigned_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        note: { type: DataTypes.TEXT, allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      },
      {
        sequelize,
        tableName: 'security_user_profiles',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { unique: true, fields: ['user_id', 'company_id'] },
          { fields: ['profile_id'] },
        ],
      },
    );
  }
}

/**
 * User Permission Set Assignment — links user to permission set (many-to-many with validity).
 */
export class UserPermissionSetAssignment extends Model {
  declare id: number;
  declare user_id: number;
  declare company_id: number;
  declare permission_set_id: number;
  declare valid_from: Date | null;
  declare valid_until: Date | null;
  declare requires_activation: boolean;
  declare last_activated_at: Date | null;
  declare activation_expires_at: Date | null;
  declare assigned_by: number | null;
  declare assigned_at: Date;
  declare note: string | null;
  declare is_active: boolean;

  static initModel(sequelize: Sequelize) {
    UserPermissionSetAssignment.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
        },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'companies', key: 'id' },
        },
        permission_set_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'security_permission_sets', key: 'id' },
        },
        valid_from: { type: DataTypes.DATE, allowNull: true },
        valid_until: { type: DataTypes.DATE, allowNull: true },
        requires_activation: { type: DataTypes.BOOLEAN, defaultValue: false },
        last_activated_at: { type: DataTypes.DATE, allowNull: true },
        activation_expires_at: { type: DataTypes.DATE, allowNull: true },
        assigned_by: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
        },
        assigned_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        note: { type: DataTypes.TEXT, allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      },
      {
        sequelize,
        tableName: 'security_user_permission_set_assignments',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { unique: true, name: 'upsa_user_company_pset_uniq', fields: ['user_id', 'company_id', 'permission_set_id'] },
        ],
      },
    );
  }
}
