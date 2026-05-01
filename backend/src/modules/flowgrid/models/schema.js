import { table, varchar, text, json, int, integer, boolean, timestamp } from '../../../core/db/dialect.js';
import { baseColumns, withSoftDelete } from '../../../core/db/drizzle-helpers.js';

const idCol = int || integer;

export const flowgridWorkflows = table('flowgrid_workflows', {
  ...baseColumns(),
  tenantId: idCol('tenant_id'),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('draft'),
  nodes: json('nodes').$type().default([]),
  edges: json('edges').$type().default([]),
  variables: json('variables').$type().default({}),
  trigger: json('trigger').$type().default({}),
  settings: json('settings').$type().default({}),
  publishedAt: timestamp('published_at'),
  createdById: idCol('created_by_id'),
  deletedAt: timestamp('deleted_at')
});

export const flowgridExecutions = table('flowgrid_executions', {
  ...baseColumns(),
  workflowId: idCol('workflow_id').notNull(),
  status: varchar('status', { length: 20 }).default('pending'),
  input: json('input').$type().default({}),
  output: json('output').$type().default({}),
  variables: json('variables').$type().default({}),
  error: text('error'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  triggeredBy: varchar('triggered_by', { length: 100 }),
  duration: int('duration'),
  deletedAt: timestamp('deleted_at')
});

export const flowgridNodeExecutions = table('flowgrid_node_executions', {
  ...baseColumns(),
  executionId: idCol('execution_id').notNull(),
  nodeId: varchar('node_id', { length: 100 }).notNull(),
  nodeType: varchar('node_type', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending'),
  input: json('input').$type().default({}),
  output: json('output').$type().default({}),
  error: text('error'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  tokens: int('tokens'),
  cost: varchar('cost', { length: 50 }),
  deletedAt: timestamp('deleted_at')
});

export const flowgridTemplates = table('flowgrid_templates', {
  ...baseColumns(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }),
  description: text('description'),
  definition: json('definition').$type().default({}),
  isPublic: boolean('is_public').default(false),
  deletedAt: timestamp('deleted_at')
});

export const flowgridNodeTypes = table('flowgrid_node_types', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  category: varchar('category', { length: 100 }),
  description: text('description'),
  schema: json('schema').$type().default({}),
  version: varchar('version', { length: 20 }).default('1.0.0'),
  isBuiltin: boolean('is_builtin').default(false)
});
