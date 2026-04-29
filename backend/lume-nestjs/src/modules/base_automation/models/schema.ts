import { table, int, integer, varchar, text, json, timestamp } from '@core/db/dialect';
import { baseColumns } from '@core/db/drizzle-helpers';

const idCol = int || integer;

export const automationWorkflows = table('automation_workflows', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  description: text('description'),
  states: json('states').$type<any[]>().default([]),
  transitions: json('transitions').$type<any[]>().default([]),
  initialState: varchar('initial_state', { length: 50 }),
  status: varchar('status', { length: 20 }).default('draft'),
});

export const automationFlows = table('automation_flows', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  description: text('description'),
  nodes: json('nodes').$type<any[]>().default([]),
  edges: json('edges').$type<any[]>().default([]),
  trigger: varchar('trigger', { length: 20 }).default('manual'),
  status: varchar('status', { length: 20 }).default('draft'),
});

export const automationBusinessRules = table('automation_business_rules', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  field: varchar('field', { length: 100 }).notNull(),
  description: text('description'),
  condition: json('condition').$type<any>().default({}),
  action: json('action').$type<any>().default({}),
  priority: idCol('priority').default(10),
  status: varchar('status', { length: 20 }).default('active'),
});

export const automationApprovalChains = table('automation_approval_chains', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  description: text('description'),
  steps: json('steps').$type<any[]>().default([]),
  condition: json('condition').$type<any>().default({}),
  status: varchar('status', { length: 20 }).default('active'),
});

export const automationScheduledActions = table('automation_scheduled_actions', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }),
  description: text('description'),
  actionType: varchar('action_type', { length: 20 }).default('code'),
  config: json('config').$type<any>().default({}),
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
  config: json('config').$type<any>().default({}),
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
  condition: json('condition').$type<any>().default({}),
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
  filterCondition: json('filter_condition').$type<any>().default({}),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('active'),
});
