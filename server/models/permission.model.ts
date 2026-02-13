import { Model, DataTypes, Sequelize } from 'sequelize';
import {
  enterpriseModelFields,
  baseModelOptions,
  addSoftDeleteScope,
} from './base.model';

export type PermissionCategory =
  | 'system'
  | 'module'
  | 'data'
  | 'ui'
  | 'api'
  | 'workflow'
  | 'report'
  | 'other';

export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'execute'
  | 'approve'
  | 'export'
  | 'import'
  | 'manage'
  | 'view'
  | 'other';

export interface PermissionAttributes {
  id: number;
  name: string;
  codename: string;
  description: string | null;
  category: PermissionCategory;
  action: PermissionAction;
  resource: string | null;
  module: string | null;
  is_system_permission: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class Permission extends Model<PermissionAttributes> {
  declare id: number;
  declare name: string;
  declare codename: string;
  declare description: string | null;
  declare category: PermissionCategory;
  declare action: PermissionAction;
  declare resource: string | null;
  declare module: string | null;
  declare is_system_permission: boolean;
  declare is_active: boolean;

  static initModel(sequelize: Sequelize): typeof Permission {
    Permission.init(
      {
        ...enterpriseModelFields,
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        codename: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        category: {
          type: DataTypes.ENUM(
            'system', 'module', 'data', 'ui', 'api', 'workflow', 'report', 'other',
          ),
          allowNull: false,
          defaultValue: 'other',
        },
        action: {
          type: DataTypes.ENUM(
            'create', 'read', 'update', 'delete', 'execute',
            'approve', 'export', 'import', 'manage', 'view', 'other',
          ),
          allowNull: false,
          defaultValue: 'other',
        },
        resource: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        module: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        is_system_permission: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      {
        sequelize,
        tableName: 'permissions',
        ...baseModelOptions,
        indexes: [
          { unique: true, fields: ['codename'] },
          { fields: ['category'] },
          { fields: ['action'] },
          { fields: ['resource'] },
          { fields: ['module'] },
          { fields: ['is_system_permission'] },
          { fields: ['is_active'] },
        ],
      },
    );

    addSoftDeleteScope(Permission);
    return Permission;
  }
}
