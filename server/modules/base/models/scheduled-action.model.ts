import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * ScheduledAction — cron-like scheduled tasks (like Odoo ir.cron).
 */
export class ScheduledAction extends Model {
  declare id: number;
  declare name: string;
  declare code: string;
  declare model_name: string | null;
  declare method_name: string | null;
  declare cron_expression: string;
  declare interval_number: number;
  declare interval_type: string;
  declare next_run_at: Date | null;
  declare last_run_at: Date | null;
  declare last_run_status: string | null;
  declare last_run_error: string | null;
  declare last_run_duration_ms: number | null;
  declare run_count: number;
  declare max_retries: number;
  declare retry_count: number;
  declare is_active: boolean;
  declare priority: number;
  declare company_id: number | null;
  declare module: string | null;
  declare metadata: object;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    ScheduledAction.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        model_name: { type: DataTypes.STRING(100), allowNull: true },
        method_name: { type: DataTypes.STRING(100), allowNull: true },
        cron_expression: { type: DataTypes.STRING(100), allowNull: true },
        interval_number: { type: DataTypes.INTEGER, defaultValue: 1 },
        interval_type: { type: DataTypes.ENUM('minutes', 'hours', 'days', 'weeks', 'months'), defaultValue: 'days' },
        next_run_at: { type: DataTypes.DATE, allowNull: true },
        last_run_at: { type: DataTypes.DATE, allowNull: true },
        last_run_status: { type: DataTypes.ENUM('success', 'error', 'timeout', 'skipped'), allowNull: true },
        last_run_error: { type: DataTypes.TEXT, allowNull: true },
        last_run_duration_ms: { type: DataTypes.INTEGER, allowNull: true },
        run_count: { type: DataTypes.INTEGER, defaultValue: 0 },
        max_retries: { type: DataTypes.INTEGER, defaultValue: 3 },
        retry_count: { type: DataTypes.INTEGER, defaultValue: 0 },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        priority: { type: DataTypes.INTEGER, defaultValue: 10 },
        company_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'companies', key: 'id' } },
        module: { type: DataTypes.STRING(100), allowNull: true },
        metadata: { type: DataTypes.JSON, defaultValue: {} },
      },
      {
        sequelize,
        tableName: 'scheduled_actions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { fields: ['code'], unique: true },
          { fields: ['is_active'] },
          { fields: ['next_run_at'] },
          { fields: ['module'] },
        ],
      },
    );
  }
}
