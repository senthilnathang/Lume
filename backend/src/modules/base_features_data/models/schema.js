import { mysqlTable, int, varchar, text, boolean, json, timestamp, mysqlEnum, bigint } from 'drizzle-orm/mysql-core';
import { baseColumns } from '../../../core/db/drizzle-helpers.js';

export const featureFlags = mysqlTable('feature_flags', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  description: text('description'),
  enabled: boolean('enabled').default(false),
  enabledFor: json('enabled_for').$type().default([]),
  disabledFor: json('disabled_for').$type().default([]),
  config: json('config').$type().default({}),
  expiresAt: timestamp('expires_at'),
  sequence: int('sequence').default(10),
});

export const dataImports = mysqlTable('data_imports', {
  ...baseColumns(),
  name: varchar('name', { length: 255 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  fileName: varchar('file_name', { length: 255 }),
  filePath: varchar('file_path', { length: 500 }),
  mapping: json('mapping').$type().default({}),
  totalRows: int('total_rows').default(0),
  processedRows: int('processed_rows').default(0),
  successRows: int('success_rows').default(0),
  failedRows: int('failed_rows').default(0),
  errors: json('errors').$type().default([]),
  status: mysqlEnum('status', ['pending', 'processing', 'completed', 'failed']).default('pending'),
  importedBy: int('imported_by'),
});

export const dataExports = mysqlTable('data_exports', {
  ...baseColumns(),
  name: varchar('name', { length: 255 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  filters: json('filters').$type().default({}),
  fields: json('fields').$type().default([]),
  format: mysqlEnum('format', ['csv', 'json', 'xlsx']).default('csv'),
  filePath: varchar('file_path', { length: 500 }),
  fileSize: int('file_size'),
  recordCount: int('record_count').default(0),
  status: mysqlEnum('status', ['pending', 'processing', 'completed', 'failed']).default('pending'),
  exportedBy: int('exported_by'),
});

export const backups = mysqlTable('backups', {
  ...baseColumns(),
  name: varchar('name', { length: 255 }).notNull(),
  type: mysqlEnum('type', ['full', 'partial', 'incremental']).default('full'),
  filePath: varchar('file_path', { length: 500 }),
  fileSize: bigint('file_size', { mode: 'number' }),
  tables: json('tables').$type().default([]),
  status: mysqlEnum('status', ['pending', 'in_progress', 'completed', 'failed']).default('pending'),
  createdBy: int('created_by'),
});
