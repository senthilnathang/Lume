import { Model, DataTypes, Sequelize } from 'sequelize';
import { timestampFields, baseModelOptions } from './base.model';

export interface RoleMenuPermissionAttributes {
  id: number;
  role_id: number;
  menu_item_id: number;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_create: boolean;
  created_at: Date;
  updated_at: Date;
}

export class RoleMenuPermission extends Model<RoleMenuPermissionAttributes> {
  declare id: number;
  declare role_id: number;
  declare menu_item_id: number;
  declare can_view: boolean;
  declare can_edit: boolean;
  declare can_delete: boolean;
  declare can_create: boolean;

  static initModel(sequelize: Sequelize): typeof RoleMenuPermission {
    RoleMenuPermission.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        role_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'roles', key: 'id' },
          onDelete: 'CASCADE',
        },
        menu_item_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'menu_items', key: 'id' },
          onDelete: 'CASCADE',
        },
        can_view: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        can_edit: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        can_delete: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        can_create: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        ...timestampFields,
      },
      {
        sequelize,
        tableName: 'role_menu_permissions',
        ...baseModelOptions,
        indexes: [
          { unique: true, fields: ['role_id', 'menu_item_id'] },
          { fields: ['role_id'] },
          { fields: ['menu_item_id'] },
        ],
      },
    );

    return RoleMenuPermission;
  }
}
