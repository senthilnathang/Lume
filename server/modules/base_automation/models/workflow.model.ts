import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * Workflow Definition — state machine for a model with states and transitions.
 */
export class WorkflowDefinition extends Model {
  declare id: number;
  declare name: string;
  declare code: string;
  declare description: string | null;
  declare model_name: string;
  declare states: object;
  declare default_state: string;
  declare is_active: boolean;
  declare company_id: number | null;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    WorkflowDefinition.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        description: { type: DataTypes.TEXT, allowNull: true },
        model_name: { type: DataTypes.STRING(255), allowNull: false },
        states: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
        default_state: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'draft' },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
      },
      {
        sequelize,
        tableName: 'base_workflow_definitions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [{ fields: ['model_name'] }, { fields: ['company_id'] }],
      },
    );
  }
}

/**
 * Workflow Transition — allowed state transitions with conditions/actions.
 */
export class WorkflowTransition extends Model {
  declare id: number;
  declare workflow_id: number;
  declare name: string;
  declare from_state: string;
  declare to_state: string;
  declare conditions: object;
  declare actions: object;
  declare required_groups: object;
  declare require_approval: boolean;
  declare approval_chain_id: number | null;
  declare sla_hours: number | null;
  declare sla_breach_action: string | null;
  declare webhook_url: string | null;
  declare priority: number;
  declare is_active: boolean;

  static initModel(sequelize: Sequelize) {
    WorkflowTransition.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        workflow_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'base_workflow_definitions', key: 'id' },
        },
        name: { type: DataTypes.STRING(255), allowNull: false },
        from_state: { type: DataTypes.STRING(100), allowNull: false },
        to_state: { type: DataTypes.STRING(100), allowNull: false },
        conditions: { type: DataTypes.JSON, defaultValue: [] },
        actions: { type: DataTypes.JSON, defaultValue: [] },
        required_groups: { type: DataTypes.JSON, defaultValue: [] },
        require_approval: { type: DataTypes.BOOLEAN, defaultValue: false },
        approval_chain_id: { type: DataTypes.INTEGER, allowNull: true },
        sla_hours: { type: DataTypes.FLOAT, allowNull: true },
        sla_breach_action: {
          type: DataTypes.ENUM('notify', 'escalate', 'auto_transition'),
          allowNull: true,
        },
        webhook_url: { type: DataTypes.STRING(500), allowNull: true },
        priority: { type: DataTypes.INTEGER, defaultValue: 0 },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      },
      {
        sequelize,
        tableName: 'base_workflow_transitions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { fields: ['workflow_id', 'from_state'] },
        ],
      },
    );
  }
}

/**
 * Workflow State — current state of a record in a workflow.
 */
export class WorkflowState extends Model {
  declare id: number;
  declare workflow_id: number;
  declare record_id: number;
  declare current_state: string;
  declare previous_state: string | null;
  declare state_entered_at: Date;
  declare sla_deadline: Date | null;
  declare sla_breached: boolean;
  declare assigned_to: number | null;
  declare metadata: object;

  static initModel(sequelize: Sequelize) {
    WorkflowState.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        workflow_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'base_workflow_definitions', key: 'id' },
        },
        record_id: { type: DataTypes.INTEGER, allowNull: false },
        current_state: { type: DataTypes.STRING(100), allowNull: false },
        previous_state: { type: DataTypes.STRING(100), allowNull: true },
        state_entered_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        sla_deadline: { type: DataTypes.DATE, allowNull: true },
        sla_breached: { type: DataTypes.BOOLEAN, defaultValue: false },
        assigned_to: { type: DataTypes.INTEGER, allowNull: true },
        metadata: { type: DataTypes.JSON, defaultValue: {} },
      },
      {
        sequelize,
        tableName: 'base_workflow_states',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { unique: true, fields: ['workflow_id', 'record_id'] },
          { fields: ['current_state'] },
        ],
      },
    );
  }
}

/**
 * Workflow Activity — audit log for workflow transitions.
 */
export class WorkflowActivity extends Model {
  declare id: number;
  declare workflow_id: number;
  declare record_id: number;
  declare transition_id: number | null;
  declare from_state: string;
  declare to_state: string;
  declare user_id: number;
  declare comment: string | null;
  declare metadata: object;
  declare created_at: Date;

  static initModel(sequelize: Sequelize) {
    WorkflowActivity.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        workflow_id: { type: DataTypes.INTEGER, allowNull: false },
        record_id: { type: DataTypes.INTEGER, allowNull: false },
        transition_id: { type: DataTypes.INTEGER, allowNull: true },
        from_state: { type: DataTypes.STRING(100), allowNull: false },
        to_state: { type: DataTypes.STRING(100), allowNull: false },
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        comment: { type: DataTypes.TEXT, allowNull: true },
        metadata: { type: DataTypes.JSON, defaultValue: {} },
      },
      {
        sequelize,
        tableName: 'base_workflow_activities',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
          { fields: ['workflow_id', 'record_id'] },
          { fields: ['user_id'] },
        ],
      },
    );
  }
}
