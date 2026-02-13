import { DataTypes } from 'sequelize';

export const Donation = (sequelize) => {
  const Donation = sequelize.define('Donation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    donor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'donor_id'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD'
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
      defaultValue: 'pending'
    },
    payment_method: {
      type: DataTypes.ENUM('cash', 'cheque', 'bank_transfer', 'online', 'other'),
      allowNull: true,
      field: 'payment_method'
    },
    transaction_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'transaction_id'
    },
    payment_gateway: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'payment_gateway'
    },
    campaign_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'campaign_id'
    },
    activity_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'activity_id'
    },
    designation: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    is_recurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_recurring'
    },
    frequency: {
      type: DataTypes.ENUM('one_time', 'weekly', 'monthly', 'quarterly', 'annually'),
      defaultValue: 'one_time',
      field: 'frequency'
    },
    receipt_sent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'receipt_sent'
    },
    receipt_sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'receipt_sent_at'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    anonymous: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'donations',
    indexes: [
      { fields: ['donor_id'] },
      { fields: ['status'] },
      { fields: ['transaction_id'] },
      { fields: ['created_at'] }
    ]
  });

  return Donation;
};

export default Donation;
