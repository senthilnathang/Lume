import { table, int, integer, varchar, text, json, timestamp, boolean } from '../../../core/db/dialect.js';
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

// Phase 8 Wave 4: Auto-Transitions
export const automationAutoTransitions = table('automation_auto_transitions', {
  ...baseColumns(),
  workflowId: idCol('workflow_id').notNull(),
  executionId: idCol('execution_id'),
  fromState: varchar('from_state', { length: 100 }).notNull(),
  toState: varchar('to_state', { length: 100 }).notNull(),
  triggerType: varchar('trigger_type', { length: 20 }).notNull(),
  delaySeconds: idCol('delay_seconds'),
  webhookUrl: varchar('webhook_url', { length: 500 }),
  conditionData: json('condition_data').$type(),
  scheduledFor: timestamp('scheduled_for'),
  executedAt: timestamp('executed_at'),
  status: varchar('status', { length: 20 }).default('pending'),
  businessHoursOnly: boolean('business_hours_only').default(false),
  timezone: varchar('timezone', { length: 100 }).default('UTC'),
});

// Phase 9 Wave 2: Workflow Webhooks
export const automationWorkflowWebhooks = table('automation_workflow_webhooks', {
  ...baseColumns(),
  workflowId: idCol('workflow_id').notNull(),
  url: varchar('url', { length: 500 }).notNull(),
  events: json('events').$type().default([]),
  secret: varchar('secret', { length: 255 }),
  headers: json('headers').$type().default({}),
  retryCount: idCol('retry_count').default(3),
  status: varchar('status', { length: 20 }).default('active'),
});

// Phase 10 Wave 5: Approval Routing
export const automationApprovalInstances = table('automation_approval_instances', {
  ...baseColumns(),
  chainId: idCol('chain_id').notNull(),
  executionId: idCol('execution_id'),
  entityType: varchar('entity_type', { length: 100 }),
  entityRef: varchar('entity_ref', { length: 100 }),
  currentStep: idCol('current_step').default(1),
  status: varchar('status', { length: 20 }).default('pending'),
  submittedBy: idCol('submitted_by'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});

export const automationApprovalTasks = table('automation_approval_tasks', {
  ...baseColumns(),
  instanceId: idCol('instance_id').notNull(),
  stepSequence: idCol('step_sequence').notNull(),
  stepName: varchar('step_name', { length: 100 }),
  assignedToUserId: idCol('assigned_to_user_id'),
  assignedToRole: varchar('assigned_to_role', { length: 100 }),
  approverType: varchar('approver_type', { length: 20 }).default('USER'),
  status: varchar('status', { length: 20 }).default('pending'),
  dueAt: timestamp('due_at'),
  decidedAt: timestamp('decided_at'),
  decidedBy: idCol('decided_by'),
  comments: text('comments'),
  delegatedTo: idCol('delegated_to'),
});

// Phase 10 Wave 6: Workflow Notifications
export const automationWorkflowNotificationSettings = table('automation_workflow_notification_settings', {
  ...baseColumns(),
  workflowId: idCol('workflow_id').notNull(),
  event: varchar('event', { length: 50 }).notNull(),
  channel: varchar('channel', { length: 20 }).notNull(),
  recipients: varchar('recipients', { length: 100 }).default('submitter'),
  slackWebhookUrl: varchar('slack_webhook_url', { length: 500 }),
  emailTemplate: varchar('email_template', { length: 100 }).default('workflow-state-change'),
  status: varchar('status', { length: 20 }).default('active'),
});

// Phase 11 Wave 1: Approval Link Tracking
export const automationWorkflowApprovalLinks = table('automation_workflow_approval_links', {
  ...baseColumns(),
  executionId: idCol('execution_id').notNull(),
  approvalInstanceId: idCol('approval_instance_id').notNull(),
  actionType: varchar('action_type', { length: 50 }).default('request_approval'),
  onApproveState: varchar('on_approve_state', { length: 50 }),
  onRejectState: varchar('on_reject_state', { length: 50 }),
  status: varchar('status', { length: 20 }).default('pending'),
  metadata: json('metadata').$type().default({})
});

// Phase 11 Wave 2: Approval Escalation Tracking
export const automationApprovalEscalations = table('automation_approval_escalations', {
  ...baseColumns(),
  taskId: idCol('task_id').notNull(),
  instanceId: idCol('instance_id').notNull(),
  escalatedFrom: idCol('escalated_from').notNull(),
  escalatedTo: idCol('escalated_to').notNull(),
  reason: varchar('reason', { length: 50 }).default('sla_breach'),
  escalatedAt: timestamp('escalated_at').notNull().defaultNow(),
  hoursOverdue: int('hours_overdue'),
  notificationSent: boolean('notification_sent').default(false),
  metadata: json('metadata').$type().default({})
});

// Phase 11 Wave 3: Escalation Chain Configuration
export const automationApprovalEscalationChains = table('automation_approval_escalation_chains', {
  ...baseColumns(),
  approvalChainId: idCol('approval_chain_id').notNull(),
  level: int('level').notNull(),
  escalateToRole: varchar('escalate_to_role', { length: 100 }).notNull(),
  escalateAfterHours: int('escalate_after_hours').notNull(),
  maxEscalations: int('max_escalations').default(3),
  notificationTemplate: varchar('notification_template', { length: 100 }),
  metadata: json('metadata').$type().default({})
});

// Phase 11 Wave 4: Advanced Routing Rules
export const automationRoutingRules = table('automation_routing_rules', {
  ...baseColumns(),
  chainId: idCol('chain_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  conditions: json('conditions').$type().notNull(), // { operator: 'AND', conditions: [{field, type, value}] }
  priority: int('priority').default(0), // Higher = evaluated first
  enabled: boolean('enabled').default(true),
  metadata: json('metadata').$type().default({})
});
