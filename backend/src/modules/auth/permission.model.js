import { DataTypes } from 'sequelize';

export const Permission = (sequelize) => {
  const Permission = sequelize.define('Permission', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
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
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'general'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  }, {
    tableName: 'permissions',
    indexes: [
      { fields: ['name'] },
      { fields: ['category'] },
      { fields: ['is_active'] }
    ]
  });

  return Permission;
};

export default Permission;
