import { table, varchar, text, json, int, integer, boolean, timestamp } from '../../../core/db/dialect.js';
import { baseColumns, withSoftDelete } from '../../../core/db/drizzle-helpers.js';

const idCol = int || integer;

export const agentgridGrids = table('agentgrid_grids', {
  ...baseColumns(),
  tenantId: idCol('tenant_id'),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  deletedAt: timestamp('deleted_at')
});

export const agentgridAgents = table('agentgrid_agents', {
  ...baseColumns(),
  gridId: idCol('grid_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).default('active'),
  version: varchar('version', { length: 20 }).default('1.0.0'),
  config: json('config').$type().default({}),
  capabilities: json('capabilities').$type().default([]),
  systemPrompt: text('system_prompt'),
  tools: json('tools').$type().default([]),
  model: varchar('model', { length: 100 }).default('gpt-4o-mini'),
  maxIterations: int('max_iterations').default(10),
  deletedAt: timestamp('deleted_at')
});

export const agentgridExecutions = table('agentgrid_executions', {
  ...baseColumns(),
  agentId: idCol('agent_id').notNull(),
  parentExecutionId: idCol('parent_execution_id'),
  status: varchar('status', { length: 20 }).default('pending'),
  input: json('input').$type().default({}),
  output: json('output').$type().default({}),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  duration: int('duration'),
  error: text('error'),
  triggeredBy: varchar('triggered_by', { length: 100 }),
  deletedAt: timestamp('deleted_at')
});

export const agentgridExecutionLogs = table('agentgrid_execution_logs', {
  ...baseColumns(),
  executionId: idCol('execution_id').notNull(),
  level: varchar('level', { length: 10 }).default('info'),
  message: text('message'),
  data: json('data').$type().default({}),
  timestamp: timestamp('timestamp').default(new Date()),
  deletedAt: timestamp('deleted_at')
});

export const agentgridMemory = table('agentgrid_memory', {
  ...baseColumns(),
  agentId: idCol('agent_id').notNull(),
  namespace: varchar('namespace', { length: 100 }).notNull(),
  key: varchar('key', { length: 255 }).notNull(),
  value: json('value').$type().default({}),
  expiresAt: timestamp('expires_at'),
  deletedAt: timestamp('deleted_at')
});

export const agentgridTools = table('agentgrid_tools', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  schema: json('schema').$type().default({}),
  type: varchar('type', { length: 20 }).default('builtin'),
  config: json('config').$type().default({}),
  isEnabled: boolean('is_enabled').default(true),
  deletedAt: timestamp('deleted_at')
});
