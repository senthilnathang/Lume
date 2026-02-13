import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * Field Security Profile — groups field-level access rules.
 */
export class FieldSecurityProfile extends Model {
  declare id: number;
  declare name: string;
  declare description: string | null;
  declare is_active: boolean;
  declare company_id: number | null;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    FieldSecurityProfile.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
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
        tableName: 'security_field_security_profiles',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    );
  }
}

/**
 * Field Security Rule — per-field access level.
 *
 * Access levels: hidden, read, write, masked
 * Mask types: full, partial_start, partial_end, email, phone, credit_card, custom
 */
export class FieldSecurityRule extends Model {
  declare id: number;
  declare profile_id: number;
  declare model_name: string;
  declare field_name: string;
  declare access_level: string;
  declare mask_type: string | null;
  declare mask_pattern: string | null;
  declare is_active: boolean;

  static initModel(sequelize: Sequelize) {
    FieldSecurityRule.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        profile_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'security_field_security_profiles', key: 'id' },
        },
        model_name: { type: DataTypes.STRING(255), allowNull: false },
        field_name: { type: DataTypes.STRING(255), allowNull: false },
        access_level: {
          type: DataTypes.ENUM('hidden', 'read', 'write', 'masked'),
          allowNull: false,
          defaultValue: 'read',
        },
        mask_type: {
          type: DataTypes.ENUM('full', 'partial_start', 'partial_end', 'email', 'phone', 'credit_card', 'custom'),
          allowNull: true,
        },
        mask_pattern: { type: DataTypes.STRING(100), allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      },
      {
        sequelize,
        tableName: 'security_field_security_rules',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { unique: true, name: 'fsr_profile_model_field_uniq', fields: ['profile_id', 'model_name', 'field_name'] },
        ],
      },
    );
  }
}

/**
 * Field Security Role Assignment — links field security profiles to roles.
 */
export class FieldSecurityRoleAssignment extends Model {
  declare id: number;
  declare field_security_profile_id: number;
  declare role_id: number;
  declare company_id: number | null;

  static initModel(sequelize: Sequelize) {
    FieldSecurityRoleAssignment.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        field_security_profile_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'security_field_security_profiles', key: 'id' },
        },
        role_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'roles', key: 'id' },
        },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
      },
      {
        sequelize,
        tableName: 'security_field_security_role_assignments',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { unique: true, name: 'fsra_profile_role_uniq', fields: ['field_security_profile_id', 'role_id'] },
        ],
      },
    );
  }
}
