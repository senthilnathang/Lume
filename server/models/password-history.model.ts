import { Model, DataTypes, Sequelize } from 'sequelize';
import { baseModelOptions } from './base.model';

export interface PasswordHistoryAttributes {
  id: number;
  user_id: number;
  password_hash: string;
  created_at: Date;
}

export class PasswordHistory extends Model<PasswordHistoryAttributes> {
  declare id: number;
  declare user_id: number;
  declare password_hash: string;
  declare created_at: Date;

  static initModel(sequelize: Sequelize): typeof PasswordHistory {
    PasswordHistory.init(
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
        password_hash: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: 'password_history',
        ...baseModelOptions,
        timestamps: false,
        indexes: [
          { fields: ['user_id', 'created_at'] },
        ],
      },
    );

    return PasswordHistory;
  }
}
