import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * Record Type — different layouts/picklist values per record type.
 */
export class RecordType extends Model {
  declare id: number;
  declare name: string;
  declare code: string;
  declare model_name: string;
  declare description: string | null;
  declare is_default: boolean;
  declare is_active: boolean;
  declare company_id: number | null;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    RecordType.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        code: { type: DataTypes.STRING(100), allowNull: false },
        model_name: { type: DataTypes.STRING(255), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        is_default: { type: DataTypes.BOOLEAN, defaultValue: false },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
      },
      {
        sequelize,
        tableName: 'base_record_types',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { unique: true, fields: ['model_name', 'code', 'company_id'] },
        ],
      },
    );
  }
}

/**
 * Record Type Field Config — per-record-type field configuration.
 */
export class RecordTypeFieldConfig extends Model {
  declare id: number;
  declare record_type_id: number;
  declare field_name: string;
  declare is_visible: boolean;
  declare is_required: boolean;
  declare is_readonly: boolean;
  declare default_value: string | null;
  declare allowed_picklist_values: object | null;

  static initModel(sequelize: Sequelize) {
    RecordTypeFieldConfig.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        record_type_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'base_record_types', key: 'id' },
        },
        field_name: { type: DataTypes.STRING(255), allowNull: false },
        is_visible: { type: DataTypes.BOOLEAN, defaultValue: true },
        is_required: { type: DataTypes.BOOLEAN, defaultValue: false },
        is_readonly: { type: DataTypes.BOOLEAN, defaultValue: false },
        default_value: { type: DataTypes.TEXT, allowNull: true },
        allowed_picklist_values: { type: DataTypes.JSON, allowNull: true },
      },
      {
        sequelize,
        tableName: 'base_record_type_field_configs',
        timestamps: false,
        indexes: [
          { unique: true, fields: ['record_type_id', 'field_name'] },
        ],
      },
    );
  }
}
