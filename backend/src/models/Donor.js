import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Donor = sequelize.define('Donor', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  pan_number: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('individual', 'organization', 'government', 'corporate'),
    defaultValue: 'individual'
  },
  anonymous_donation: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  total_donations: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
}, {
  tableName: 'donors',
  indexes: [
    { fields: ['email'] },
    { fields: ['status'] },
    { fields: ['type'] }
  ]
});

export default Donor;
