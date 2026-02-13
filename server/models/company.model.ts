import { Model, DataTypes, Sequelize } from 'sequelize';
import {
  enterpriseModelFields,
  baseModelOptions,
  addSoftDeleteScope,
} from './base.model';

export interface CompanyAttributes {
  id: number;
  name: string;
  code: string;
  description: string | null;
  parent_company_id: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  tax_id: string | null;
  registration_number: string | null;
  date_format: string;
  time_format: string;
  timezone: string;
  currency: string;
  logo_url: string | null;
  is_active: boolean;
  is_headquarters: boolean;
  created_at: Date;
  updated_at: Date;
}

export class Company extends Model<CompanyAttributes> {
  declare id: number;
  declare name: string;
  declare code: string;
  declare description: string | null;
  declare parent_company_id: number | null;
  declare address: string | null;
  declare city: string | null;
  declare state: string | null;
  declare country: string | null;
  declare zip_code: string | null;
  declare phone: string | null;
  declare email: string | null;
  declare website: string | null;
  declare tax_id: string | null;
  declare registration_number: string | null;
  declare date_format: string;
  declare time_format: string;
  declare timezone: string;
  declare currency: string;
  declare logo_url: string | null;
  declare is_active: boolean;
  declare is_headquarters: boolean;

  static initModel(sequelize: Sequelize): typeof Company {
    Company.init(
      {
        ...enterpriseModelFields,
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        code: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        parent_company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
        address: { type: DataTypes.STRING(500), allowNull: true },
        city: { type: DataTypes.STRING(100), allowNull: true },
        state: { type: DataTypes.STRING(100), allowNull: true },
        country: { type: DataTypes.STRING(100), allowNull: true },
        zip_code: { type: DataTypes.STRING(20), allowNull: true },
        phone: { type: DataTypes.STRING(50), allowNull: true },
        email: { type: DataTypes.STRING(255), allowNull: true },
        website: { type: DataTypes.STRING(500), allowNull: true },
        tax_id: { type: DataTypes.STRING(100), allowNull: true },
        registration_number: { type: DataTypes.STRING(100), allowNull: true },
        date_format: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: 'YYYY-MM-DD',
        },
        time_format: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: 'HH:mm:ss',
        },
        timezone: {
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: 'UTC',
        },
        currency: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: 'USD',
        },
        logo_url: { type: DataTypes.STRING(500), allowNull: true },
        is_headquarters: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      {
        sequelize,
        tableName: 'companies',
        ...baseModelOptions,
        indexes: [
          { unique: true, fields: ['code'] },
          { fields: ['name'] },
          { fields: ['parent_company_id'] },
          { fields: ['is_active'] },
        ],
      },
    );

    addSoftDeleteScope(Company);
    return Company;
  }
}
