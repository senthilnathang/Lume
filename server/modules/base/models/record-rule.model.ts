import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * RecordRule — domain-based access rules (like Odoo ir.rule).
 * Controls which records a user/group can access for a given model.
 */
export class RecordRule extends Model {
  declare id: number;
  declare name: string;
  declare model_name: string;
  declare domain_filter: object;
  declare global: boolean;
  declare group_ids: number[];
  declare perm_read: boolean;
  declare perm_write: boolean;
  declare perm_create: boolean;
  declare perm_unlink: boolean;
  declare is_active: boolean;
  declare company_id: number | null;
  declare module: string | null;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    RecordRule.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        model_name: { type: DataTypes.STRING(100), allowNull: false },
        domain_filter: { type: DataTypes.JSON, defaultValue: [] },
        global: { type: DataTypes.BOOLEAN, defaultValue: false },
        group_ids: { type: DataTypes.JSON, defaultValue: [] },
        perm_read: { type: DataTypes.BOOLEAN, defaultValue: true },
        perm_write: { type: DataTypes.BOOLEAN, defaultValue: true },
        perm_create: { type: DataTypes.BOOLEAN, defaultValue: true },
        perm_unlink: { type: DataTypes.BOOLEAN, defaultValue: true },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        company_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'companies', key: 'id' } },
        module: { type: DataTypes.STRING(100), allowNull: true },
      },
      {
        sequelize,
        tableName: 'record_rules',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { fields: ['model_name'] },
          { fields: ['is_active'] },
          { fields: ['module'] },
        ],
      },
    );
  }
}
