import {
  mysqlTable,
  int,
  varchar,
  text,
  boolean,
  json,
  timestamp,
} from 'drizzle-orm/mysql-core';

export const messages = mysqlTable('messages', {
  id: int('id').primaryKey().autoincrement(),
  subject: varchar('subject', { length: 255 }),
  content: text('content').notNull(),
  senderName: varchar('sender_name', { length: 255 }),
  senderEmail: varchar('sender_email', { length: 255 }).notNull(),
  senderPhone: varchar('sender_phone', { length: 20 }),
  recipientEmail: varchar('recipient_email', { length: 255 }),
  type: varchar('type', { length: 20 }).default('contact'),
  status: varchar('status', { length: 20 }).default('new'),
  priority: varchar('priority', { length: 20 }).default('normal'),
  isStarred: boolean('is_starred').default(false),
  metadata: json('metadata').$type<Record<string, any>>().default({}),
  readAt: timestamp('read_at'),
  repliedAt: timestamp('replied_at'),
  assignedTo: int('assigned_to'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});
