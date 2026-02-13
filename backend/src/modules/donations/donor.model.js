import { DataTypes } from 'sequelize';

export const Donor = (sequelize) => {
  const Donor = sequelize.define('Donor', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'first_name'
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'last_name'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    postal_code: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'postal_code'
    },
    is_anonymous: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_anonymous'
    },
    is_subscribed: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_subscribed'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'donors',
    indexes: [
      { fields: ['email'] },
      { fields: ['first_name', 'last_name'] }
    ]
  });

  Donor.prototype.getFullName = function() {
    return this.is_anonymous ? 'Anonymous' : `${this.first_name} ${this.last_name}`;
  };

  return Donor;
};

export default Donor;
