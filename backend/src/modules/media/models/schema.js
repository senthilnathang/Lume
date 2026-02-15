import { mysqlTable, int, varchar, text, boolean, json, timestamp, mysqlEnum } from 'drizzle-orm/mysql-core';
import { baseColumns } from '../../../core/db/drizzle-helpers.js';

export const mediaLibrary = mysqlTable('media_library', {
  ...baseColumns(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }),
  mimeType: varchar('mime_type', { length: 100 }),
  size: int('size'),
  type: mysqlEnum('type', ['image', 'video', 'document', 'audio', 'other']).default('document'),
  category: varchar('category', { length: 100 }),
  path: varchar('path', { length: 500 }).notNull(),
  url: varchar('url', { length: 500 }),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  altText: varchar('alt_text', { length: 255 }),
  caption: varchar('caption', { length: 500 }),
  width: int('width'),
  height: int('height'),
  uploadedBy: int('uploaded_by'),
  downloads: int('downloads').default(0),
  views: int('views').default(0),
  isPublic: boolean('is_public').default(true),
  isFeatured: boolean('is_featured').default(false),
  metadata: json('metadata').$type().default({}),
});
