/**
 * Audit Log Model
 * Tracks all changes to records
 */

import { DataTypes } from 'sequelize';
import { BaseModel } from './base.model.js';

export default (sequelize) => {
  const attributes = {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    action: {
      type: DataTypes.ENUM('create', 'update', 'delete', 'login', 'logout', 'export'),
      allowNull: false
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    recordId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'record_id'
    },
    oldValues: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'old_values'
    },
    newValues: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'new_values'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'user_id'
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address'
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent'
    }
  };
  
  const options = {
    tableName: 'audit_logs',
    timestamps: true,
    underscored: true,
    softDelete: false
  };
  
  const baseModel = new BaseModel(sequelize, 'AuditLog', attributes, options);
  const model = baseModel.getModel();
  
  return { model, baseModel };
};
