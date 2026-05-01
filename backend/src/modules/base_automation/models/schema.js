import { table, int, integer, varchar, text, json, timestamp } from '../../../core/db/dialect.js';
import { baseColumns } from '../../../core/db/drizzle-helpers.js';

const idCol = int || integer;

export const automationWorkflows = table('automation_workflows', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  description: text('description'),
  states: json('states').$type().default([]),
  transitions: json('transitions').$type().default([]),
  initialState: varchar('initial_state', { length: 50 }),
  status: varchar('status', { length: 20 }).default('draft'),
});

export const automationFlows = table('automation_flows', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  description: text('description'),
  nodes: json('nodes').$type().default([]),
  edges: json('edges').$type().default([]),
  trigger: varchar('trigger', { length: 20 }).default('manual'),
  status: varchar('status', { length: 20 }).default('draft'),
});

export const automationBusinessRules = table('automation_business_rules', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  field: varchar('field', { length: 100 }).notNull(),
  description: text('description'),
  condition: json('condition').$type().default({}),
  action: json('action').$type().default({}),
  priority: idCol('priority').default(10),
  status: varchar('status', { length: 20 }).default('active'),
});

export const automationApprovalChains = table('automation_approval_chains', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  description: text('description'),
  steps: json('steps').$type().default([]),
  condition: json('condition').$type().default({}),
  status: varchar('status', { length: 20 }).default('active'),
});

export const automationScheduledActions = table('automation_scheduled_actions', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }),
  description: text('description'),
  actionType: varchar('action_type', { length: 20 }).default('code'),
  config: json('config').$type().default({}),
  cronExpression: varchar('cron_expression', { length: 100 }),
  interval: idCol('interval'),
  intervalUnit: varchar('interval_unit', { length: 20 }).default('hours'),
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  status: varchar('status', { length: 20 }).default('active'),
});

export const automationValidationRules = table('automation_validation_rules', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  field: varchar('field', { length: 100 }),
  description: text('description'),
  ruleType: varchar('rule_type', { length: 20 }).default('required'),
  config: json('config').$type().default({}),
  errorMessage: varchar('error_message', { length: 255 }),
  priority: idCol('priority').default(10),
  status: varchar('status', { length: 20 }).default('active'),
});

export const automationAssignmentRules = table('automation_assignment_rules', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  description: text('description'),
  assignTo: varchar('assign_to', { length: 20 }).default('user'),
  assigneeId: idCol('assignee_id'),
  condition: json('condition').$type().default({}),
  priority: idCol('priority').default(10),
  status: varchar('status', { length: 20 }).default('active'),
});

export const automationRollupFields = table('automation_rollup_fields', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  parentModel: varchar('parent_model', { length: 100 }).notNull(),
  childModel: varchar('child_model', { length: 100 }).notNull(),
  rollupField: varchar('rollup_field', { length: 100 }).notNull(),
  targetField: varchar('target_field', { length: 100 }).notNull(),
  operation: varchar('operation', { length: 20 }).default('sum'),
  filterCondition: json('filter_condition').$type().default({}),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('active'),
});

// Phase 8: Workflow Execution
export const automationWorkflowExecutions = table('automation_workflow_executions', {
  ...baseColumns(),
  workflowId: idCol('workflow_id').notNull(),
  recordId: varchar('record_id', { length: 100 }),
  currentState: varchar('current_state', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).default('active'), // active, completed, rejected, aborted
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  executionData: json('execution_data').$type().default({}),
});

export const automationWorkflowExecutionHistory = table('automation_workflow_execution_history', {
  ...baseColumns(),
  executionId: idCol('execution_id').notNull(),
  fromState: varchar('from_state', { length: 100 }),
  toState: varchar('to_state', { length: 100 }).notNull(),
  transitionName: varchar('transition_name', { length: 100 }),
  transitionedAt: timestamp('transitioned_at').notNull().defaultNow(),
  userId: idCol('user_id'),
  metadata: json('metadata').$type().default({}),
});
