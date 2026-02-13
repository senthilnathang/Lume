import { Model, DataTypes, Sequelize } from 'sequelize';
import { timestampFields, baseModelOptions } from './base.model';

export type OAuthProvider = 'google' | 'github' | 'microsoft';

export interface SocialAccountAttributes {
  id: number;
  user_id: number;
  provider: OAuthProvider;
  provider_user_id: string;
  provider_email: string | null;
  provider_username: string | null;
  provider_name: string | null;
  provider_avatar: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: Date | null;
  raw_data: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export class SocialAccount extends Model<SocialAccountAttributes> {
  declare id: number;
  declare user_id: number;
  declare provider: OAuthProvider;
  declare provider_user_id: string;
  declare provider_email: string | null;
  declare provider_username: string | null;
  declare provider_name: string | null;
  declare provider_avatar: string | null;
  declare access_token: string | null;
  declare refresh_token: string | null;
  declare token_expires_at: Date | null;
  declare raw_data: Record<string, unknown> | null;

  static initModel(sequelize: Sequelize): typeof SocialAccount {
    SocialAccount.init(
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
        provider: {
          type: DataTypes.ENUM('google', 'github', 'microsoft'),
          allowNull: false,
        },
        provider_user_id: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        provider_email: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        provider_username: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        provider_name: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        provider_avatar: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        access_token: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        refresh_token: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        token_expires_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        raw_data: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        ...timestampFields,
      },
      {
        sequelize,
        tableName: 'social_accounts',
        ...baseModelOptions,
        indexes: [
          { unique: true, fields: ['provider', 'provider_user_id'] },
          { fields: ['user_id'] },
          { fields: ['provider'] },
        ],
      },
    );

    return SocialAccount;
  }
}
