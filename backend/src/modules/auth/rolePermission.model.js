import { DataTypes } from 'sequelize';

export const RolePermission = (sequelize) => {
  const RolePermission = sequelize.define('RolePermission', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'role_id'
    },
    permission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'permission_id'
    },
    action: {
      type: DataTypes.ENUM('read', 'write', 'delete', 'admin'),
      allowNull: false,
      defaultValue: 'read'
    }
  }, {
    tableName: 'role_permissions',
    indexes: [
      { fields: ['role_id'] },
      { fields: ['permission_id'] },
      { fields: ['role_id', 'permission_id'], unique: true }
    ]
  });

  return RolePermission;
};

export default RolePermission;
