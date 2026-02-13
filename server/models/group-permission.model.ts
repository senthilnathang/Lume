import { Model, DataTypes, Sequelize } from 'sequelize';
import { timestampFields, baseModelOptions } from './base.model';

export interface GroupPermissionAttributes {
  id: number;
  group_id: number;
  permission_id: number;
  created_at: Date;
  updated_at: Date;
}

export class GroupPermission extends Model<GroupPermissionAttributes> {
  declare id: number;
  declare group_id: number;
  declare permission_id: number;

  static initModel(sequelize: Sequelize): typeof GroupPermission {
    GroupPermission.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        group_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'groups', key: 'id' },
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
        tableName: 'group_permissions',
        ...baseModelOptions,
        indexes: [
          { unique: true, fields: ['group_id', 'permission_id'] },
          { fields: ['group_id'] },
          { fields: ['permission_id'] },
        ],
      },
    );

    return GroupPermission;
  }
}
