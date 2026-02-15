import { mysqlTable, int, varchar, text, boolean, json, timestamp, mysqlEnum } from 'drizzle-orm/mysql-core';
import { baseColumns } from '../../../core/db/drizzle-helpers.js';

export const webhooks = mysqlTable('webhooks', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  url: varchar('url', { length: 500 }).notNull(),
  events: json('events').$type().default([]),
  headers: json('headers').$type().default({}),
  secret: varchar('secret', { length: 255 }),
  model: varchar('model', { length: 100 }),
  retryCount: int('retry_count').default(3),
  lastTriggeredAt: timestamp('last_triggered_at'),
  lastStatus: varchar('last_status', { length: 20 }),
  status: mysqlEnum('status', ['active', 'inactive', 'error']).default('active'),
});

export const webhookLogs = mysqlTable('webhook_logs', {
  ...baseColumns(),
  webhookId: int('webhook_id').notNull(),
  event: varchar('event', { length: 100 }).notNull(),
  payload: json('payload').$type().default({}),
  responseStatus: int('response_status'),
  responseBody: text('response_body'),
  duration: int('duration'),
  status: mysqlEnum('status', ['success', 'failed', 'pending']).default('pending'),
});

export const notifications = mysqlTable('notifications', {
  ...baseColumns(),
  userId: int('user_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message'),
  type: mysqlEnum('type', ['info', 'success', 'warning', 'error', 'action']).default('info'),
  channel: mysqlEnum('channel', ['in_app', 'email', 'sms', 'push']).default('in_app'),
  relatedModel: varchar('related_model', { length: 100 }),
  relatedId: int('related_id'),
  actionUrl: varchar('action_url', { length: 500 }),
  readAt: timestamp('read_at'),
  status: mysqlEnum('status', ['unread', 'read', 'dismissed']).default('unread'),
});

export const notificationChannels = mysqlTable('notification_channels', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  channelType: mysqlEnum('channel_type', ['email', 'sms', 'push', 'slack', 'webhook']).notNull(),
  config: json('config').$type().default({}),
  isDefault: boolean('is_default').default(false),
  status: mysqlEnum('status', ['active', 'inactive']).default('active'),
});

export const tags = mysqlTable('tags', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  color: varchar('color', { length: 20 }).default('#1890ff'),
  description: varchar('description', { length: 255 }),
  category: varchar('category', { length: 100 }),
});

export const taggings = mysqlTable('taggings', {
  ...baseColumns(),
  tagId: int('tag_id').notNull(),
  taggableType: varchar('taggable_type', { length: 100 }).notNull(),
  taggableId: int('taggable_id').notNull(),
});

export const comments = mysqlTable('comments', {
  ...baseColumns(),
  body: text('body').notNull(),
  commentableType: varchar('commentable_type', { length: 100 }).notNull(),
  commentableId: int('commentable_id').notNull(),
  parentId: int('parent_id'),
  userId: int('user_id').notNull(),
});

export const attachments = mysqlTable('attachments', {
  ...baseColumns(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  fileSize: int('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  attachableType: varchar('attachable_type', { length: 100 }).notNull(),
  attachableId: int('attachable_id').notNull(),
  uploadedBy: int('uploaded_by'),
});
