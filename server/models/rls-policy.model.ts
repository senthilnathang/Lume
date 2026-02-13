import { Model, DataTypes, Sequelize } from 'sequelize';
import { timestampFields, baseModelOptions } from './base.model';

export type RLSPolicyType =
  | 'owner_only' | 'organization_member' | 'project_member'
  | 'role_based' | 'conditional' | 'public' | 'tenant_isolated';

export type RLSAction = 'select' | 'insert' | 'update' | 'delete' | 'all';

export interface RLSPolicyAttributes {
  id: number;
  name: string;
  description: string | null;
  entity_type: string;
  table_name: string;
  policy_type: RLSPolicyType;
  action: RLSAction;
  condition_column: string | null;
  condition_value_source: string | null;
  custom_condition: string | null;
  required_roles: string[] | null;
  required_permissions: string[] | null;
  is_active: boolean;
  priority: number;
  company_id: number | null;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export class RLSPolicy extends Model<RLSPolicyAttributes> {
  declare id: number;
  declare name: string;
  declare description: string | null;
  declare entity_type: string;
  declare table_name: string;
  declare policy_type: RLSPolicyType;
  declare action: RLSAction;
  declare condition_column: string | null;
  declare condition_value_source: string | null;
  declare custom_condition: string | null;
  declare required_roles: string[] | null;
  declare required_permissions: string[] | null;
  declare is_active: boolean;
  declare priority: number;
  declare company_id: number | null;
  declare created_by: number;

  static initModel(sequelize: Sequelize): typeof RLSPolicy {
    RLSPolicy.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        entity_type: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        table_name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        policy_type: {
          type: DataTypes.ENUM(
            'owner_only', 'organization_member', 'project_member',
            'role_based', 'conditional', 'public', 'tenant_isolated',
          ),
          allowNull: false,
        },
        action: {
          type: DataTypes.ENUM('select', 'insert', 'update', 'delete', 'all'),
          allowNull: false,
        },
        condition_column: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        condition_value_source: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        custom_condition: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        required_roles: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        required_permissions: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        priority: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 100,
        },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
        created_by: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
        },
        ...timestampFields,
      },
      {
        sequelize,
        tableName: 'rls_policies',
        ...baseModelOptions,
        indexes: [
          { fields: ['entity_type'] },
          { fields: ['table_name'] },
          { fields: ['policy_type'] },
          { fields: ['action'] },
          { fields: ['is_active'] },
          { fields: ['company_id'] },
          { fields: ['priority'] },
        ],
      },
    );

    return RLSPolicy;
  }
}
