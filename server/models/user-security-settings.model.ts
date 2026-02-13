import { Model, DataTypes, Sequelize } from 'sequelize';
import { timestampFields, baseModelOptions } from './base.model';

export interface UserSecuritySettingsAttributes {
  id: number;
  user_id: number;
  // 2FA
  two_factor_required: boolean;
  two_factor_methods: string[];
  backup_codes_remaining: number;
  two_factor_last_verified: Date | null;
  // API Access
  api_access_enabled: boolean;
  api_rate_limit_per_hour: number;
  api_rate_limit_per_minute: number;
  api_key_enabled: boolean;
  api_key_hash: string | null;
  api_key_prefix: string | null;
  api_key_created_at: Date | null;
  api_key_expires_at: Date | null;
  api_key_last_used_at: Date | null;
  // Session
  max_concurrent_sessions: number;
  session_timeout_minutes: number;
  require_session_ip_binding: boolean;
  allowed_session_ips: string[];
  require_reauth_for_sensitive: boolean;
  sensitive_action_timeout_minutes: number;
  // Login
  max_failed_login_attempts: number;
  lockout_duration_minutes: number;
  require_captcha_after_failures: number;
  track_login_ips: boolean;
  // Password policy
  password_expires_days: number;
  password_last_changed_at: Date | null;
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_numbers: boolean;
  password_require_special: boolean;
  password_history_count: number;
  // Login time restrictions
  login_hours_enabled: boolean;
  login_hours_start: string | null;
  login_hours_end: string | null;
  login_hours_timezone: string;
  login_days_allowed: number[];
  // IP restrictions
  allowed_login_ips: string[];
  blocked_login_ips: string[];
  require_vpn: boolean;
  // Notifications
  notify_on_login: boolean;
  notify_on_failed_login: boolean;
  notify_on_password_change: boolean;
  notify_on_2fa_change: boolean;
  notify_on_new_device: boolean;
  notify_on_suspicious_activity: boolean;
  security_notification_email: string | null;
  // Activity
  activity_logging_enabled: boolean;
  audit_retention_days: number;
  log_api_calls: boolean;
  log_data_exports: boolean;
  // Admin
  admin_locked: boolean;
  admin_lock_reason: string | null;
  admin_locked_at: Date | null;
  admin_locked_by: number | null;
  admin_notes: string | null;
  settings_locked: boolean;
  applied_policy_id: number | null;
  applied_policy_at: Date | null;
  last_reviewed_at: Date | null;
  reviewed_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export class UserSecuritySettings extends Model<UserSecuritySettingsAttributes> {
  declare id: number;
  declare user_id: number;
  declare two_factor_required: boolean;
  declare two_factor_methods: string[];
  declare backup_codes_remaining: number;
  declare two_factor_last_verified: Date | null;
  declare api_access_enabled: boolean;
  declare api_rate_limit_per_hour: number;
  declare api_rate_limit_per_minute: number;
  declare api_key_enabled: boolean;
  declare api_key_hash: string | null;
  declare api_key_prefix: string | null;
  declare api_key_created_at: Date | null;
  declare api_key_expires_at: Date | null;
  declare api_key_last_used_at: Date | null;
  declare max_concurrent_sessions: number;
  declare session_timeout_minutes: number;
  declare require_session_ip_binding: boolean;
  declare allowed_session_ips: string[];
  declare require_reauth_for_sensitive: boolean;
  declare sensitive_action_timeout_minutes: number;
  declare max_failed_login_attempts: number;
  declare lockout_duration_minutes: number;
  declare require_captcha_after_failures: number;
  declare track_login_ips: boolean;
  declare password_expires_days: number;
  declare password_last_changed_at: Date | null;
  declare password_min_length: number;
  declare password_require_uppercase: boolean;
  declare password_require_lowercase: boolean;
  declare password_require_numbers: boolean;
  declare password_require_special: boolean;
  declare password_history_count: number;
  declare login_hours_enabled: boolean;
  declare login_hours_start: string | null;
  declare login_hours_end: string | null;
  declare login_hours_timezone: string;
  declare login_days_allowed: number[];
  declare allowed_login_ips: string[];
  declare blocked_login_ips: string[];
  declare require_vpn: boolean;
  declare notify_on_login: boolean;
  declare notify_on_failed_login: boolean;
  declare notify_on_password_change: boolean;
  declare notify_on_2fa_change: boolean;
  declare notify_on_new_device: boolean;
  declare notify_on_suspicious_activity: boolean;
  declare security_notification_email: string | null;
  declare activity_logging_enabled: boolean;
  declare audit_retention_days: number;
  declare log_api_calls: boolean;
  declare log_data_exports: boolean;
  declare admin_locked: boolean;
  declare admin_lock_reason: string | null;
  declare admin_locked_at: Date | null;
  declare admin_locked_by: number | null;
  declare admin_notes: string | null;
  declare settings_locked: boolean;
  declare applied_policy_id: number | null;
  declare applied_policy_at: Date | null;
  declare last_reviewed_at: Date | null;
  declare reviewed_by: number | null;

  static initModel(sequelize: Sequelize): typeof UserSecuritySettings {
    UserSecuritySettings.init(
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
        two_factor_required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        two_factor_methods: { type: DataTypes.JSON, allowNull: false, defaultValue: ['totp'] },
        backup_codes_remaining: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
        two_factor_last_verified: { type: DataTypes.DATE, allowNull: true },
        // API
        api_access_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        api_rate_limit_per_hour: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1000 },
        api_rate_limit_per_minute: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 60 },
        api_key_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        api_key_hash: { type: DataTypes.STRING(255), allowNull: true },
        api_key_prefix: { type: DataTypes.STRING(20), allowNull: true },
        api_key_created_at: { type: DataTypes.DATE, allowNull: true },
        api_key_expires_at: { type: DataTypes.DATE, allowNull: true },
        api_key_last_used_at: { type: DataTypes.DATE, allowNull: true },
        // Session
        max_concurrent_sessions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
        session_timeout_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1440 },
        require_session_ip_binding: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        allowed_session_ips: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
        require_reauth_for_sensitive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        sensitive_action_timeout_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 15 },
        // Login
        max_failed_login_attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
        lockout_duration_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
        require_captcha_after_failures: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
        track_login_ips: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        // Password
        password_expires_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        password_last_changed_at: { type: DataTypes.DATE, allowNull: true },
        password_min_length: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 8 },
        password_require_uppercase: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        password_require_lowercase: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        password_require_numbers: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        password_require_special: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        password_history_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
        // Login time
        login_hours_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        login_hours_start: { type: DataTypes.STRING(5), allowNull: true },
        login_hours_end: { type: DataTypes.STRING(5), allowNull: true },
        login_hours_timezone: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'UTC' },
        login_days_allowed: { type: DataTypes.JSON, allowNull: false, defaultValue: [1, 2, 3, 4, 5] },
        // IP restrictions
        allowed_login_ips: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
        blocked_login_ips: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
        require_vpn: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        // Notifications
        notify_on_login: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        notify_on_failed_login: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        notify_on_password_change: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        notify_on_2fa_change: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        notify_on_new_device: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        notify_on_suspicious_activity: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        security_notification_email: { type: DataTypes.STRING(255), allowNull: true },
        // Activity
        activity_logging_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        audit_retention_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 90 },
        log_api_calls: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        log_data_exports: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        // Admin
        admin_locked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        admin_lock_reason: { type: DataTypes.TEXT, allowNull: true },
        admin_locked_at: { type: DataTypes.DATE, allowNull: true },
        admin_locked_by: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
        admin_notes: { type: DataTypes.TEXT, allowNull: true },
        settings_locked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        applied_policy_id: { type: DataTypes.INTEGER, allowNull: true },
        applied_policy_at: { type: DataTypes.DATE, allowNull: true },
        last_reviewed_at: { type: DataTypes.DATE, allowNull: true },
        reviewed_by: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
        ...timestampFields,
      },
      {
        sequelize,
        tableName: 'user_security_settings',
        ...baseModelOptions,
        indexes: [
          { unique: true, fields: ['user_id'] },
        ],
      },
    );

    return UserSecuritySettings;
  }
}
