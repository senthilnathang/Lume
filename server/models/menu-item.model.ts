import { Model, DataTypes, Sequelize } from 'sequelize';
import {
  enterpriseModelFields,
  baseModelOptions,
  addSoftDeleteScope,
} from './base.model';

export interface MenuItemAttributes {
  id: number;
  code: string;
  name: string;
  path: string | null;
  icon: string | null;
  component: string | null;
  redirect: string | null;
  parent_id: number | null;
  order: number;
  is_visible: boolean;
  is_active: boolean;
  is_external: boolean;
  module: string | null;
  badge: string | null;
  badge_type: string | null;
  permission_codename: string | null;
  menu_type: 'menu' | 'button' | 'iframe' | 'link';
  created_at: Date;
  updated_at: Date;
}

export class MenuItem extends Model<MenuItemAttributes> {
  declare id: number;
  declare code: string;
  declare name: string;
  declare path: string | null;
  declare icon: string | null;
  declare component: string | null;
  declare redirect: string | null;
  declare parent_id: number | null;
  declare order: number;
  declare is_visible: boolean;
  declare is_active: boolean;
  declare is_external: boolean;
  declare module: string | null;
  declare badge: string | null;
  declare badge_type: string | null;
  declare permission_codename: string | null;
  declare menu_type: 'menu' | 'button' | 'iframe' | 'link';

  static initModel(sequelize: Sequelize): typeof MenuItem {
    MenuItem.init(
      {
        ...enterpriseModelFields,
        code: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        path: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        icon: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        component: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        redirect: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        parent_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'menu_items', key: 'id' },
        },
        order: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        is_visible: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        is_external: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        module: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        badge: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        badge_type: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        permission_codename: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        menu_type: {
          type: DataTypes.ENUM('menu', 'button', 'iframe', 'link'),
          allowNull: false,
          defaultValue: 'menu',
        },
      },
      {
        sequelize,
        tableName: 'menu_items',
        ...baseModelOptions,
        indexes: [
          { unique: true, fields: ['code'] },
          { fields: ['parent_id'] },
          { fields: ['order'] },
          { fields: ['module'] },
          { fields: ['is_visible'] },
          { fields: ['is_active'] },
          { fields: ['menu_type'] },
        ],
      },
    );

    addSoftDeleteScope(MenuItem);
    return MenuItem;
  }
}
