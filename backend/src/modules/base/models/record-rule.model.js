/**
 * Record Rule Model
 * Defines access rules for records
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
      type: DataTypes.STRING(200),
      allowNull: false
    },
    modelName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'model_name'
    },
    action: {
      type: DataTypes.ENUM('create', 'read', 'write', 'unlink'),
      allowNull: false
    },
    domain: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {}
    },
    groups: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    users: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    sequence: {
      type: DataTypes.INTEGER,
      defaultValue: 10
    }
  };
  
  const options = {
    tableName: 'record_rules',
    timestamps: true,
    underscored: true,
    softDelete: false
  };
  
  const baseModel = new BaseModel(sequelize, 'RecordRule', attributes, options);
  baseModel
    .use(CrudMixin({ securityService }))
    .use(SequenceMixin('sequence'));
  
  const model = baseModel.getModel();
  
  return { model, baseModel };
};
