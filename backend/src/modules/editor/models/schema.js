import { table, varchar, text, longtext, boolean, int, integer, timestamp } from '../../../core/db/dialect.js';
import { baseColumns, withSoftDelete } from '../../../core/db/drizzle-helpers.js';

const idCol = int || integer;

/**
 * Editor Templates - Pre-built page/content templates
 */
export const editorTemplates = table('editor_templates', {
  ...baseColumns(),
  ...withSoftDelete(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  content: longtext('content'),
  category: varchar('category', { length: 100 }).default('general'),
  isDefault: boolean('is_default').default(false),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  createdBy: idCol('created_by'),
});

/**
 * Editor Snippets - Reusable content blocks
 */
export const editorSnippets = table('editor_snippets', {
  ...baseColumns(),
  ...withSoftDelete(),
  name: varchar('name', { length: 255 }).notNull(),
  content: longtext('content'),
  category: varchar('category', { length: 100 }).default('general'),
  icon: varchar('icon', { length: 100 }),
  shortcut: varchar('shortcut', { length: 50 }),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  isGlobal: boolean('is_global').default(false),
  usageCount: idCol('usage_count').default(0),
  createdBy: idCol('created_by'),
});

/**
 * Editor Presets - Saved block attribute presets by block type
 */
export const editorPresets = table('editor_presets', {
  ...baseColumns(),
  ...withSoftDelete(),
  blockType: varchar('block_type', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  attributes: longtext('attributes'),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  createdBy: idCol('created_by'),
});

/**
 * Editor Notes - Collaborative page/block annotations
 */
export const editorNotes = table('editor_notes', {
  id: idCol('id').autoincrement().primaryKey(),
  pageId: idCol('page_id').notNull(),
  blockId: varchar('block_id', { length: 255 }).default(null),
  content: text('content').notNull(),
  authorId: idCol('author_id').notNull(),
  parentId: idCol('parent_id').default(null),
  isResolved: int('is_resolved').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

/**
 * Editor Global Widgets - Reusable global blocks that sync across all usages
 */
export const editorGlobalWidgets = table('editor_global_widgets', {
  id: idCol('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  blockType: varchar('block_type', { length: 100 }).notNull(),
  content: longtext('content').notNull(),
  createdBy: idCol('created_by').default(null),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at').default(null),
});
