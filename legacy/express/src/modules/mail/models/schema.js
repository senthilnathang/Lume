import { table, int, integer, varchar, text, boolean, json, timestamp } from '../../../core/db/dialect.js';
import { baseColumns } from '../../../core/db/drizzle-helpers.js';

const idCol = int || integer;

export const mailServers = table('mail_servers', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  protocol: varchar('protocol', { length: 10 }).default('imap'),
  host: varchar('host', { length: 255 }).notNull(),
  port: idCol('port').default(993),
  username: varchar('username', { length: 255 }),
  password: varchar('password', { length: 500 }),
  useTls: boolean('use_tls').default(true),
  isActive: boolean('is_active').default(true),
  lastFetchAt: timestamp('last_fetch_at'),
  lastError: text('last_error'),
});

export const mailRoutingRules = table('mail_routing_rules', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  isActive: boolean('is_active').default(true),
  priority: idCol('priority').default(10),
  fromFilter: varchar('from_filter', { length: 500 }),
  subjectFilter: varchar('subject_filter', { length: 500 }),
  bodyFilter: varchar('body_filter', { length: 500 }),
  toFilter: varchar('to_filter', { length: 500 }),
  action: varchar('action', { length: 30 }).default('create_record'),
  targetEntity: varchar('target_entity', { length: 100 }),
  fieldMappings: json('field_mappings').$type().default({}),
  replySubject: varchar('reply_subject', { length: 500 }),
  replyBody: text('reply_body'),
  companyId: idCol('company_id'),
});

export const mailMessages = table('mail_messages', {
  ...baseColumns(),
  serverId: idCol('server_id'),
  direction: varchar('direction', { length: 10 }).default('inbound'),
  fromAddress: varchar('from_address', { length: 255 }),
  toAddress: varchar('to_address', { length: 255 }),
  subject: varchar('subject', { length: 500 }),
  body: text('body'),
  messageId: varchar('message_id', { length: 255 }),
  status: varchar('status', { length: 20 }).default('received'),
  routedRuleId: idCol('routed_rule_id'),
  companyId: idCol('company_id'),
});

export const mailQueue = table('mail_queue', {
  ...baseColumns(),
  toAddress: varchar('to_address', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  bodyHtml: text('body_html'),
  bodyText: text('body_text'),
  status: varchar('status', { length: 20 }).default('pending'),
  attempts: idCol('attempts').default(0),
  maxAttempts: idCol('max_attempts').default(3),
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at'),
});
