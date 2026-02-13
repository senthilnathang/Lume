import { Model, DataTypes, Sequelize } from 'sequelize';
import {
  companyScopedEnterpriseFields,
  baseModelOptions,
  addSoftDeleteScope,
} from './base.model';

export interface GroupAttributes {
  id: number;
  name: string;
  codename: string;
  description: string | null;
  company_id: number | null;
  parent_id: number | null;
  is_active: boolean;
  max_members: number | null;
  created_at: Date;
  updated_at: Date;
}

export class Group extends Model<GroupAttributes> {
  declare id: number;
  declare name: string;
  declare codename: string;
  declare description: string | null;
  declare company_id: number | null;
  declare parent_id: number | null;
  declare is_active: boolean;
  declare max_members: number | null;

  static initModel(sequelize: Sequelize): typeof Group {
    Group.init(
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
          references: { model: 'groups', key: 'id' },
        },
        max_members: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'groups',
        ...baseModelOptions,
        indexes: [
          { unique: true, fields: ['codename', 'company_id'] },
          { fields: ['name'] },
          { fields: ['company_id'] },
          { fields: ['parent_id'] },
          { fields: ['is_active'] },
        ],
      },
    );

    addSoftDeleteScope(Group);
    return Group;
  }
}
