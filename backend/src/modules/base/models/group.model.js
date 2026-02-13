/**
 * Group Model
 */

import { DataTypes } from 'sequelize';
import { BaseModel, CrudMixin } from './base.model.js';

export default (sequelize, securityService) => {
  const attributes = {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  };
  
  const options = {
    tableName: 'groups',
    timestamps: true,
    underscored: true,
    paranoid: false
  };
  
  const baseModel = new BaseModel(sequelize, 'Group', attributes, options);
  baseModel.use(CrudMixin({ securityService }));
  
  const model = baseModel.getModel();
  
  return { model, baseModel };
};
