import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * Print Format — document template designer.
 */
export class PrintFormat extends Model {
  declare id: number;
  declare name: string;
  declare code: string;
  declare model_name: string;
  declare format_type: string;
  declare paper_size: string;
  declare orientation: string;
  declare header_html: string | null;
  declare body_html: string;
  declare footer_html: string | null;
  declare css: string | null;
  declare margin_top: number;
  declare margin_bottom: number;
  declare margin_left: number;
  declare margin_right: number;
  declare is_default: boolean;
  declare is_active: boolean;
  declare company_id: number | null;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    PrintFormat.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        model_name: { type: DataTypes.STRING(255), allowNull: false },
        format_type: {
          type: DataTypes.ENUM('standard', 'custom_html', 'jinja2'),
          defaultValue: 'standard',
        },
        paper_size: {
          type: DataTypes.ENUM('A4', 'A3', 'A5', 'letter', 'legal'),
          defaultValue: 'A4',
        },
        orientation: {
          type: DataTypes.ENUM('portrait', 'landscape'),
          defaultValue: 'portrait',
        },
        header_html: { type: DataTypes.TEXT, allowNull: true },
        body_html: { type: DataTypes.TEXT, allowNull: false },
        footer_html: { type: DataTypes.TEXT, allowNull: true },
        css: { type: DataTypes.TEXT, allowNull: true },
        margin_top: { type: DataTypes.FLOAT, defaultValue: 20 },
        margin_bottom: { type: DataTypes.FLOAT, defaultValue: 20 },
        margin_left: { type: DataTypes.FLOAT, defaultValue: 15 },
        margin_right: { type: DataTypes.FLOAT, defaultValue: 15 },
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
        tableName: 'base_print_formats',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [{ fields: ['model_name'] }],
      },
    );
  }
}

/**
 * Print Format Field — field inclusion and formatting for a print format.
 */
export class PrintFormatField extends Model {
  declare id: number;
  declare print_format_id: number;
  declare field_name: string;
  declare label: string | null;
  declare format_string: string | null;
  declare width: string | null;
  declare alignment: string;
  declare sort_order: number;
  declare is_visible: boolean;

  static initModel(sequelize: Sequelize) {
    PrintFormatField.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        print_format_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'base_print_formats', key: 'id' },
        },
        field_name: { type: DataTypes.STRING(255), allowNull: false },
        label: { type: DataTypes.STRING(255), allowNull: true },
        format_string: { type: DataTypes.STRING(100), allowNull: true },
        width: { type: DataTypes.STRING(20), allowNull: true },
        alignment: {
          type: DataTypes.ENUM('left', 'center', 'right'),
          defaultValue: 'left',
        },
        sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
        is_visible: { type: DataTypes.BOOLEAN, defaultValue: true },
      },
      {
        sequelize,
        tableName: 'base_print_format_fields',
        timestamps: false,
        indexes: [{ fields: ['print_format_id', 'sort_order'] }],
      },
    );
  }
}
