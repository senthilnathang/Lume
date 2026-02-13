import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * Form Layout — drag-and-drop form layout designer.
 */
export class FormLayout extends Model {
  declare id: number;
  declare name: string;
  declare model_name: string;
  declare layout_type: string;
  declare is_default: boolean;
  declare is_active: boolean;
  declare company_id: number | null;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    FormLayout.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        model_name: { type: DataTypes.STRING(255), allowNull: false },
        layout_type: {
          type: DataTypes.ENUM('create', 'edit', 'detail', 'compact', 'kanban'),
          defaultValue: 'edit',
        },
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
        tableName: 'base_form_layouts',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [{ fields: ['model_name', 'layout_type'] }],
      },
    );
  }
}

/**
 * Form Section — groups fields within a form layout.
 */
export class FormSection extends Model {
  declare id: number;
  declare layout_id: number;
  declare name: string;
  declare label: string;
  declare columns: number;
  declare sort_order: number;
  declare is_collapsible: boolean;
  declare is_collapsed_default: boolean;
  declare is_visible: boolean;
  declare visibility_conditions: object;

  static initModel(sequelize: Sequelize) {
    FormSection.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        layout_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'base_form_layouts', key: 'id' },
        },
        name: { type: DataTypes.STRING(100), allowNull: false },
        label: { type: DataTypes.STRING(255), allowNull: false },
        columns: { type: DataTypes.INTEGER, defaultValue: 2 },
        sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
        is_collapsible: { type: DataTypes.BOOLEAN, defaultValue: false },
        is_collapsed_default: { type: DataTypes.BOOLEAN, defaultValue: false },
        is_visible: { type: DataTypes.BOOLEAN, defaultValue: true },
        visibility_conditions: { type: DataTypes.JSON, defaultValue: [] },
      },
      {
        sequelize,
        tableName: 'base_form_sections',
        timestamps: false,
        indexes: [{ fields: ['layout_id', 'sort_order'] }],
      },
    );
  }
}

/**
 * Form Field Config — field placement within a section.
 */
export class FormFieldConfig extends Model {
  declare id: number;
  declare section_id: number;
  declare field_name: string;
  declare label_override: string | null;
  declare column: number;
  declare row: number;
  declare colspan: number;
  declare is_required_override: boolean | null;
  declare is_readonly: boolean;
  declare is_visible: boolean;
  declare visibility_conditions: object;
  declare widget_type: string | null;
  declare widget_config: object;
  declare sort_order: number;

  static initModel(sequelize: Sequelize) {
    FormFieldConfig.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        section_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'base_form_sections', key: 'id' },
        },
        field_name: { type: DataTypes.STRING(255), allowNull: false },
        label_override: { type: DataTypes.STRING(255), allowNull: true },
        column: { type: DataTypes.INTEGER, defaultValue: 0 },
        row: { type: DataTypes.INTEGER, defaultValue: 0 },
        colspan: { type: DataTypes.INTEGER, defaultValue: 1 },
        is_required_override: { type: DataTypes.BOOLEAN, allowNull: true },
        is_readonly: { type: DataTypes.BOOLEAN, defaultValue: false },
        is_visible: { type: DataTypes.BOOLEAN, defaultValue: true },
        visibility_conditions: { type: DataTypes.JSON, defaultValue: [] },
        widget_type: { type: DataTypes.STRING(50), allowNull: true },
        widget_config: { type: DataTypes.JSON, defaultValue: {} },
        sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
      },
      {
        sequelize,
        tableName: 'base_form_field_configs',
        timestamps: false,
        indexes: [{ fields: ['section_id', 'sort_order'] }],
      },
    );
  }
}
