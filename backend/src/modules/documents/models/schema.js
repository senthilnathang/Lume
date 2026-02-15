import { mysqlTable, int, varchar, text, boolean, json, timestamp, mysqlEnum } from 'drizzle-orm/mysql-core';
import { baseColumns } from '../../../core/db/drizzle-helpers.js';

export const documents = mysqlTable('documents', {
  ...baseColumns(),
  title: varchar('title', { length: 255 }).notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }),
  mimeType: varchar('mime_type', { length: 100 }),
  size: int('size'),
  type: mysqlEnum('type', ['image', 'video', 'document', 'audio', 'other']).default('document'),
  category: varchar('category', { length: 100 }),
  path: varchar('path', { length: 500 }).notNull(),
  url: varchar('url', { length: 500 }),
  description: text('description'),
  tags: json('tags').$type().default([]),
  uploadedBy: int('uploaded_by'),
  isPublic: boolean('is_public').default(false),
  downloads: int('downloads').default(0),
  metadata: json('metadata').$type().default({}),
});
