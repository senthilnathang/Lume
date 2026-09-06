import { table, int, integer, varchar, text, boolean, json, timestamp } from '../../../core/db/dialect.js';
import { baseColumns } from '../../../core/db/drizzle-helpers.js';

const idCol = int || integer;

export const smsProviders = table('sms_providers', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  providerType: varchar('provider_type', { length: 30 }).default('webhook'),
  config: json('config').$type().default({}),
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
});

export const smsTemplates = table('sms_templates', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 100 }).notNull(),
  body: text('body').notNull(),
  locale: varchar('locale', { length: 10 }).default('en'),
  isActive: boolean('is_active').default(true),
});

export const smsLogs = table('sms_logs', {
  ...baseColumns(),
  providerId: idCol('provider_id'),
  toNumber: varchar('to_number', { length: 50 }).notNull(),
  body: text('body'),
  status: varchar('status', { length: 20 }).default('pending'),
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at'),
});
