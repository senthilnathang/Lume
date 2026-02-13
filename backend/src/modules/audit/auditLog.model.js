import { DataTypes } from 'sequelize';

export const AuditLog = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'user_id'
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    resource_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'resource_type'
    },
    resource_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'resource_id'
    },
    old_data: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'old_data'
    },
    new_data: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'new_data'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address'
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'audit_logs',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['action'] },
      { fields: ['resource_type'] },
      { fields: ['created_at'] }
    ]
  });

  return AuditLog;
};

export default AuditLog;
