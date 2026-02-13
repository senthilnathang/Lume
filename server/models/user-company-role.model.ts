import { Model, DataTypes, Sequelize } from 'sequelize';
import {
  enterpriseModelFields,
  baseModelOptions,
  addSoftDeleteScope,
} from './base.model';

export interface UserCompanyRoleAttributes {
  id: number;
  user_id: number;
  company_id: number;
  role_id: number;
  is_active: boolean;
  is_default: boolean;
  assigned_at: Date;
  assigned_by: number | null;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class UserCompanyRole extends Model<UserCompanyRoleAttributes> {
  declare id: number;
  declare user_id: number;
  declare company_id: number;
  declare role_id: number;
  declare is_active: boolean;
  declare is_default: boolean;
  declare assigned_at: Date;
  declare assigned_by: number | null;
  declare expires_at: Date | null;

  static initModel(sequelize: Sequelize): typeof UserCompanyRole {
    UserCompanyRole.init(
      {
        ...enterpriseModelFields,
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
        },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'companies', key: 'id' },
          onDelete: 'CASCADE',
        },
        role_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'roles', key: 'id' },
          onDelete: 'CASCADE',
        },
        is_default: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        assigned_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        assigned_by: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
        },
        expires_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'user_company_roles',
        ...baseModelOptions,
        indexes: [
          { unique: true, fields: ['user_id', 'company_id', 'role_id'] },
          { fields: ['user_id'] },
          { fields: ['company_id'] },
          { fields: ['role_id'] },
          { fields: ['is_active'] },
          { fields: ['is_default'] },
        ],
      },
    );

    addSoftDeleteScope(UserCompanyRole);
    return UserCompanyRole;
  }
}
