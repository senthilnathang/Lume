import { Model, DataTypes, Sequelize } from 'sequelize';
import { timestampFields, baseModelOptions } from './base.model';

export type ActivityCategory =
  | 'authentication' | 'authorization' | 'user_management'
  | 'data_management' | 'system_management' | 'security'
  | 'workflow' | 'api' | 'file_management' | 'configuration'
  | 'notification' | 'integration';

export type ActivityLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export interface ActivityLogAttributes {
  id: number;
  user_id: number | null;
  company_id: number | null;
  action: string;
  category: ActivityCategory;
  level: ActivityLevel;
  entity_type: string | null;
  entity_id: number | null;
  entity_name: string | null;
  changes: Record<string, unknown> | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  description: string | null;
  extra_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  request_method: string | null;
  request_path: string | null;
  http_status: number | null;
  response_time_ms: number | null;
  session_id: string | null;
  risk_score: number;
  is_suspicious: boolean;
  success: boolean;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

export class ActivityLog extends Model<ActivityLogAttributes> {
  declare id: number;
  declare user_id: number | null;
  declare company_id: number | null;
  declare action: string;
  declare category: ActivityCategory;
  declare level: ActivityLevel;
  declare entity_type: string | null;
  declare entity_id: number | null;
  declare entity_name: string | null;
  declare changes: Record<string, unknown> | null;
  declare old_values: Record<string, unknown> | null;
  declare new_values: Record<string, unknown> | null;
  declare description: string | null;
  declare extra_data: Record<string, unknown> | null;
  declare ip_address: string | null;
  declare user_agent: string | null;
  declare request_id: string | null;
  declare request_method: string | null;
  declare request_path: string | null;
  declare http_status: number | null;
  declare response_time_ms: number | null;
  declare session_id: string | null;
  declare risk_score: number;
  declare is_suspicious: boolean;
  declare success: boolean;
  declare error_message: string | null;

  static initModel(sequelize: Sequelize): typeof ActivityLog {
    ActivityLog.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
        },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
        action: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        category: {
          type: DataTypes.ENUM(
            'authentication', 'authorization', 'user_management',
            'data_management', 'system_management', 'security',
            'workflow', 'api', 'file_management', 'configuration',
            'notification', 'integration',
          ),
          allowNull: false,
          defaultValue: 'data_management',
        },
        level: {
          type: DataTypes.ENUM('debug', 'info', 'warning', 'error', 'critical'),
          allowNull: false,
          defaultValue: 'info',
        },
        entity_type: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        entity_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        entity_name: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        changes: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        old_values: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        new_values: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        extra_data: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        ip_address: {
          type: DataTypes.STRING(45),
          allowNull: true,
        },
        user_agent: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        request_id: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        request_method: {
          type: DataTypes.STRING(10),
          allowNull: true,
        },
        request_path: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        http_status: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        response_time_ms: {
          type: DataTypes.FLOAT,
          allowNull: true,
        },
        session_id: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        risk_score: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        is_suspicious: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        success: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        error_message: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        ...timestampFields,
      },
      {
        sequelize,
        tableName: 'activity_logs',
        ...baseModelOptions,
        indexes: [
          { fields: ['user_id', 'action'] },
          { fields: ['company_id', 'created_at'] },
          { fields: ['entity_type', 'entity_id'] },
          { fields: ['category'] },
          { fields: ['level'] },
          { fields: ['request_id'] },
          { fields: ['session_id'] },
          { fields: ['is_suspicious', 'risk_score'] },
          { fields: ['created_at'] },
        ],
      },
    );

    return ActivityLog;
  }
}
