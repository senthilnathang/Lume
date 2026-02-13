import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * Global Picklist — centralized enum/picklist management.
 */
export class GlobalPicklist extends Model {
  declare id: number;
  declare name: string;
  declare code: string;
  declare description: string | null;
  declare is_system: boolean;
  declare is_active: boolean;
  declare company_id: number | null;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    GlobalPicklist.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        description: { type: DataTypes.TEXT, allowNull: true },
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
        tableName: 'base_global_picklists',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    );
  }
}

/**
 * Picklist Value — individual values within a picklist.
 */
export class PicklistValue extends Model {
  declare id: number;
  declare picklist_id: number;
  declare label: string;
  declare value: string;
  declare color: string | null;
  declare icon: string | null;
  declare sort_order: number;
  declare is_default: boolean;
  declare is_active: boolean;

  static initModel(sequelize: Sequelize) {
    PicklistValue.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        picklist_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'base_global_picklists', key: 'id' },
        },
        label: { type: DataTypes.STRING(255), allowNull: false },
        value: { type: DataTypes.STRING(100), allowNull: false },
        color: { type: DataTypes.STRING(20), allowNull: true },
        icon: { type: DataTypes.STRING(50), allowNull: true },
        sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
        is_default: { type: DataTypes.BOOLEAN, defaultValue: false },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      },
      {
        sequelize,
        tableName: 'base_picklist_values',
        timestamps: false,
        indexes: [
          { unique: true, fields: ['picklist_id', 'value'] },
          { fields: ['picklist_id', 'sort_order'] },
        ],
      },
    );
  }
}

/**
 * Picklist Field Mapping — maps picklists to model fields.
 */
export class PicklistFieldMapping extends Model {
  declare id: number;
  declare picklist_id: number;
  declare model_name: string;
  declare field_name: string;

  static initModel(sequelize: Sequelize) {
    PicklistFieldMapping.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        picklist_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'base_global_picklists', key: 'id' },
        },
        model_name: { type: DataTypes.STRING(255), allowNull: false },
        field_name: { type: DataTypes.STRING(255), allowNull: false },
      },
      {
        sequelize,
        tableName: 'base_picklist_field_mappings',
        timestamps: false,
        indexes: [
          { unique: true, name: 'pfm_picklist_model_field_uniq', fields: ['picklist_id', 'model_name', 'field_name'] },
        ],
      },
    );
  }
}
