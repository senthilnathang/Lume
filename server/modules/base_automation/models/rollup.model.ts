import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * Rollup Field — aggregate values from child records (like Salesforce Roll-Up Summary).
 */
export class RollupField extends Model {
  declare id: number;
  declare name: string;
  declare code: string | null;
  declare description: string | null;
  declare parent_model: string;
  declare parent_field: string;
  declare child_model: string;
  declare child_fk_field: string;
  declare aggregation: string;
  declare source_field: string | null;
  declare filter_domain: object;
  declare refresh_mode: string;
  declare last_computed_at: Date | null;
  declare default_value: number | null;
  declare is_active: boolean;
  declare company_id: number | null;
  declare module_name: string | null;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    RollupField.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        code: { type: DataTypes.STRING(100), allowNull: true, unique: true },
        description: { type: DataTypes.TEXT, allowNull: true },
        parent_model: { type: DataTypes.STRING(255), allowNull: false },
        parent_field: { type: DataTypes.STRING(255), allowNull: false },
        child_model: { type: DataTypes.STRING(255), allowNull: false },
        child_fk_field: { type: DataTypes.STRING(255), allowNull: false },
        aggregation: {
          type: DataTypes.ENUM('SUM', 'COUNT', 'AVG', 'MIN', 'MAX', 'COUNT_DISTINCT'),
          allowNull: false,
          defaultValue: 'SUM',
        },
        source_field: { type: DataTypes.STRING(255), allowNull: true },
        filter_domain: { type: DataTypes.JSON, defaultValue: [] },
        refresh_mode: {
          type: DataTypes.ENUM('realtime', 'hourly', 'daily', 'manual'),
          defaultValue: 'realtime',
        },
        last_computed_at: { type: DataTypes.DATE, allowNull: true },
        default_value: { type: DataTypes.FLOAT, allowNull: true, defaultValue: 0 },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        company_id: { type: DataTypes.INTEGER, allowNull: true },
        module_name: { type: DataTypes.STRING(100), allowNull: true },
      },
      {
        sequelize,
        tableName: 'base_rollup_fields',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { fields: ['parent_model'] },
          { fields: ['child_model'] },
          { fields: ['is_active'] },
        ],
      },
    );
  }
}

/**
 * Rollup Compute Log — tracks computation events for audit.
 */
export class RollupComputeLog extends Model {
  declare id: number;
  declare rollup_id: number;
  declare parent_record_id: number;
  declare old_value: string | null;
  declare new_value: string | null;
  declare execution_time_ms: number | null;
  declare success: boolean | null;
  declare error_message: string | null;
  declare trigger_source: string | null;
  declare trigger_record_id: number | null;
  declare computed_at: Date;

  static initModel(sequelize: Sequelize) {
    RollupComputeLog.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        rollup_id: { type: DataTypes.INTEGER, allowNull: false },
        parent_record_id: { type: DataTypes.INTEGER, allowNull: false },
        old_value: { type: DataTypes.TEXT, allowNull: true },
        new_value: { type: DataTypes.TEXT, allowNull: true },
        execution_time_ms: { type: DataTypes.INTEGER, allowNull: true },
        success: { type: DataTypes.BOOLEAN, allowNull: true },
        error_message: { type: DataTypes.TEXT, allowNull: true },
        trigger_source: { type: DataTypes.STRING(50), allowNull: true },
        trigger_record_id: { type: DataTypes.INTEGER, allowNull: true },
        computed_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      },
      {
        sequelize,
        tableName: 'base_rollup_compute_logs',
        timestamps: false,
        indexes: [
          { fields: ['rollup_id', 'computed_at'] },
        ],
      },
    );
  }
}
