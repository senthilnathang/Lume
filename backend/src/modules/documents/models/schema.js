import { table, int, integer, varchar, text, boolean, json } from '../../../core/db/dialect.js';
import { baseColumns } from '../../../core/db/drizzle-helpers.js';

const idCol = int || integer;

export const documents = table('documents', {
  ...baseColumns(),
  title: varchar('title', { length: 255 }).notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }),
  mimeType: varchar('mime_type', { length: 100 }),
  size: idCol('size'),
  type: varchar('type', { length: 20 }).default('document'),
  category: varchar('category', { length: 100 }),
  path: varchar('path', { length: 500 }).notNull(),
  url: varchar('url', { length: 500 }),
  description: text('description'),
  tags: json('tags').$type().default([]),
  uploadedBy: idCol('uploaded_by'),
  isPublic: boolean('is_public').default(false),
  downloads: idCol('downloads').default(0),
  metadata: json('metadata').$type().default({}),
});
