import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const TeamMember = sequelize.define('TeamMember', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  designation: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  qualifications: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  photo: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  message: {
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
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
}, {
  tableName: 'team_members',
  indexes: [
    { fields: ['status'] },
    { fields: ['sort_order'] }
  ]
});

export default TeamMember;
