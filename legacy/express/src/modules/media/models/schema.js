import { table, int, integer, varchar, text, boolean, json } from '../../../core/db/dialect.js';
import { baseColumns } from '../../../core/db/drizzle-helpers.js';

const idCol = int || integer;

export const mediaLibrary = table('media_library', {
  ...baseColumns(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }),
  mimeType: varchar('mime_type', { length: 100 }),
  size: idCol('size'),
  type: varchar('type', { length: 20 }).default('document'),
  category: varchar('category', { length: 100 }),
  path: varchar('path', { length: 500 }).notNull(),
  url: varchar('url', { length: 500 }),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  altText: varchar('alt_text', { length: 255 }),
  caption: varchar('caption', { length: 500 }),
  width: idCol('width'),
  height: idCol('height'),
  uploadedBy: idCol('uploaded_by'),
  downloads: idCol('downloads').default(0),
  views: idCol('views').default(0),
  isPublic: boolean('is_public').default(true),
  isFeatured: boolean('is_featured').default(false),
  metadata: json('metadata').$type().default({}),
});
