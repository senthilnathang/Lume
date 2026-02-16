import { table, int, integer, varchar, text, boolean, json, timestamp } from '../../../core/db/dialect.js';
import { baseColumns } from '../../../core/db/drizzle-helpers.js';

const idCol = int || integer;

export const messages = table('messages', {
  ...baseColumns(),
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
  metadata: json('metadata').$type().default({}),
  readAt: timestamp('read_at'),
  repliedAt: timestamp('replied_at'),
  assignedTo: idCol('assigned_to'),
});
