import { mysqlTable as table, int, varchar, text, boolean, json, datetime } from 'drizzle-orm/mysql-core';
import { baseColumns, withSoftDelete } from '../../../core/db/drizzle-helpers.js';

// Use int for MySQL
const idCol = int;

/**
 * Entity - Entity definitions created via the entity builder UI
 * Matches Prisma model Entity exactly
 */
export const entities = table('entities', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  label: varchar('label', { length: 255 }).notNull(),
  description: text('description'),
  moduleId: int('module_id'),
  createdBy: int('created_by').notNull(),
  createdAt: datetime('created_at', { mode: 'date', fsp: 0 }).default(new Date()),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 0 }).default(new Date()),
  deletedAt: datetime('deleted_at', { mode: 'date', fsp: 0 }),
});

/**
 * Entity Fields - Field definitions for entities
 * Matches Prisma model EntityField exactly
 * One-to-many relationship with entities
 */
export const entityFields = table('entity_fields', {
  id: int('id').primaryKey().autoincrement(),
  entityId: int('entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  type: varchar('type', { length: 100 }).notNull(),
  required: boolean('required').default(false),
  unique: boolean('unique').default(false),
  defaultValue: text('default_value'),
  helpText: text('help_text'),
  selectOptions: text('select_options'),
  lookupEntityId: int('lookup_entity_id'),
  lookupField: varchar('lookup_field', { length: 255 }),
  formulaExpression: text('formula_expression'),
  createdAt: datetime('created_at', { mode: 'date', fsp: 0 }).default(new Date()),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 0 }).default(new Date()),
  deletedAt: datetime('deleted_at', { mode: 'date', fsp: 0 }),
  sequence: int('sequence').default(0),
});

/**
 * Entity Views - View configurations for entities
 * Matches Prisma model EntityView exactly
 * One-to-many relationship with entities
 */
export const entityViews = table('entity_views', {
  id: int('id').primaryKey().autoincrement(),
  entityId: int('entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 100 }).notNull(),
  isDefault: boolean('is_default').default(false),
  config: text('config'),
  createdAt: datetime('created_at', { mode: 'date', fsp: 0 }).default(new Date()),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 0 }).default(new Date()),
});

/**
 * Entity Records - Data records for dynamically created entities
 * Matches Prisma model EntityRecord exactly
 * Stores actual entity instance data as JSON
 */
export const entityRecords = table('entity_records', {
  id: int('id').primaryKey().autoincrement(),
  entityId: int('entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  data: text('data').notNull(),
  createdBy: int('created_by').notNull(),
  createdAt: datetime('created_at', { mode: 'date', fsp: 0 }).default(new Date()),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 0 }).default(new Date()),
  deletedAt: datetime('deleted_at', { mode: 'date', fsp: 0 }),
});
