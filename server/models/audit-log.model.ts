import { Model, DataTypes, Sequelize } from 'sequelize';
import { timestampFields, baseModelOptions } from './base.model';

export type AuditAction =
  | 'create' | 'read' | 'update' | 'delete'
  | 'login' | 'logout' | 'login_failed'
  | 'password_change' | 'password_reset'
  | '2fa_enable' | '2fa_disable'
  | 'role_assign' | 'role_remove'
  | 'permission_grant' | 'permission_revoke'
  | 'company_switch' | 'export' | 'import';

export interface AuditLogAttributes {
  id: number;
  user_id: number | null;
  company_id: number | null;
  action: AuditAction;
  entity_type: string;
  entity_id: number | null;
  entity_name: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_fields: string[] | null;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export class AuditLog extends Model<AuditLogAttributes> {
  declare id: number;
  declare user_id: number | null;
  declare company_id: number | null;
  declare action: AuditAction;
  declare entity_type: string;
  declare entity_id: number | null;
  declare entity_name: string | null;
  declare old_values: Record<string, unknown> | null;
  declare new_values: Record<string, unknown> | null;
  declare changed_fields: string[] | null;
  declare description: string | null;
  declare ip_address: string | null;
  declare user_agent: string | null;
  declare request_id: string | null;

  static initModel(sequelize: Sequelize): typeof AuditLog {
    AuditLog.init(
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
          type: DataTypes.ENUM(
            'create', 'read', 'update', 'delete',
            'login', 'logout', 'login_failed',
            'password_change', 'password_reset',
            '2fa_enable', '2fa_disable',
            'role_assign', 'role_remove',
            'permission_grant', 'permission_revoke',
            'company_switch', 'export', 'import',
          ),
          allowNull: false,
        },
        entity_type: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        entity_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        entity_name: {
          type: DataTypes.STRING(255),
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
        changed_fields: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        description: {
          type: DataTypes.TEXT,
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
        ...timestampFields,
      },
      {
        sequelize,
        tableName: 'audit_logs',
        ...baseModelOptions,
        indexes: [
          { fields: ['user_id'] },
          { fields: ['company_id'] },
          { fields: ['action'] },
          { fields: ['entity_type', 'entity_id'] },
          { fields: ['created_at'] },
        ],
      },
    );

    return AuditLog;
  }
}
