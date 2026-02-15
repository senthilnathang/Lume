import { mysqlTable, int, varchar, text, boolean, json, timestamp, mysqlEnum } from 'drizzle-orm/mysql-core';
import { baseColumns } from '../../../core/db/drizzle-helpers.js';

export const messages = mysqlTable('messages', {
  ...baseColumns(),
  subject: varchar('subject', { length: 255 }),
  content: text('content').notNull(),
  senderName: varchar('sender_name', { length: 255 }),
  senderEmail: varchar('sender_email', { length: 255 }).notNull(),
  senderPhone: varchar('sender_phone', { length: 20 }),
  recipientEmail: varchar('recipient_email', { length: 255 }),
  type: mysqlEnum('type', ['contact', 'inquiry', 'support', 'feedback', 'other']).default('contact'),
  status: mysqlEnum('status', ['new', 'read', 'replied', 'archived']).default('new'),
  priority: mysqlEnum('priority', ['low', 'normal', 'high', 'urgent']).default('normal'),
  isStarred: boolean('is_starred').default(false),
  metadata: json('metadata').$type().default({}),
  readAt: timestamp('read_at'),
  repliedAt: timestamp('replied_at'),
  assignedTo: int('assigned_to'),
});
