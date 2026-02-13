import { Model, DataTypes, Sequelize } from 'sequelize';
import { timestampFields, baseModelOptions } from './base.model';

export interface UserGroupAttributes {
  id: number;
  user_id: number;
  group_id: number;
  added_by: number | null;
  added_at: Date;
  created_at: Date;
  updated_at: Date;
}

export class UserGroup extends Model<UserGroupAttributes> {
  declare id: number;
  declare user_id: number;
  declare group_id: number;
  declare added_by: number | null;
  declare added_at: Date;

  static initModel(sequelize: Sequelize): typeof UserGroup {
    UserGroup.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
        },
        group_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'groups', key: 'id' },
          onDelete: 'CASCADE',
        },
        added_by: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
        },
        added_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        ...timestampFields,
      },
      {
        sequelize,
        tableName: 'user_groups',
        ...baseModelOptions,
        indexes: [
          { unique: true, fields: ['user_id', 'group_id'] },
          { fields: ['user_id'] },
          { fields: ['group_id'] },
        ],
      },
    );

    return UserGroup;
  }
}
