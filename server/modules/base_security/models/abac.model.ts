import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * Attribute Definition — defines attributes usable in ABAC rules.
 */
export class AttributeDefinition extends Model {
  declare id: number;
  declare name: string;
  declare codename: string;
  declare description: string | null;
  declare source: string;
  declare data_type: string;
  declare model_name: string | null;
  declare field_name: string | null;
  declare computation_expression: string | null;
  declare external_endpoint: string | null;
  declare cache_ttl_seconds: number;
  declare allowed_values: object | null;
  declare is_active: boolean;
  declare company_id: number | null;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    AttributeDefinition.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        codename: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        description: { type: DataTypes.TEXT, allowNull: true },
        source: {
          type: DataTypes.ENUM('user', 'record', 'environment', 'computed', 'external'),
          allowNull: false,
        },
        data_type: {
          type: DataTypes.ENUM('string', 'integer', 'float', 'boolean', 'date', 'datetime', 'list', 'object'),
          allowNull: false,
          defaultValue: 'string',
        },
        model_name: { type: DataTypes.STRING(255), allowNull: true },
        field_name: { type: DataTypes.STRING(255), allowNull: true },
        computation_expression: { type: DataTypes.TEXT, allowNull: true },
        external_endpoint: { type: DataTypes.STRING(500), allowNull: true },
        cache_ttl_seconds: { type: DataTypes.INTEGER, defaultValue: 300 },
        allowed_values: { type: DataTypes.JSON, allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
      },
      {
        sequelize,
        tableName: 'security_attribute_definitions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { fields: ['source'] },
          { fields: ['company_id'] },
        ],
      },
    );
  }
}

/**
 * Access Control Rule — ABAC-based access control with conditions.
 */
export class AccessControlRule extends Model {
  declare id: number;
  declare name: string;
  declare description: string | null;
  declare resource_model: string;
  declare action: string;
  declare effect: string;
  declare conditions: object;
  declare priority: number;
  declare is_active: boolean;
  declare company_id: number | null;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    AccessControlRule.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        resource_model: { type: DataTypes.STRING(255), allowNull: false },
        action: { type: DataTypes.STRING(100), allowNull: false },
        effect: {
          type: DataTypes.ENUM('allow', 'deny'),
          allowNull: false,
          defaultValue: 'deny',
        },
        conditions: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
        priority: { type: DataTypes.INTEGER, defaultValue: 0 },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
      },
      {
        sequelize,
        tableName: 'security_access_control_rules',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { fields: ['resource_model', 'action'] },
          { fields: ['company_id'] },
        ],
      },
    );
  }
}

/**
 * Data Classification — sensitivity levels for models/fields.
 */
export class DataClassification extends Model {
  declare id: number;
  declare model_name: string;
  declare field_name: string | null;
  declare classification_level: string;
  declare handling_instructions: string | null;
  declare retention_days: number | null;
  declare requires_encryption: boolean;
  declare requires_audit: boolean;
  declare company_id: number | null;

  static initModel(sequelize: Sequelize) {
    DataClassification.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        model_name: { type: DataTypes.STRING(255), allowNull: false },
        field_name: { type: DataTypes.STRING(255), allowNull: true },
        classification_level: {
          type: DataTypes.ENUM('public', 'internal', 'confidential', 'restricted', 'top_secret'),
          allowNull: false,
          defaultValue: 'internal',
        },
        handling_instructions: { type: DataTypes.TEXT, allowNull: true },
        retention_days: { type: DataTypes.INTEGER, allowNull: true },
        requires_encryption: { type: DataTypes.BOOLEAN, defaultValue: false },
        requires_audit: { type: DataTypes.BOOLEAN, defaultValue: false },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
      },
      {
        sequelize,
        tableName: 'security_data_classifications',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { unique: true, name: 'dc_model_field_company_uniq', fields: ['model_name', 'field_name', 'company_id'] },
        ],
      },
    );
  }
}
