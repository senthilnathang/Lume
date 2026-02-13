import { Model, DataTypes, Sequelize } from 'sequelize';
import {
  companyScopedEnterpriseFields,
  baseModelOptions,
  addSoftDeleteScope,
} from './base.model';

export interface AccessRuleAttributes {
  id: number;
  name: string;
  description: string | null;
  content_type_id: number;
  company_id: number | null;
  user_id: number | null;
  group_id: number | null;
  role_id: number | null;
  can_read: boolean;
  can_write: boolean;
  can_create: boolean;
  can_delete: boolean;
  can_export: boolean;
  domain_filter: Record<string, unknown> | null;
  priority: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class AccessRule extends Model<AccessRuleAttributes> {
  declare id: number;
  declare name: string;
  declare description: string | null;
  declare content_type_id: number;
  declare company_id: number | null;
  declare user_id: number | null;
  declare group_id: number | null;
  declare role_id: number | null;
  declare can_read: boolean;
  declare can_write: boolean;
  declare can_create: boolean;
  declare can_delete: boolean;
  declare can_export: boolean;
  declare domain_filter: Record<string, unknown> | null;
  declare priority: number;

  static initModel(sequelize: Sequelize): typeof AccessRule {
    AccessRule.init(
      {
        ...companyScopedEnterpriseFields,
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        content_type_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'content_types', key: 'id' },
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
        },
        group_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'groups', key: 'id' },
        },
        role_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'roles', key: 'id' },
        },
        can_read: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        can_write: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        can_create: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        can_delete: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        can_export: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        domain_filter: {
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: null,
        },
        priority: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 10,
        },
      },
      {
        sequelize,
        tableName: 'access_rules',
        ...baseModelOptions,
        indexes: [
          { fields: ['content_type_id'] },
          { fields: ['company_id'] },
          { fields: ['user_id'] },
          { fields: ['group_id'] },
          { fields: ['role_id'] },
          { fields: ['priority'] },
          { fields: ['is_active'] },
        ],
      },
    );

    addSoftDeleteScope(AccessRule);
    return AccessRule;
  }
}
