import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * Business Rule — condition-based rule execution.
 */
export class BusinessRule extends Model {
  declare id: number;
  declare name: string;
  declare code: string;
  declare description: string | null;
  declare model_name: string;
  declare trigger_type: string;
  declare trigger_fields: object;
  declare conditions: object;
  declare logical_operator: string;
  declare actions: object;
  declare error_handling: string;
  declare priority: number;
  declare is_active: boolean;
  declare run_count: number;
  declare last_run_at: Date | null;
  declare company_id: number | null;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    BusinessRule.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        description: { type: DataTypes.TEXT, allowNull: true },
        model_name: { type: DataTypes.STRING(255), allowNull: false },
        trigger_type: {
          type: DataTypes.ENUM(
            'before_create', 'after_create', 'before_update', 'after_update',
            'before_delete', 'after_delete', 'on_status_change', 'on_field_change',
            'scheduled', 'manual', 'api',
          ),
          allowNull: false,
        },
        trigger_fields: { type: DataTypes.JSON, defaultValue: [] },
        conditions: { type: DataTypes.JSON, defaultValue: [] },
        logical_operator: {
          type: DataTypes.ENUM('and', 'or'),
          defaultValue: 'and',
        },
        actions: { type: DataTypes.JSON, defaultValue: [] },
        error_handling: {
          type: DataTypes.ENUM('continue', 'stop', 'rollback'),
          defaultValue: 'stop',
        },
        priority: { type: DataTypes.INTEGER, defaultValue: 0 },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        run_count: { type: DataTypes.INTEGER, defaultValue: 0 },
        last_run_at: { type: DataTypes.DATE, allowNull: true },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
      },
      {
        sequelize,
        tableName: 'base_business_rules',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { fields: ['model_name', 'trigger_type'] },
          { fields: ['is_active', 'priority'] },
          { fields: ['company_id'] },
        ],
      },
    );
  }
}

/**
 * Rule Execution Log — audit trail for rule executions.
 */
export class RuleExecutionLog extends Model {
  declare id: number;
  declare rule_id: number;
  declare record_id: number;
  declare model_name: string;
  declare trigger_type: string;
  declare conditions_met: boolean;
  declare actions_executed: object;
  declare success: boolean;
  declare error_message: string | null;
  declare execution_time_ms: number | null;
  declare user_id: number | null;
  declare created_at: Date;

  static initModel(sequelize: Sequelize) {
    RuleExecutionLog.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        rule_id: { type: DataTypes.INTEGER, allowNull: false },
        record_id: { type: DataTypes.INTEGER, allowNull: false },
        model_name: { type: DataTypes.STRING(255), allowNull: false },
        trigger_type: { type: DataTypes.STRING(50), allowNull: false },
        conditions_met: { type: DataTypes.BOOLEAN, defaultValue: false },
        actions_executed: { type: DataTypes.JSON, defaultValue: [] },
        success: { type: DataTypes.BOOLEAN, defaultValue: true },
        error_message: { type: DataTypes.TEXT, allowNull: true },
        execution_time_ms: { type: DataTypes.INTEGER, allowNull: true },
        user_id: { type: DataTypes.INTEGER, allowNull: true },
      },
      {
        sequelize,
        tableName: 'base_rule_execution_logs',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
          { fields: ['rule_id'] },
          { fields: ['model_name', 'record_id'] },
          { fields: ['created_at'] },
        ],
      },
    );
  }
}
