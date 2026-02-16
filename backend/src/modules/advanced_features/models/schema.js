import { table, int, integer, varchar, text, boolean, json, timestamp } from '../../../core/db/dialect.js';
import { baseColumns } from '../../../core/db/drizzle-helpers.js';

const idCol = int || integer;

export const webhooks = table('webhooks', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  url: varchar('url', { length: 500 }).notNull(),
  events: json('events').$type().default([]),
  headers: json('headers').$type().default({}),
  secret: varchar('secret', { length: 255 }),
  model: varchar('model', { length: 100 }),
  retryCount: idCol('retry_count').default(3),
  lastTriggeredAt: timestamp('last_triggered_at'),
  lastStatus: varchar('last_status', { length: 20 }),
  status: varchar('status', { length: 20 }).default('active'),
});

export const webhookLogs = table('webhook_logs', {
  ...baseColumns(),
  webhookId: idCol('webhook_id').notNull(),
  event: varchar('event', { length: 100 }).notNull(),
  payload: json('payload').$type().default({}),
  responseStatus: idCol('response_status'),
  responseBody: text('response_body'),
  duration: idCol('duration'),
  status: varchar('status', { length: 20 }).default('pending'),
});

export const notifications = table('notifications', {
  ...baseColumns(),
  userId: idCol('user_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message'),
  type: varchar('type', { length: 20 }).default('info'),
  channel: varchar('channel', { length: 20 }).default('in_app'),
  relatedModel: varchar('related_model', { length: 100 }),
  relatedId: idCol('related_id'),
  actionUrl: varchar('action_url', { length: 500 }),
  readAt: timestamp('read_at'),
  status: varchar('status', { length: 20 }).default('unread'),
});

export const notificationChannels = table('notification_channels', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  channelType: varchar('channel_type', { length: 20 }).notNull(),
  config: json('config').$type().default({}),
  isDefault: boolean('is_default').default(false),
  status: varchar('status', { length: 20 }).default('active'),
});

export const tags = table('tags', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  color: varchar('color', { length: 20 }).default('#1890ff'),
  description: varchar('description', { length: 255 }),
  category: varchar('category', { length: 100 }),
});

export const taggings = table('taggings', {
  ...baseColumns(),
  tagId: idCol('tag_id').notNull(),
  taggableType: varchar('taggable_type', { length: 100 }).notNull(),
  taggableId: idCol('taggable_id').notNull(),
});

export const comments = table('comments', {
  ...baseColumns(),
  body: text('body').notNull(),
  commentableType: varchar('commentable_type', { length: 100 }).notNull(),
  commentableId: idCol('commentable_id').notNull(),
  parentId: idCol('parent_id'),
  userId: idCol('user_id').notNull(),
});

export const attachments = table('attachments', {
  ...baseColumns(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  fileSize: idCol('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  attachableType: varchar('attachable_type', { length: 100 }).notNull(),
  attachableId: idCol('attachable_id').notNull(),
  uploadedBy: idCol('uploaded_by'),
});
