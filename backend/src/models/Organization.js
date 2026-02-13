import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Organization = sequelize.define('Organization', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  registration_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  founded_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  vision: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  mission: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  objectives: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  website: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  logo: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  facebook_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  twitter_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  instagram_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  linkedin_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
}, {
  tableName: 'organizations',
  indexes: [
    { fields: ['status'] }
  ]
});

export default Organization;
