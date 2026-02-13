import { DataTypes } from 'sequelize';

export const Setting = (sequelize) => {
  const Setting = sequelize.define('Setting', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('string', 'number', 'boolean', 'json', 'array'),
      defaultValue: 'string'
    },
    category: {
      type: DataTypes.STRING(50),
      defaultValue: 'general'
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    is_encrypted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_encrypted'
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_public'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'settings',
    indexes: [
      { fields: ['key'] },
      { fields: ['category'] }
    ]
  });

  return Setting;
};

export default Setting;
