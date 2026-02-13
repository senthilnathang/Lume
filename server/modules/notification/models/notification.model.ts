import { DataTypes, Model, type Sequelize } from 'sequelize';

export class Notification extends Model {
  declare id: number;
  declare user_id: number;
  declare title: string;
  declare body: string;
  declare type: string;
  declare category: string;
  declare priority: string;
  declare entity_type: string | null;
  declare entity_id: number | null;
  declare action_url: string | null;
  declare icon: string | null;
  declare sender_id: number | null;
  declare is_read: boolean;
  declare read_at: Date | null;
  declare is_archived: boolean;
  declare extra_data: object;
  declare company_id: number | null;
  declare created_at: Date;

  static initModel(sequelize: Sequelize) {
    Notification.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
        title: { type: DataTypes.STRING(255), allowNull: false },
        body: { type: DataTypes.TEXT, allowNull: true },
        type: { type: DataTypes.ENUM('info', 'success', 'warning', 'error', 'action', 'system'), defaultValue: 'info' },
        category: { type: DataTypes.ENUM('general', 'approval', 'assignment', 'mention', 'reminder', 'security', 'system'), defaultValue: 'general' },
        priority: { type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'), defaultValue: 'normal' },
        entity_type: { type: DataTypes.STRING(100), allowNull: true },
        entity_id: { type: DataTypes.INTEGER, allowNull: true },
        action_url: { type: DataTypes.STRING(500), allowNull: true },
        icon: { type: DataTypes.STRING(50), allowNull: true },
        sender_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
        is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
        read_at: { type: DataTypes.DATE, allowNull: true },
        is_archived: { type: DataTypes.BOOLEAN, defaultValue: false },
        extra_data: { type: DataTypes.JSON, defaultValue: {} },
        company_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'companies', key: 'id' } },
      },
      {
        sequelize,
        tableName: 'notifications',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
          { fields: ['user_id', 'is_read'] },
          { fields: ['user_id', 'created_at'] },
          { fields: ['entity_type', 'entity_id'] },
          { fields: ['company_id'] },
        ],
      },
    );
  }
}
