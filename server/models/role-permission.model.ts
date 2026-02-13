import { Model, DataTypes, Sequelize } from 'sequelize';
import { timestampFields, baseModelOptions } from './base.model';

export interface RolePermissionAttributes {
  id: number;
  role_id: number;
  permission_id: number;
  created_at: Date;
  updated_at: Date;
}

export class RolePermission extends Model<RolePermissionAttributes> {
  declare id: number;
  declare role_id: number;
  declare permission_id: number;

  static initModel(sequelize: Sequelize): typeof RolePermission {
    RolePermission.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        role_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'roles', key: 'id' },
          onDelete: 'CASCADE',
        },
        permission_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'permissions', key: 'id' },
          onDelete: 'CASCADE',
        },
        ...timestampFields,
      },
      {
        sequelize,
        tableName: 'role_permissions',
        ...baseModelOptions,
        indexes: [
          { unique: true, fields: ['role_id', 'permission_id'] },
          { fields: ['role_id'] },
          { fields: ['permission_id'] },
        ],
      },
    );

    return RolePermission;
  }
}
