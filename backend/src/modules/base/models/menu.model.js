/**
 * Menu Model
 * Stores menu items for the application
 */

import { DataTypes } from 'sequelize';
import { BaseModel, CrudMixin, SequenceMixin } from './base.model.js';

export default (sequelize, securityService) => {
  const attributes = {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    path: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    icon: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'parent_id',
      references: {
        model: 'menus',
        key: 'id'
      }
    },
    sequence: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 10
    },
    module: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    permission: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    viewName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'view_name'
    },
    hideInMenu: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'hide_in_menu'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  };
  
  const options = {
    tableName: 'menus',
    timestamps: true,
    underscored: true,
    paranoid: false
  };
  
  const baseModel = new BaseModel(sequelize, 'Menu', attributes, options);
  baseModel
    .use(CrudMixin({ securityService }))
    .use(SequenceMixin('sequence'));
  
  const model = baseModel.getModel();
  
  return { model, baseModel };
};
