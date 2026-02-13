import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * Flow — visual workflow with triggers, nodes, and edges (Flow Designer).
 */
export class Flow extends Model {
  declare id: number;
  declare name: string;
  declare code: string;
  declare description: string | null;
  declare trigger_type: string;
  declare trigger_config: object;
  declare nodes: object;
  declare edges: object;
  declare variables: object;
  declare version: number;
  declare status: string;
  declare run_count: number;
  declare last_run_at: Date | null;
  declare is_active: boolean;
  declare company_id: number | null;
  declare created_by: number | null;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    Flow.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        description: { type: DataTypes.TEXT, allowNull: true },
        trigger_type: {
          type: DataTypes.ENUM(
            'record_create', 'record_update', 'record_delete',
            'schedule', 'api', 'subflow', 'approval', 'manual',
          ),
          allowNull: false,
        },
        trigger_config: { type: DataTypes.JSON, defaultValue: {} },
        nodes: { type: DataTypes.JSON, defaultValue: [] },
        edges: { type: DataTypes.JSON, defaultValue: [] },
        variables: { type: DataTypes.JSON, defaultValue: {} },
        version: { type: DataTypes.INTEGER, defaultValue: 1 },
        status: {
          type: DataTypes.ENUM('draft', 'active', 'inactive', 'archived'),
          defaultValue: 'draft',
        },
        run_count: { type: DataTypes.INTEGER, defaultValue: 0 },
        last_run_at: { type: DataTypes.DATE, allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: false },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
        created_by: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
        },
      },
      {
        sequelize,
        tableName: 'base_flows',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { fields: ['trigger_type'] },
          { fields: ['status'] },
          { fields: ['company_id'] },
        ],
      },
    );
  }
}

/**
 * Flow Version — version history snapshot.
 */
export class FlowVersion extends Model {
  declare id: number;
  declare flow_id: number;
  declare version: number;
  declare nodes: object;
  declare edges: object;
  declare variables: object;
  declare change_summary: string | null;
  declare created_by: number | null;
  declare created_at: Date;

  static initModel(sequelize: Sequelize) {
    FlowVersion.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        flow_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'base_flows', key: 'id' },
        },
        version: { type: DataTypes.INTEGER, allowNull: false },
        nodes: { type: DataTypes.JSON, defaultValue: [] },
        edges: { type: DataTypes.JSON, defaultValue: [] },
        variables: { type: DataTypes.JSON, defaultValue: {} },
        change_summary: { type: DataTypes.TEXT, allowNull: true },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
      },
      {
        sequelize,
        tableName: 'base_flow_versions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
          { unique: true, fields: ['flow_id', 'version'] },
        ],
      },
    );
  }
}

/**
 * Flow Execution — individual execution instance.
 */
export class FlowExecution extends Model {
  declare id: number;
  declare flow_id: number;
  declare flow_version: number;
  declare status: string;
  declare trigger_data: object;
  declare variables: object;
  declare current_node_id: string | null;
  declare started_at: Date;
  declare completed_at: Date | null;
  declare error_message: string | null;
  declare execution_time_ms: number | null;
  declare triggered_by: number | null;

  static initModel(sequelize: Sequelize) {
    FlowExecution.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        flow_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'base_flows', key: 'id' },
        },
        flow_version: { type: DataTypes.INTEGER, allowNull: false },
        status: {
          type: DataTypes.ENUM('running', 'completed', 'failed', 'waiting', 'cancelled'),
          defaultValue: 'running',
        },
        trigger_data: { type: DataTypes.JSON, defaultValue: {} },
        variables: { type: DataTypes.JSON, defaultValue: {} },
        current_node_id: { type: DataTypes.STRING(100), allowNull: true },
        started_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        completed_at: { type: DataTypes.DATE, allowNull: true },
        error_message: { type: DataTypes.TEXT, allowNull: true },
        execution_time_ms: { type: DataTypes.INTEGER, allowNull: true },
        triggered_by: { type: DataTypes.INTEGER, allowNull: true },
      },
      {
        sequelize,
        tableName: 'base_flow_executions',
        timestamps: false,
        indexes: [
          { fields: ['flow_id', 'status'] },
          { fields: ['started_at'] },
        ],
      },
    );
  }
}
