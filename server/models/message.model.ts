import { Model, DataTypes, Sequelize } from 'sequelize';
import { timestampFields, baseModelOptions } from './base.model';

export type MessageType =
  | 'comment' | 'note' | 'system' | 'notification'
  | 'email' | 'log' | 'approval' | 'rejection' | 'assignment';

export type MessageLevel = 'info' | 'success' | 'warning' | 'error' | 'debug';

export interface MessageAttributes {
  id: number;
  model_name: string;
  record_id: number;
  user_id: number | null;
  parent_id: number | null;
  subject: string | null;
  body: string;
  body_html: string | null;
  message_type: MessageType;
  level: MessageLevel;
  attachments: string[] | null;
  is_internal: boolean;
  is_pinned: boolean;
  is_archived: boolean;
  archived_at: Date | null;
  archived_by: number | null;
  extra_data: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export class Message extends Model<MessageAttributes> {
  declare id: number;
  declare model_name: string;
  declare record_id: number;
  declare user_id: number | null;
  declare parent_id: number | null;
  declare subject: string | null;
  declare body: string;
  declare body_html: string | null;
  declare message_type: MessageType;
  declare level: MessageLevel;
  declare attachments: string[] | null;
  declare is_internal: boolean;
  declare is_pinned: boolean;
  declare is_archived: boolean;
  declare archived_at: Date | null;
  declare archived_by: number | null;
  declare extra_data: Record<string, unknown> | null;

  static initModel(sequelize: Sequelize): typeof Message {
    Message.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        model_name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        record_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
        },
        parent_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'messages', key: 'id' },
        },
        subject: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        body: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        body_html: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        message_type: {
          type: DataTypes.ENUM(
            'comment', 'note', 'system', 'notification',
            'email', 'log', 'approval', 'rejection', 'assignment',
          ),
          allowNull: false,
          defaultValue: 'comment',
        },
        level: {
          type: DataTypes.ENUM('info', 'success', 'warning', 'error', 'debug'),
          allowNull: false,
          defaultValue: 'info',
        },
        attachments: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        is_internal: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        is_pinned: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        is_archived: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        archived_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        archived_by: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
        },
        extra_data: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        ...timestampFields,
      },
      {
        sequelize,
        tableName: 'messages',
        ...baseModelOptions,
        indexes: [
          { fields: ['model_name', 'record_id'] },
          { fields: ['model_name', 'record_id', 'parent_id'] },
          { fields: ['user_id'] },
          { fields: ['message_type'] },
          { fields: ['is_archived'] },
          { fields: ['created_at'] },
        ],
      },
    );

    return Message;
  }
}
