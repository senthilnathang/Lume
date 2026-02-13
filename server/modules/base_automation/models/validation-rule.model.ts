import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * Validation Rule — domain-based validation (condition = violation when TRUE).
 */
export class ValidationRule extends Model {
  declare id: number;
  declare name: string;
  declare code: string;
  declare description: string | null;
  declare model_name: string;
  declare error_message: string;
  declare conditions: object;
  declare severity: string;
  declare trigger: string;
  declare is_active: boolean;
  declare company_id: number | null;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    ValidationRule.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        description: { type: DataTypes.TEXT, allowNull: true },
        model_name: { type: DataTypes.STRING(255), allowNull: false },
        error_message: { type: DataTypes.TEXT, allowNull: false },
        conditions: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
        severity: {
          type: DataTypes.ENUM('error', 'warning'),
          defaultValue: 'error',
        },
        trigger: {
          type: DataTypes.ENUM('create', 'update', 'create_update', 'delete'),
          defaultValue: 'create_update',
        },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
      },
      {
        sequelize,
        tableName: 'base_validation_rules',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { fields: ['model_name', 'trigger'] },
          { fields: ['is_active'] },
        ],
      },
    );
  }
}

/**
 * Field Validation — per-field validation constraints.
 */
export class FieldValidation extends Model {
  declare id: number;
  declare model_name: string;
  declare field_name: string;
  declare validation_type: string;
  declare parameters: object;
  declare error_message: string;
  declare is_active: boolean;

  static initModel(sequelize: Sequelize) {
    FieldValidation.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        model_name: { type: DataTypes.STRING(255), allowNull: false },
        field_name: { type: DataTypes.STRING(255), allowNull: false },
        validation_type: {
          type: DataTypes.ENUM(
            'required', 'min_length', 'max_length', 'pattern', 'range',
            'email', 'url', 'unique', 'custom',
          ),
          allowNull: false,
        },
        parameters: { type: DataTypes.JSON, defaultValue: {} },
        error_message: { type: DataTypes.STRING(500), allowNull: false },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      },
      {
        sequelize,
        tableName: 'base_field_validations',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { fields: ['model_name', 'field_name'] },
        ],
      },
    );
  }
}
