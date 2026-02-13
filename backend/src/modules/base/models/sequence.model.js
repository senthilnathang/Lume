/**
 * Sequence Model
 * Document numbering sequences
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
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    prefix: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    suffix: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    padding: {
      type: DataTypes.INTEGER,
      defaultValue: 5
    },
    nextNumber: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'next_number'
    },
    increment: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    modelName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'model_name'
    },
    fieldName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'field_name'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  };
  
  const options = {
    tableName: 'sequences',
    timestamps: true,
    underscored: true,
    paranoid: false
  };
  
  const baseModel = new BaseModel(sequelize, 'Sequence', attributes, options);
  baseModel.use(CrudMixin({ securityService }));
  
  const model = baseModel.getModel();
  
  return { model, baseModel };
};
