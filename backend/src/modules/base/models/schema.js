import { mysqlTable as table, int, varchar, text, boolean, json, timestamp } from 'drizzle-orm/mysql-core';
import { baseColumns, withSoftDelete } from '../../../core/db/drizzle-helpers.js';

// Use int for MySQL
const idCol = int;

/**
 * Custom Entities - Entity definitions created via the entity builder UI
 * Tracks custom entity types with metadata for rendering and validation
 */
export const customEntities = table('custom_entities', {
  ...baseColumns(),
  ...withSoftDelete(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 100 }),
  color: varchar('color', { length: 20 }),
  isPublishable: boolean('is_publishable').default(false),
  isPublished: boolean('is_published').default(false),
  createdBy: idCol('created_by'),
});

/**
 * Entity Fields - Field definitions for custom entities
 * One-to-many relationship with customEntities
 */
export const entityFields = table('entity_fields', {
  ...baseColumns(),
  entityId: idCol('entity_id').notNull().references(() => customEntities.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  description: text('description'),
  required: boolean('required').default(false),
  unique: boolean('unique').default(false),
  validation: text('validation'),
  position: idCol('position').default(0),
  defaultValue: text('default_value'),
});

/**
 * Entity Views - View configurations for entities
 * One-to-many relationship with customEntities
 */
export const entityViews = table('entity_views', {
  ...baseColumns(),
  entityId: idCol('entity_id').notNull().references(() => customEntities.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  isDefault: boolean('is_default').default(false),
  config: json('config').$type().default({}),
});

/**
 * Entity Sync History - Track synchronization between code-defined and UI-created entities
 * Records create/update/delete operations and conflict states
 */
export const entitySyncHistory = table('entity_sync_history', {
  ...baseColumns(),
  entityId: idCol('entity_id').references(() => customEntities.id, { onDelete: 'set null' }),
  source: varchar('source', { length: 50 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  changes: json('changes').$type().default({}),
  syncedAt: timestamp('synced_at'),
  status: varchar('status', { length: 50 }).notNull(),
});
