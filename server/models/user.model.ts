import { Model, DataTypes, Sequelize } from 'sequelize';
import {
  enterpriseModelFields,
  baseModelOptions,
  addSoftDeleteScope,
} from './base.model';

export interface UserAttributes {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  hashed_password: string;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  location: string | null;
  website: string | null;
  timezone: string;
  language: string;
  default_home_path: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
  current_company_id: number | null;
  // Account lockout
  failed_login_attempts: number;
  locked_until: Date | null;
  last_login_at: Date | null;
  last_login_ip: string | null;
  // Password security
  password_changed_at: Date | null;
  must_change_password: boolean;
  // 2FA
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  backup_codes: string[] | null;
  two_factor_verified_at: Date | null;
  // Email verification
  email_verified_at: Date | null;
  email_verification_token: string | null;
  // Timestamps
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  is_deleted: boolean;
}

export interface UserCreationAttributes {
  email: string;
  username: string;
  hashed_password: string;
  full_name?: string;
  is_superuser?: boolean;
  current_company_id?: number;
}

export class User extends Model<UserAttributes, UserCreationAttributes> {
  declare id: number;
  declare email: string;
  declare username: string;
  declare full_name: string | null;
  declare hashed_password: string;
  declare avatar_url: string | null;
  declare bio: string | null;
  declare phone: string | null;
  declare location: string | null;
  declare website: string | null;
  declare timezone: string;
  declare language: string;
  declare default_home_path: string | null;
  declare is_active: boolean;
  declare is_verified: boolean;
  declare is_superuser: boolean;
  declare current_company_id: number | null;
  declare failed_login_attempts: number;
  declare locked_until: Date | null;
  declare last_login_at: Date | null;
  declare last_login_ip: string | null;
  declare password_changed_at: Date | null;
  declare must_change_password: boolean;
  declare two_factor_enabled: boolean;
  declare two_factor_secret: string | null;
  declare backup_codes: string[] | null;
  declare two_factor_verified_at: Date | null;
  declare email_verified_at: Date | null;
  declare email_verification_token: string | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at: Date | null;
  declare is_deleted: boolean;

  /**
   * Check if the account is currently locked.
   */
  isLocked(): boolean {
    if (!this.locked_until) return false;
    return new Date() < this.locked_until;
  }

  /**
   * Increment failed login attempts and optionally lock the account.
   */
  async incrementFailedAttempts(maxAttempts = 5, lockoutMinutes = 30): Promise<void> {
    this.failed_login_attempts += 1;
    if (this.failed_login_attempts >= maxAttempts) {
      this.locked_until = new Date(Date.now() + lockoutMinutes * 60 * 1000);
    }
    await this.save();
  }

  /**
   * Reset failed login attempts after successful login.
   */
  async resetFailedAttempts(): Promise<void> {
    this.failed_login_attempts = 0;
    this.locked_until = null;
    await this.save();
  }

  /**
   * Record a successful login.
   */
  async recordLogin(ipAddress?: string): Promise<void> {
    this.last_login_at = new Date();
    if (ipAddress) {
      this.last_login_ip = ipAddress;
    }
    this.failed_login_attempts = 0;
    this.locked_until = null;
    await this.save();
  }

  static initModel(sequelize: Sequelize): typeof User {
    User.init(
      {
        ...enterpriseModelFields,
        email: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
          validate: { isEmail: true },
        },
        username: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true,
        },
        full_name: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        hashed_password: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        avatar_url: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        bio: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        phone: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        location: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        website: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        timezone: {
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: 'UTC',
        },
        language: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: 'en',
        },
        default_home_path: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        is_verified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        is_superuser: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        current_company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
        failed_login_attempts: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        locked_until: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        last_login_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        last_login_ip: {
          type: DataTypes.STRING(45),
          allowNull: true,
        },
        password_changed_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        must_change_password: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        two_factor_enabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        two_factor_secret: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        backup_codes: {
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: null,
        },
        two_factor_verified_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        email_verified_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        email_verification_token: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'users',
        ...baseModelOptions,
        indexes: [
          { unique: true, fields: ['email'] },
          { unique: true, fields: ['username'] },
          { fields: ['is_active'] },
          { fields: ['current_company_id'] },
          { fields: ['is_superuser'] },
        ],
      },
    );

    addSoftDeleteScope(User);
    return User;
  }
}
