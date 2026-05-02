import { table, int, integer, varchar, text, boolean, json, timestamp } from '../../../core/db/dialect.js';
import { baseColumns, withSoftDelete } from '../../../core/db/drizzle-helpers.js';

const idCol = int || integer;

// Original documents table for file uploads
export const documents = table('documents', {
  ...baseColumns(),
  ...withSoftDelete(),
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

// Content versioning tables
export const documentVersions = table('document_versions', {
  ...baseColumns(),
  ...withSoftDelete(),
  documentId: idCol('document_id').notNull(),
  versionNumber: int('version_number').notNull(),
  content: text('content').notNull(),
  changesSummary: text('changes_summary'),
  createdBy: idCol('created_by').notNull(),
  approvedBy: idCol('approved_by'),
  approvedAt: timestamp('approved_at'),
  metadata: json('metadata').$type().default({}),
});

export const documentAccess = table('document_access', {
  ...baseColumns(),
  ...withSoftDelete(),
  documentId: idCol('document_id').notNull(),
  grantedToUserId: idCol('granted_to_user_id'),
  grantedToRole: varchar('granted_to_role', { length: 100 }),
  permission: varchar('permission', { length: 50 }).default('view'), // view, edit, approve
  expiresAt: timestamp('expires_at'),
  metadata: json('metadata').$type().default({}),
});
