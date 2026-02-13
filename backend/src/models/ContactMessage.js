import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ContactMessage = sequelize.define('ContactMessage', {
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
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  subject: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  reply: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  replied_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  replied_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('new', 'read', 'replied', 'archived'),
    defaultValue: 'new'
  }
}, {
  tableName: 'contact_messages',
  indexes: [
    { fields: ['status'] },
    { fields: ['created_at'] }
  ]
});

export default ContactMessage;
