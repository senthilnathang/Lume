import { DataTypes } from 'sequelize';

export const Role = (sequelize) => {
  const Role = sequelize.define('Role', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    display_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'display_name'
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    is_system: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_system'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'roles',
    indexes: [
      { fields: ['name'] },
      { fields: ['is_active'] }
    ]
  });

  return Role;
};

export default Role;
