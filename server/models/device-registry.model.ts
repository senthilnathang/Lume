import { Model, DataTypes, Sequelize } from 'sequelize';
import {
  enterpriseModelFields,
  baseModelOptions,
  addSoftDeleteScope,
} from './base.model';

export type DeviceType = 'desktop' | 'laptop' | 'mobile' | 'tablet' | 'other';
export type TrustLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface DeviceRegistryAttributes {
  id: number;
  user_id: number;
  device_fingerprint: string;
  device_name: string | null;
  device_type: DeviceType;
  os_info: string | null;
  browser_info: string | null;
  trust_score: number;
  trust_level: TrustLevel;
  is_trusted: boolean;
  is_blocked: boolean;
  blocked_reason: string | null;
  last_seen_at: Date | null;
  last_seen_ip: string | null;
  last_location: string | null;
  first_seen_at: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class DeviceRegistry extends Model<DeviceRegistryAttributes> {
  declare id: number;
  declare user_id: number;
  declare device_fingerprint: string;
  declare device_name: string | null;
  declare device_type: DeviceType;
  declare os_info: string | null;
  declare browser_info: string | null;
  declare trust_score: number;
  declare trust_level: TrustLevel;
  declare is_trusted: boolean;
  declare is_blocked: boolean;
  declare blocked_reason: string | null;
  declare last_seen_at: Date | null;
  declare last_seen_ip: string | null;
  declare last_location: string | null;
  declare first_seen_at: Date;

  static initModel(sequelize: Sequelize): typeof DeviceRegistry {
    DeviceRegistry.init(
      {
        ...enterpriseModelFields,
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
        },
        device_fingerprint: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        device_name: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        device_type: {
          type: DataTypes.ENUM('desktop', 'laptop', 'mobile', 'tablet', 'other'),
          allowNull: false,
          defaultValue: 'other',
        },
        os_info: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        browser_info: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        trust_score: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        trust_level: {
          type: DataTypes.ENUM('none', 'low', 'medium', 'high', 'critical'),
          allowNull: false,
          defaultValue: 'none',
        },
        is_trusted: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        is_blocked: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        blocked_reason: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        last_seen_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        last_seen_ip: {
          type: DataTypes.STRING(45),
          allowNull: true,
        },
        last_location: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        first_seen_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: 'device_registry',
        ...baseModelOptions,
        indexes: [
          { unique: true, fields: ['user_id', 'device_fingerprint'] },
          { fields: ['user_id'] },
          { fields: ['is_trusted'] },
          { fields: ['is_blocked'] },
          { fields: ['trust_level'] },
          { fields: ['last_seen_at'] },
        ],
      },
    );

    addSoftDeleteScope(DeviceRegistry);
    return DeviceRegistry;
  }
}
