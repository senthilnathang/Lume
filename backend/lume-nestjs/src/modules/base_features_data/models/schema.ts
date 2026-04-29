import { table, int, integer, varchar, text, boolean, json, timestamp, bigint } from '@core/db/dialect';
import { baseColumns } from '@core/db/drizzle-helpers';

const idCol = int || integer;

export const featureFlags = table('feature_flags', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  description: text('description'),
  enabled: boolean('enabled').default(false),
  enabledFor: json('enabled_for').$type<any[]>().default([]),
  disabledFor: json('disabled_for').$type<any[]>().default([]),
  config: json('config').$type<any>().default({}),
  expiresAt: timestamp('expires_at'),
  sequence: idCol('sequence').default(10),
});

export const dataImports = table('data_imports', {
  ...baseColumns(),
  name: varchar('name', { length: 255 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  fileName: varchar('file_name', { length: 255 }),
  filePath: varchar('file_path', { length: 500 }),
  mapping: json('mapping').$type<any>().default({}),
  totalRows: idCol('total_rows').default(0),
  processedRows: idCol('processed_rows').default(0),
  successRows: idCol('success_rows').default(0),
  failedRows: idCol('failed_rows').default(0),
  errors: json('errors').$type<any[]>().default([]),
  status: varchar('status', { length: 20 }).default('pending'),
  importedBy: idCol('imported_by'),
});

export const dataExports = table('data_exports', {
  ...baseColumns(),
  name: varchar('name', { length: 255 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  filters: json('filters').$type<any>().default({}),
  fields: json('fields').$type<any[]>().default([]),
  format: varchar('format', { length: 20 }).default('csv'),
  filePath: varchar('file_path', { length: 500 }),
  fileSize: idCol('file_size'),
  recordCount: idCol('record_count').default(0),
  status: varchar('status', { length: 20 }).default('pending'),
  exportedBy: idCol('exported_by'),
});

export const backups = table('backups', {
  ...baseColumns(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 20 }).default('full'),
  filePath: varchar('file_path', { length: 500 }),
  fileSize: bigint('file_size', { mode: 'number' }),
  tables: json('tables').$type<any[]>().default([]),
  status: varchar('status', { length: 20 }).default('pending'),
  createdBy: idCol('created_by'),
});

export const featureFlagAuditLogs = table('feature_flag_audit_logs', {
  ...baseColumns(),
  flagId: idCol('flag_id'),
  flagKey: varchar('flag_key', { length: 100 }).notNull(),
  action: varchar('action', { length: 30 }).notNull(),
  oldValue: json('old_value').$type<any>(),
  newValue: json('new_value').$type<any>(),
  changedBy: idCol('changed_by'),
  ipAddress: varchar('ip_address', { length: 45 }),
});
