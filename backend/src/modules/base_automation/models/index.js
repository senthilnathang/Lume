/**
 * Base Automation Models
 */

import { DataTypes } from 'sequelize';

export const WorkflowModel = (sequelize) => {
  const Workflow = sequelize.define('Workflow', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    states: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    transitions: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    initialState: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'initial_state'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'draft'),
      defaultValue: 'draft'
    }
  }, {
    tableName: 'automation_workflows',
    timestamps: true,
    underscored: true
  });

  return Workflow;
};

export const FlowModel = (sequelize) => {
  const Flow = sequelize.define('Flow', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    nodes: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    edges: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    trigger: {
      type: DataTypes.ENUM('on_create', 'on_update', 'on_delete', 'manual', 'scheduled'),
      defaultValue: 'manual'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'draft'),
      defaultValue: 'draft'
    }
  }, {
    tableName: 'automation_flows',
    timestamps: true,
    underscored: true
  });

  return Flow;
};

export const BusinessRuleModel = (sequelize) => {
  const BusinessRule = sequelize.define('BusinessRule', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    field: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    condition: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    action: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 10
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'automation_business_rules',
    timestamps: true,
    underscored: true
  });

  return BusinessRule;
};

export const ApprovalChainModel = (sequelize) => {
  const ApprovalChain = sequelize.define('ApprovalChain', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    steps: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    condition: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'automation_approval_chains',
    timestamps: true,
    underscored: true
  });

  return ApprovalChain;
};

export const ScheduledActionModel = (sequelize) => {
  const ScheduledAction = sequelize.define('ScheduledAction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    actionType: {
      type: DataTypes.ENUM('code', 'email', 'webhook', 'field_update'),
      defaultValue: 'code',
      field: 'action_type'
    },
    config: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    cronExpression: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'cron_expression'
    },
    interval: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    intervalUnit: {
      type: DataTypes.ENUM('minutes', 'hours', 'days', 'weeks', 'months'),
      defaultValue: 'hours',
      field: 'interval_unit'
    },
    lastRunAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_run_at'
    },
    nextRunAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'next_run_at'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'error'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'automation_scheduled_actions',
    timestamps: true,
    underscored: true
  });

  return ScheduledAction;
};

export const ValidationRuleModel = (sequelize) => {
  const ValidationRule = sequelize.define('ValidationRule', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    field: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ruleType: {
      type: DataTypes.ENUM('required', 'format', 'range', 'unique', 'custom', 'regex'),
      defaultValue: 'required',
      field: 'rule_type'
    },
    config: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    errorMessage: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'error_message'
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 10
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'automation_validation_rules',
    timestamps: true,
    underscored: true
  });

  return ValidationRule;
};

export const AssignmentRuleModel = (sequelize) => {
  const AssignmentRule = sequelize.define('AssignmentRule', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    assignTo: {
      type: DataTypes.ENUM('user', 'role', 'group', 'round_robin'),
      defaultValue: 'user',
      field: 'assign_to'
    },
    assigneeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'assignee_id'
    },
    condition: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 10
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'automation_assignment_rules',
    timestamps: true,
    underscored: true
  });

  return AssignmentRule;
};

export const RollupFieldModel = (sequelize) => {
  const RollupField = sequelize.define('RollupField', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    parentModel: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'parent_model'
    },
    childModel: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'child_model'
    },
    rollupField: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'rollup_field'
    },
    targetField: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'target_field'
    },
    operation: {
      type: DataTypes.ENUM('sum', 'count', 'avg', 'min', 'max'),
      defaultValue: 'sum'
    },
    filterCondition: {
      type: DataTypes.JSON,
      defaultValue: {},
      field: 'filter_condition'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'automation_rollup_fields',
    timestamps: true,
    underscored: true
  });

  return RollupField;
};

export default {
  WorkflowModel,
  FlowModel,
  BusinessRuleModel,
  ApprovalChainModel,
  ScheduledActionModel,
  ValidationRuleModel,
  AssignmentRuleModel,
  RollupFieldModel
};
