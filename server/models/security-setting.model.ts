import { Model, DataTypes, Sequelize } from 'sequelize';
import { timestampFields, baseModelOptions } from './base.model';

export interface SecuritySettingAttributes {
  id: number;
  user_id: number;
  // 2FA
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  backup_codes: string[] | null;
  // Login
  require_password_change: boolean;
  password_expiry_days: number | null;
  max_login_attempts: number;
  lockout_duration_minutes: number;
  // Password policy
  min_password_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_special_chars: boolean;
  password_history_count: number;
  // Session
  max_session_duration_hours: number;
  allow_concurrent_sessions: boolean;
  max_concurrent_sessions: number;
  // Notifications
  email_on_login: boolean;
  email_on_password_change: boolean;
  email_on_security_change: boolean;
  email_on_suspicious_activity: boolean;
  // Privacy
  activity_logging_enabled: boolean;
  data_retention_days: number | null;
  // API
  api_access_enabled: boolean;
  api_rate_limit: number;
  created_at: Date;
  updated_at: Date;
}

export class SecuritySetting extends Model<SecuritySettingAttributes> {
  declare id: number;
  declare user_id: number;
  declare two_factor_enabled: boolean;
  declare two_factor_secret: string | null;
  declare backup_codes: string[] | null;
  declare require_password_change: boolean;
  declare password_expiry_days: number | null;
  declare max_login_attempts: number;
  declare lockout_duration_minutes: number;
  declare min_password_length: number;
  declare require_uppercase: boolean;
  declare require_lowercase: boolean;
  declare require_numbers: boolean;
  declare require_special_chars: boolean;
  declare password_history_count: number;
  declare max_session_duration_hours: number;
  declare allow_concurrent_sessions: boolean;
  declare max_concurrent_sessions: number;
  declare email_on_login: boolean;
  declare email_on_password_change: boolean;
  declare email_on_security_change: boolean;
  declare email_on_suspicious_activity: boolean;
  declare activity_logging_enabled: boolean;
  declare data_retention_days: number | null;
  declare api_access_enabled: boolean;
  declare api_rate_limit: number;

  static initModel(sequelize: Sequelize): typeof SecuritySetting {
    SecuritySetting.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
        },
        // 2FA
        two_factor_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        two_factor_secret: { type: DataTypes.STRING(255), allowNull: true },
        backup_codes: { type: DataTypes.JSON, allowNull: true },
        // Login
        require_password_change: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        password_expiry_days: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 90 },
        max_login_attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
        lockout_duration_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
        // Password
        min_password_length: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 8 },
        require_uppercase: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        require_lowercase: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        require_numbers: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        require_special_chars: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        password_history_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
        // Session
        max_session_duration_hours: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 24 },
        allow_concurrent_sessions: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        max_concurrent_sessions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
        // Notifications
        email_on_login: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        email_on_password_change: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        email_on_security_change: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        email_on_suspicious_activity: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        // Privacy
        activity_logging_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        data_retention_days: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 90 },
        // API
        api_access_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        api_rate_limit: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
        ...timestampFields,
      },
      {
        sequelize,
        tableName: 'security_settings',
        ...baseModelOptions,
        indexes: [
          { unique: true, fields: ['user_id'] },
        ],
      },
    );

    return SecuritySetting;
  }
}
