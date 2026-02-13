import { DataTypes } from 'sequelize';

export const Message = (sequelize) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    sender_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'sender_name'
    },
    sender_email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'sender_email'
    },
    sender_phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'sender_phone'
    },
    recipient_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'recipient_email'
    },
    type: {
      type: DataTypes.ENUM('contact', 'inquiry', 'support', 'feedback', 'other'),
      defaultValue: 'contact'
    },
    status: {
      type: DataTypes.ENUM('new', 'read', 'replied', 'archived'),
      defaultValue: 'new'
    },
    priority: {
      type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
      defaultValue: 'normal'
    },
    is_starred: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_starred'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'read_at'
    },
    replied_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'replied_at'
    },
    assigned_to: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'assigned_to'
    }
  }, {
    tableName: 'messages',
    indexes: [
      { fields: ['sender_email'] },
      { fields: ['status'] },
      { fields: ['type'] },
      { fields: ['priority'] },
      { fields: ['created_at'] }
    ]
  });

  return Message;
};

export default Message;
