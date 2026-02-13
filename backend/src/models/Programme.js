import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Programme = sequelize.define('Programme', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  icon: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  color: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  objectives: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  target_beneficiaries: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  outcomes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
}, {
  tableName: 'programmes',
  indexes: [
    { fields: ['slug'] },
    { fields: ['status'] },
    { fields: ['sort_order'] }
  ]
});

export default Programme;
