import { Model, DataTypes, Sequelize } from 'sequelize';
import {
  companyScopedEnterpriseFields,
  baseModelOptions,
  addSoftDeleteScope,
} from './base.model';

export interface RoleAttributes {
  id: number;
  name: string;
  codename: string;
  description: string | null;
  company_id: number | null;
  parent_id: number | null;
  hierarchy_level: number;
  is_system_role: boolean;
  is_active: boolean;
  max_users: number | null;
  created_at: Date;
  updated_at: Date;
}

export class Role extends Model<RoleAttributes> {
  declare id: number;
  declare name: string;
  declare codename: string;
  declare description: string | null;
  declare company_id: number | null;
  declare parent_id: number | null;
  declare hierarchy_level: number;
  declare is_system_role: boolean;
  declare is_active: boolean;
  declare max_users: number | null;

  static initModel(sequelize: Sequelize): typeof Role {
    Role.init(
      {
        ...companyScopedEnterpriseFields,
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        codename: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        parent_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'roles', key: 'id' },
        },
        hierarchy_level: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        is_system_role: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        max_users: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'roles',
        ...baseModelOptions,
        indexes: [
          { unique: true, fields: ['codename', 'company_id'] },
          { fields: ['name'] },
          { fields: ['company_id'] },
          { fields: ['parent_id'] },
          { fields: ['is_system_role'] },
          { fields: ['is_active'] },
        ],
      },
    );

    addSoftDeleteScope(Role);
    return Role;
  }
}
