import { mysqlTable, int, varchar, text, json, timestamp, mysqlEnum } from 'drizzle-orm/mysql-core';
import { baseColumns } from '../../../core/db/drizzle-helpers.js';

export const automationWorkflows = mysqlTable('automation_workflows', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  description: text('description'),
  states: json('states').$type().default([]),
  transitions: json('transitions').$type().default([]),
  initialState: varchar('initial_state', { length: 50 }),
  status: mysqlEnum('status', ['active', 'inactive', 'draft']).default('draft'),
});

export const automationFlows = mysqlTable('automation_flows', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  description: text('description'),
  nodes: json('nodes').$type().default([]),
  edges: json('edges').$type().default([]),
  trigger: mysqlEnum('trigger', ['on_create', 'on_update', 'on_delete', 'manual', 'scheduled']).default('manual'),
  status: mysqlEnum('status', ['active', 'inactive', 'draft']).default('draft'),
});

export const automationBusinessRules = mysqlTable('automation_business_rules', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  field: varchar('field', { length: 100 }).notNull(),
  description: text('description'),
  condition: json('condition').$type().default({}),
  action: json('action').$type().default({}),
  priority: int('priority').default(10),
  status: mysqlEnum('status', ['active', 'inactive']).default('active'),
});

export const automationApprovalChains = mysqlTable('automation_approval_chains', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  description: text('description'),
  steps: json('steps').$type().default([]),
  condition: json('condition').$type().default({}),
  status: mysqlEnum('status', ['active', 'inactive']).default('active'),
});

export const automationScheduledActions = mysqlTable('automation_scheduled_actions', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }),
  description: text('description'),
  actionType: mysqlEnum('action_type', ['code', 'email', 'webhook', 'field_update']).default('code'),
  config: json('config').$type().default({}),
  cronExpression: varchar('cron_expression', { length: 100 }),
  interval: int('interval'),
  intervalUnit: mysqlEnum('interval_unit', ['minutes', 'hours', 'days', 'weeks', 'months']).default('hours'),
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  status: mysqlEnum('status', ['active', 'inactive', 'error']).default('active'),
});

export const automationValidationRules = mysqlTable('automation_validation_rules', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  field: varchar('field', { length: 100 }),
  description: text('description'),
  ruleType: mysqlEnum('rule_type', ['required', 'format', 'range', 'unique', 'custom', 'regex']).default('required'),
  config: json('config').$type().default({}),
  errorMessage: varchar('error_message', { length: 255 }),
  priority: int('priority').default(10),
  status: mysqlEnum('status', ['active', 'inactive']).default('active'),
});

export const automationAssignmentRules = mysqlTable('automation_assignment_rules', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  description: text('description'),
  assignTo: mysqlEnum('assign_to', ['user', 'role', 'group', 'round_robin']).default('user'),
  assigneeId: int('assignee_id'),
  condition: json('condition').$type().default({}),
  priority: int('priority').default(10),
  status: mysqlEnum('status', ['active', 'inactive']).default('active'),
});

export const automationRollupFields = mysqlTable('automation_rollup_fields', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  parentModel: varchar('parent_model', { length: 100 }).notNull(),
  childModel: varchar('child_model', { length: 100 }).notNull(),
  rollupField: varchar('rollup_field', { length: 100 }).notNull(),
  targetField: varchar('target_field', { length: 100 }).notNull(),
  operation: mysqlEnum('operation', ['sum', 'count', 'avg', 'min', 'max']).default('sum'),
  filterCondition: json('filter_condition').$type().default({}),
  description: text('description'),
  status: mysqlEnum('status', ['active', 'inactive']).default('active'),
});
