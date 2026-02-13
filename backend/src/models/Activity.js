import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Activity = sequelize.define('Activity', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  programme_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  activity_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  beneficiaries_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true
  },
  videos: {
    type: DataTypes.JSON,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('published', 'draft'),
    defaultValue: 'draft'
  },
  featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'activities',
  indexes: [
    { fields: ['programme_id'] },
    { fields: ['status'] },
    { fields: ['activity_date'] },
    { fields: ['featured'] }
  ]
});

export default Activity;
