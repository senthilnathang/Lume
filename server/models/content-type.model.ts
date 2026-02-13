import { Model, DataTypes, Sequelize } from 'sequelize';
import { timestampFields, baseModelOptions } from './base.model';

export interface ContentTypeAttributes {
  id: number;
  app_label: string;
  model: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export class ContentType extends Model<ContentTypeAttributes> {
  declare id: number;
  declare app_label: string;
  declare model: string;
  declare name: string;

  static initModel(sequelize: Sequelize): typeof ContentType {
    ContentType.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        app_label: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        model: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        ...timestampFields,
      },
      {
        sequelize,
        tableName: 'content_types',
        ...baseModelOptions,
        indexes: [
          { unique: true, fields: ['app_label', 'model'] },
          { fields: ['app_label'] },
        ],
      },
    );

    return ContentType;
  }
}
