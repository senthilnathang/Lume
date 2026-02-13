import { Model, DataTypes, Sequelize } from 'sequelize';
import { timestampFields, baseModelOptions } from './base.model';

export type FieldVisibility = 'visible' | 'hidden' | 'masked' | 'conditional';
export type FieldEditability = 'editable' | 'readonly' | 'conditional';
export type SensitivityLevel = 'public' | 'internal' | 'confidential' | 'sensitive' | 'secret';

export interface FieldPermissionAttributes {
  id: number;
  entity_type: string;
  field_name: string;
  visibility: FieldVisibility;
  visibility_condition: string | null;
  editability: FieldEditability;
  editability_condition: string | null;
  sensitivity: SensitivityLevel;
  mask_pattern: string | null;
  mask_preserve_last: number | null;
  visible_to_roles: string[];
  editable_by_roles: string[];
  hidden_from_roles: string[];
  company_id: number | null;
  module: string | null;
  priority: number;
  is_active: boolean;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export class FieldPermission extends Model<FieldPermissionAttributes> {
  declare id: number;
  declare entity_type: string;
  declare field_name: string;
  declare visibility: FieldVisibility;
  declare visibility_condition: string | null;
  declare editability: FieldEditability;
  declare editability_condition: string | null;
  declare sensitivity: SensitivityLevel;
  declare mask_pattern: string | null;
  declare mask_preserve_last: number | null;
  declare visible_to_roles: string[];
  declare editable_by_roles: string[];
  declare hidden_from_roles: string[];
  declare company_id: number | null;
  declare module: string | null;
  declare priority: number;
  declare is_active: boolean;
  declare created_by: number | null;

  static initModel(sequelize: Sequelize): typeof FieldPermission {
    FieldPermission.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        entity_type: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        field_name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        visibility: {
          type: DataTypes.ENUM('visible', 'hidden', 'masked', 'conditional'),
          allowNull: false,
          defaultValue: 'visible',
        },
        visibility_condition: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        editability: {
          type: DataTypes.ENUM('editable', 'readonly', 'conditional'),
          allowNull: false,
          defaultValue: 'editable',
        },
        editability_condition: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        sensitivity: {
          type: DataTypes.ENUM('public', 'internal', 'confidential', 'sensitive', 'secret'),
          allowNull: false,
          defaultValue: 'public',
        },
        mask_pattern: {
          type: DataTypes.STRING(50),
          allowNull: true,
          defaultValue: '****',
        },
        mask_preserve_last: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 4,
        },
        visible_to_roles: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: [],
        },
        editable_by_roles: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: [],
        },
        hidden_from_roles: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: [],
        },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
        module: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        priority: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 100,
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        created_by: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
        },
        ...timestampFields,
      },
      {
        sequelize,
        tableName: 'field_permissions',
        ...baseModelOptions,
        indexes: [
          { unique: true, fields: ['entity_type', 'field_name', 'company_id'] },
          { fields: ['entity_type'] },
          { fields: ['visibility'] },
          { fields: ['sensitivity'] },
          { fields: ['module'] },
          { fields: ['is_active'] },
        ],
      },
    );

    return FieldPermission;
  }
}
