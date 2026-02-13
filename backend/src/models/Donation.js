import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Donation = sequelize.define('Donation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  donor_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'INR'
  },
  payment_method: {
    type: DataTypes.ENUM('cash', 'cheque', 'bank_transfer', 'online', 'other'),
    allowNull: true
  },
  transaction_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  bank_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  cheque_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  receipt_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  programme_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  designation: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  receipt_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  receipt_sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
    defaultValue: 'pending'
  },
  donated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'donations',
  indexes: [
    { fields: ['donor_id'] },
    { fields: ['status'] },
    { fields: ['transaction_id'] },
    { fields: ['receipt_number'] },
    { fields: ['donated_at'] }
  ]
});

export default Donation;
