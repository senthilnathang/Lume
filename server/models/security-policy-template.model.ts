import { Model, DataTypes, Sequelize } from 'sequelize';
import {
  companyScopedEnterpriseFields,
  baseModelOptions,
  addSoftDeleteScope,
} from './base.model';

export interface SecurityPolicyTemplateAttributes {
  id: number;
  name: string;
  code: string;
  description: string | null;
  settings: Record<string, unknown>;
  apply_to_new_users: boolean;
  apply_to_roles: string[];
  apply_to_departments: string[];
  priority: number;
  is_active: boolean;
  company_id: number | null;
  applied_count: number;
  last_applied_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class SecurityPolicyTemplate extends Model<SecurityPolicyTemplateAttributes> {
  declare id: number;
  declare name: string;
  declare code: string;
  declare description: string | null;
  declare settings: Record<string, unknown>;
  declare apply_to_new_users: boolean;
  declare apply_to_roles: string[];
  declare apply_to_departments: string[];
  declare priority: number;
  declare is_active: boolean;
  declare company_id: number | null;
  declare applied_count: number;
  declare last_applied_at: Date | null;

  static initModel(sequelize: Sequelize): typeof SecurityPolicyTemplate {
    SecurityPolicyTemplate.init(
      {
        ...companyScopedEnterpriseFields,
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        code: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        settings: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: {},
        },
        apply_to_new_users: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        apply_to_roles: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: [],
        },
        apply_to_departments: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: [],
        },
        priority: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        applied_count: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        last_applied_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'security_policy_templates',
        ...baseModelOptions,
        indexes: [
          { unique: true, fields: ['code'] },
          { fields: ['is_active'] },
          { fields: ['company_id'] },
        ],
      },
    );

    addSoftDeleteScope(SecurityPolicyTemplate);
    return SecurityPolicyTemplate;
  }
}
