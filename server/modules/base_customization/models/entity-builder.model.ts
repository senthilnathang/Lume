import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * Entity Builder Entity — dynamically created model definitions.
 */
export class EBEntity extends Model {
  declare id: number;
  declare name: string;
  declare code: string;
  declare table_name: string;
  declare display_name: string;
  declare description: string | null;
  declare icon: string | null;
  declare is_company_scoped: boolean;
  declare has_soft_delete: boolean;
  declare has_audit: boolean;
  declare is_active: boolean;
  declare company_id: number | null;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    EBEntity.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        table_name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        display_name: { type: DataTypes.STRING(255), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        icon: { type: DataTypes.STRING(50), allowNull: true },
        is_company_scoped: { type: DataTypes.BOOLEAN, defaultValue: true },
        has_soft_delete: { type: DataTypes.BOOLEAN, defaultValue: true },
        has_audit: { type: DataTypes.BOOLEAN, defaultValue: true },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
      },
      {
        sequelize,
        tableName: 'eb_entities',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    );
  }
}

/**
 * Entity Builder Field — field definitions for dynamic entities.
 */
export class EBField extends Model {
  declare id: number;
  declare entity_id: number;
  declare name: string;
  declare label: string;
  declare field_type: string;
  declare column_name: string;
  declare is_required: boolean;
  declare is_unique: boolean;
  declare is_indexed: boolean;
  declare default_value: string | null;
  declare options: object | null;
  declare validation_rules: object;
  declare reference_entity_id: number | null;
  declare sort_order: number;
  declare is_system: boolean;
  declare is_active: boolean;

  static initModel(sequelize: Sequelize) {
    EBField.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        entity_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'eb_entities', key: 'id' },
        },
        name: { type: DataTypes.STRING(100), allowNull: false },
        label: { type: DataTypes.STRING(255), allowNull: false },
        field_type: {
          type: DataTypes.ENUM(
            'string', 'text', 'integer', 'decimal', 'boolean', 'date', 'datetime',
            'select', 'multi_select', 'lookup', 'file', 'image', 'json', 'email', 'url', 'phone',
          ),
          allowNull: false,
        },
        column_name: { type: DataTypes.STRING(100), allowNull: false },
        is_required: { type: DataTypes.BOOLEAN, defaultValue: false },
        is_unique: { type: DataTypes.BOOLEAN, defaultValue: false },
        is_indexed: { type: DataTypes.BOOLEAN, defaultValue: false },
        default_value: { type: DataTypes.TEXT, allowNull: true },
        options: { type: DataTypes.JSON, allowNull: true },
        validation_rules: { type: DataTypes.JSON, defaultValue: {} },
        reference_entity_id: { type: DataTypes.INTEGER, allowNull: true },
        sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
        is_system: { type: DataTypes.BOOLEAN, defaultValue: false },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      },
      {
        sequelize,
        tableName: 'eb_fields',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { unique: true, fields: ['entity_id', 'name'] },
          { unique: true, fields: ['entity_id', 'column_name'] },
        ],
      },
    );
  }
}

/**
 * Entity Builder View — list/form/kanban views for dynamic entities.
 */
export class EBView extends Model {
  declare id: number;
  declare entity_id: number;
  declare name: string;
  declare view_type: string;
  declare config: object;
  declare is_default: boolean;
  declare is_active: boolean;

  static initModel(sequelize: Sequelize) {
    EBView.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        entity_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'eb_entities', key: 'id' },
        },
        name: { type: DataTypes.STRING(255), allowNull: false },
        view_type: {
          type: DataTypes.ENUM('list', 'form', 'kanban', 'calendar', 'chart', 'detail'),
          allowNull: false,
          defaultValue: 'list',
        },
        config: { type: DataTypes.JSON, defaultValue: {} },
        is_default: { type: DataTypes.BOOLEAN, defaultValue: false },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      },
      {
        sequelize,
        tableName: 'eb_views',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [{ fields: ['entity_id', 'view_type'] }],
      },
    );
  }
}

/**
 * Entity Builder Menu — menu entries for dynamic entities.
 */
export class EBMenu extends Model {
  declare id: number;
  declare entity_id: number;
  declare name: string;
  declare icon: string | null;
  declare parent_menu_id: number | null;
  declare sort_order: number;
  declare target_type: string;
  declare target_view_id: number | null;
  declare is_active: boolean;

  static initModel(sequelize: Sequelize) {
    EBMenu.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        entity_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'eb_entities', key: 'id' },
        },
        name: { type: DataTypes.STRING(255), allowNull: false },
        icon: { type: DataTypes.STRING(50), allowNull: true },
        parent_menu_id: { type: DataTypes.INTEGER, allowNull: true },
        sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
        target_type: {
          type: DataTypes.ENUM('view', 'url', 'action'),
          defaultValue: 'view',
        },
        target_view_id: { type: DataTypes.INTEGER, allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      },
      {
        sequelize,
        tableName: 'eb_menus',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    );
  }
}

/**
 * Entity Builder Action — server actions for dynamic entities.
 */
export class EBAction extends Model {
  declare id: number;
  declare entity_id: number;
  declare name: string;
  declare code: string;
  declare action_type: string;
  declare trigger_event: string;
  declare operation: string | null;
  declare config: object;
  declare is_active: boolean;

  static initModel(sequelize: Sequelize) {
    EBAction.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        entity_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'eb_entities', key: 'id' },
        },
        name: { type: DataTypes.STRING(255), allowNull: false },
        code: { type: DataTypes.STRING(100), allowNull: false },
        action_type: {
          type: DataTypes.ENUM('server', 'client', 'api', 'workflow'),
          defaultValue: 'server',
        },
        trigger_event: {
          type: DataTypes.ENUM('before_create', 'after_create', 'before_update', 'after_update', 'before_delete', 'manual'),
          defaultValue: 'manual',
        },
        operation: {
          type: DataTypes.ENUM('create', 'update', 'delete', 'email', 'webhook', 'custom'),
          allowNull: true,
        },
        config: { type: DataTypes.JSON, defaultValue: {} },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      },
      {
        sequelize,
        tableName: 'eb_actions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { unique: true, fields: ['entity_id', 'code'] },
        ],
      },
    );
  }
}
