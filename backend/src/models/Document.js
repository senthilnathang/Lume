import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('brochure', 'annual_report', 'policy', 'other'),
    defaultValue: 'other'
  },
  file_path: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  file_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  download_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
}, {
  tableName: 'documents',
  indexes: [
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['year'] }
  ]
});

export default Document;
