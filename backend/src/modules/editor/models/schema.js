import { table, varchar, text, longtext, boolean, int, integer } from '../../../core/db/dialect.js';
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
  createdBy: idCol('created_by'),
});
