import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * Sharing Rule — automatic record sharing based on ownership or criteria.
 */
export class SharingRule extends Model {
  declare id: number;
  declare name: string;
  declare description: string | null;
  declare model_name: string;
  declare rule_type: string;
  declare access_level: string;
  declare source_role_id: number | null;
  declare source_group_id: number | null;
  declare target_role_id: number | null;
  declare target_group_id: number | null;
  declare criteria_domain: object | null;
  declare is_active: boolean;
  declare company_id: number | null;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    SharingRule.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        model_name: { type: DataTypes.STRING(255), allowNull: false },
        rule_type: {
          type: DataTypes.ENUM('ownership_based', 'criteria_based'),
          allowNull: false,
          defaultValue: 'ownership_based',
        },
        access_level: {
          type: DataTypes.ENUM('read', 'read_write'),
          allowNull: false,
          defaultValue: 'read',
        },
        source_role_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'roles', key: 'id' },
        },
        source_group_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'groups', key: 'id' },
        },
        target_role_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'roles', key: 'id' },
        },
        target_group_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'groups', key: 'id' },
        },
        criteria_domain: { type: DataTypes.JSON, allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
      },
      {
        sequelize,
        tableName: 'security_sharing_rules',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { fields: ['model_name'] },
          { fields: ['company_id'] },
        ],
      },
    );
  }
}
