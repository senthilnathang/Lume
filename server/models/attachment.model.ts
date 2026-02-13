import { Model, DataTypes, Sequelize } from 'sequelize';
import { timestampFields, softDeleteFields, baseModelOptions } from './base.model';

export interface AttachmentAttributes {
  id: number;
  filename: string;
  original_filename: string;
  mime_type: string;
  size: number;
  hash: string | null;
  storage_key: string;
  storage_backend: string;
  attachable_type: string;
  attachable_id: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  thumbnail_key: string | null;
  is_public: boolean;
  user_id: number | null;
  company_id: number | null;
  is_deleted: boolean;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class Attachment extends Model<AttachmentAttributes> {
  declare id: number;
  declare filename: string;
  declare original_filename: string;
  declare mime_type: string;
  declare size: number;
  declare hash: string | null;
  declare storage_key: string;
  declare storage_backend: string;
  declare attachable_type: string;
  declare attachable_id: number;
  declare width: number | null;
  declare height: number | null;
  declare duration: number | null;
  declare thumbnail_key: string | null;
  declare is_public: boolean;
  declare user_id: number | null;
  declare company_id: number | null;

  static initModel(sequelize: Sequelize): typeof Attachment {
    Attachment.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        filename: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
        },
        original_filename: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        mime_type: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        size: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        hash: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        storage_key: {
          type: DataTypes.STRING(500),
          allowNull: false,
          unique: true,
        },
        storage_backend: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: 'local',
        },
        attachable_type: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        attachable_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        width: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        height: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        duration: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        thumbnail_key: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        is_public: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
        },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
        ...softDeleteFields,
        ...timestampFields,
      },
      {
        sequelize,
        tableName: 'attachments',
        ...baseModelOptions,
        indexes: [
          { fields: ['attachable_type', 'attachable_id'] },
          { fields: ['user_id', 'company_id'] },
          { fields: ['mime_type'] },
          { fields: ['is_deleted'] },
        ],
      },
    );

    return Attachment;
  }
}
