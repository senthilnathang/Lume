import { Model, DataTypes, Sequelize } from 'sequelize';
import { timestampFields, baseModelOptions } from './base.model';

export interface ModelAccessAttributes {
  id: number;
  name: string;
  content_type_id: number;
  group_id: number | null;
  module: string | null;
  company_id: number | null;
  perm_read: boolean;
  perm_write: boolean;
  perm_create: boolean;
  perm_unlink: boolean;
  is_active: boolean;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export class ModelAccess extends Model<ModelAccessAttributes> {
  declare id: number;
  declare name: string;
  declare content_type_id: number;
  declare group_id: number | null;
  declare module: string | null;
  declare company_id: number | null;
  declare perm_read: boolean;
  declare perm_write: boolean;
  declare perm_create: boolean;
  declare perm_unlink: boolean;
  declare is_active: boolean;
  declare created_by: number | null;

  static initModel(sequelize: Sequelize): typeof ModelAccess {
    ModelAccess.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
        },
        content_type_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'content_types', key: 'id' },
        },
        group_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'groups', key: 'id' },
        },
        module: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
        perm_read: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        perm_write: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        perm_create: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        perm_unlink: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
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
        tableName: 'model_access',
        ...baseModelOptions,
        indexes: [
          { unique: true, fields: ['content_type_id', 'group_id', 'company_id'] },
          { fields: ['content_type_id'] },
          { fields: ['group_id'] },
          { fields: ['module'] },
          { fields: ['is_active'] },
        ],
      },
    );

    return ModelAccess;
  }
}
