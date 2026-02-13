import { Model, DataTypes, Sequelize } from 'sequelize';
import { timestampFields, baseModelOptions } from './base.model';

export type TrustEventType =
  | 'login_success' | 'login_failed' | 'mfa_success' | 'mfa_failed'
  | 'password_change' | 'session_created' | 'session_terminated'
  | 'device_registered' | 'device_trusted' | 'device_blocked'
  | 'location_new' | 'location_suspicious' | 'impossible_travel'
  | 'behavior_anomaly' | 'privilege_escalation' | 'access_denied'
  | 'step_up_required' | 'step_up_success' | 'step_up_failed'
  | 'brute_force_detected' | 'credential_stuffing';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface TrustEventAttributes {
  id: number;
  user_id: number;
  session_id: string | null;
  device_id: number | null;
  event_type: TrustEventType;
  risk_level: RiskLevel;
  risk_score: number;
  source_ip: string | null;
  user_agent: string | null;
  location: string | null;
  country_code: string | null;
  city: string | null;
  description: string | null;
  event_data: Record<string, unknown> | null;
  resolved: boolean;
  resolved_at: Date | null;
  resolved_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export class TrustEvent extends Model<TrustEventAttributes> {
  declare id: number;
  declare user_id: number;
  declare session_id: string | null;
  declare device_id: number | null;
  declare event_type: TrustEventType;
  declare risk_level: RiskLevel;
  declare risk_score: number;
  declare source_ip: string | null;
  declare user_agent: string | null;
  declare location: string | null;
  declare country_code: string | null;
  declare city: string | null;
  declare description: string | null;
  declare event_data: Record<string, unknown> | null;
  declare resolved: boolean;
  declare resolved_at: Date | null;
  declare resolved_by: number | null;

  static initModel(sequelize: Sequelize): typeof TrustEvent {
    TrustEvent.init(
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
        session_id: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        device_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'device_registry', key: 'id' },
        },
        event_type: {
          type: DataTypes.ENUM(
            'login_success', 'login_failed', 'mfa_success', 'mfa_failed',
            'password_change', 'session_created', 'session_terminated',
            'device_registered', 'device_trusted', 'device_blocked',
            'location_new', 'location_suspicious', 'impossible_travel',
            'behavior_anomaly', 'privilege_escalation', 'access_denied',
            'step_up_required', 'step_up_success', 'step_up_failed',
            'brute_force_detected', 'credential_stuffing',
          ),
          allowNull: false,
        },
        risk_level: {
          type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
          allowNull: false,
          defaultValue: 'low',
        },
        risk_score: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        source_ip: {
          type: DataTypes.STRING(45),
          allowNull: true,
        },
        user_agent: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        location: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        country_code: {
          type: DataTypes.STRING(2),
          allowNull: true,
        },
        city: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        event_data: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        resolved: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        resolved_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        resolved_by: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
        },
        ...timestampFields,
      },
      {
        sequelize,
        tableName: 'trust_events',
        ...baseModelOptions,
        indexes: [
          { fields: ['user_id'] },
          { fields: ['event_type'] },
          { fields: ['risk_level'] },
          { fields: ['risk_score'] },
          { fields: ['source_ip'] },
          { fields: ['created_at'] },
          { fields: ['resolved'] },
        ],
      },
    );

    return TrustEvent;
  }
}
