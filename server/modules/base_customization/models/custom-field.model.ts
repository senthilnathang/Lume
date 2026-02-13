import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * Custom Field — dynamic field management for any model.
 */
export class CustomField extends Model {
  declare id: number;
  declare name: string;
  declare label: string;
  declare model_name: string;
  declare field_type: string;
  declare default_value: string | null;
  declare placeholder: string | null;
  declare help_text: string | null;
  declare options: object | null;
  declare validation_rules: object;
  declare is_required: boolean;
  declare is_unique: boolean;
  declare is_searchable: boolean;
  declare is_filterable: boolean;
  declare is_sortable: boolean;
  declare is_visible_in_list: boolean;
  declare sort_order: number;
  declare group_name: string | null;
  declare is_active: boolean;
  declare company_id: number | null;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    CustomField.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(100), allowNull: false },
        label: { type: DataTypes.STRING(255), allowNull: false },
        model_name: { type: DataTypes.STRING(255), allowNull: false },
        field_type: {
          type: DataTypes.ENUM(
            'text', 'textarea', 'number', 'decimal', 'boolean', 'date', 'datetime',
            'select', 'multi_select', 'radio', 'checkbox', 'email', 'url', 'phone',
            'currency', 'percent', 'formula', 'lookup', 'file', 'image', 'json',
          ),
          allowNull: false,
        },
        default_value: { type: DataTypes.TEXT, allowNull: true },
        placeholder: { type: DataTypes.STRING(255), allowNull: true },
        help_text: { type: DataTypes.STRING(500), allowNull: true },
        options: { type: DataTypes.JSON, allowNull: true },
        validation_rules: { type: DataTypes.JSON, defaultValue: {} },
        is_required: { type: DataTypes.BOOLEAN, defaultValue: false },
        is_unique: { type: DataTypes.BOOLEAN, defaultValue: false },
        is_searchable: { type: DataTypes.BOOLEAN, defaultValue: false },
        is_filterable: { type: DataTypes.BOOLEAN, defaultValue: true },
        is_sortable: { type: DataTypes.BOOLEAN, defaultValue: true },
        is_visible_in_list: { type: DataTypes.BOOLEAN, defaultValue: true },
        sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
        group_name: { type: DataTypes.STRING(100), allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
      },
      {
        sequelize,
        tableName: 'base_custom_fields',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { unique: true, fields: ['model_name', 'name', 'company_id'] },
          { fields: ['model_name'] },
        ],
      },
    );
  }
}

/**
 * Custom Field Value — stores values for custom fields on records.
 */
export class CustomFieldValue extends Model {
  declare id: number;
  declare custom_field_id: number;
  declare record_id: number;
  declare model_name: string;
  declare value_text: string | null;
  declare value_number: number | null;
  declare value_boolean: boolean | null;
  declare value_date: Date | null;
  declare value_json: object | null;

  static initModel(sequelize: Sequelize) {
    CustomFieldValue.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        custom_field_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'base_custom_fields', key: 'id' },
        },
        record_id: { type: DataTypes.INTEGER, allowNull: false },
        model_name: { type: DataTypes.STRING(255), allowNull: false },
        value_text: { type: DataTypes.TEXT, allowNull: true },
        value_number: { type: DataTypes.DOUBLE, allowNull: true },
        value_boolean: { type: DataTypes.BOOLEAN, allowNull: true },
        value_date: { type: DataTypes.DATE, allowNull: true },
        value_json: { type: DataTypes.JSON, allowNull: true },
      },
      {
        sequelize,
        tableName: 'base_custom_field_values',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { unique: true, fields: ['custom_field_id', 'record_id'] },
          { fields: ['model_name', 'record_id'] },
        ],
      },
    );
  }
}
