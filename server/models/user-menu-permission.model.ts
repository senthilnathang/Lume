import { Model, DataTypes, Sequelize } from 'sequelize';
import { timestampFields, baseModelOptions } from './base.model';

export interface UserMenuPermissionAttributes {
  id: number;
  user_id: number;
  menu_item_id: number;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_create: boolean;
  priority: number;
  created_at: Date;
  updated_at: Date;
}

export class UserMenuPermission extends Model<UserMenuPermissionAttributes> {
  declare id: number;
  declare user_id: number;
  declare menu_item_id: number;
  declare can_view: boolean;
  declare can_edit: boolean;
  declare can_delete: boolean;
  declare can_create: boolean;
  declare priority: number;

  static initModel(sequelize: Sequelize): typeof UserMenuPermission {
    UserMenuPermission.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
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
        priority: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 10,
        },
        ...timestampFields,
      },
      {
        sequelize,
        tableName: 'user_menu_permissions',
        ...baseModelOptions,
        indexes: [
          { unique: true, fields: ['user_id', 'menu_item_id'] },
          { fields: ['user_id'] },
          { fields: ['menu_item_id'] },
        ],
      },
    );

    return UserMenuPermission;
  }
}
