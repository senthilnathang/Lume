import { Model, DataTypes, Sequelize } from 'sequelize';
import { timestampFields, baseModelOptions } from './base.model';

export type TrustLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface SecuritySessionAttributes {
  id: number;
  session_id: string;
  user_id: number;
  device_id: number | null;
  trust_level: TrustLevel;
  risk_score: number;
  ip_address: string | null;
  user_agent: string | null;
  location: string | null;
  started_at: Date;
  last_activity_at: Date | null;
  expires_at: Date | null;
  terminated_at: Date | null;
  termination_reason: string | null;
  is_active: boolean;
  step_up_verified: boolean;
  step_up_verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class SecuritySession extends Model<SecuritySessionAttributes> {
  declare id: number;
  declare session_id: string;
  declare user_id: number;
  declare device_id: number | null;
  declare trust_level: TrustLevel;
  declare risk_score: number;
  declare ip_address: string | null;
  declare user_agent: string | null;
  declare location: string | null;
  declare started_at: Date;
  declare last_activity_at: Date | null;
  declare expires_at: Date | null;
  declare terminated_at: Date | null;
  declare termination_reason: string | null;
  declare is_active: boolean;
  declare step_up_verified: boolean;
  declare step_up_verified_at: Date | null;

  static initModel(sequelize: Sequelize): typeof SecuritySession {
    SecuritySession.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        session_id: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
        },
        device_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'device_registry', key: 'id' },
        },
        trust_level: {
          type: DataTypes.ENUM('none', 'low', 'medium', 'high', 'critical'),
          allowNull: false,
          defaultValue: 'low',
        },
        risk_score: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        ip_address: {
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
        started_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        last_activity_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        expires_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        terminated_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        termination_reason: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        step_up_verified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        step_up_verified_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        ...timestampFields,
      },
      {
        sequelize,
        tableName: 'security_sessions',
        ...baseModelOptions,
        indexes: [
          { unique: true, fields: ['session_id'] },
          { fields: ['user_id'] },
          { fields: ['device_id'] },
          { fields: ['is_active'] },
          { fields: ['trust_level'] },
          { fields: ['expires_at'] },
        ],
      },
    );

    return SecuritySession;
  }
}
