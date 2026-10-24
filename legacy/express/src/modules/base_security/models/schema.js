import { table, int, integer, varchar, boolean, json, timestamp } from '../../../core/db/dialect.js';
import { baseColumns } from '../../../core/db/drizzle-helpers.js';

const idCol = int || integer;

export const apiKeys = table('api_keys', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  prefix: varchar('prefix', { length: 20 }).notNull(),
  userId: idCol('user_id'),
  expiresAt: timestamp('expires_at'),
  lastUsedAt: timestamp('last_used_at'),
  status: varchar('status', { length: 20 }).default('active'),
  scopes: json('scopes').$type().default([]),
});

export const sessions = table('sessions', {
  ...baseColumns(),
  userId: idCol('user_id').notNull(),
  token: varchar('token', { length: 500 }).notNull().unique(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  expiresAt: timestamp('expires_at').notNull(),
  lastActivityAt: timestamp('last_activity_at'),
  status: varchar('status', { length: 20 }).default('active'),
});

export const ipAccess = table('ip_access', {
  ...baseColumns(),
  ipAddress: varchar('ip_address', { length: 45 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  type: varchar('type', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).default('active'),
});

export const twoFactor = table('two_factor', {
  ...baseColumns(),
  userId: idCol('user_id').notNull().unique(),
  secret: varchar('secret', { length: 255 }).notNull(),
  backupCodes: json('backup_codes'),
  enabled: boolean('enabled').default(false),
  verifiedAt: timestamp('verified_at'),
});

export const securityLogs = table('security_logs', {
  ...baseColumns(),
  userId: idCol('user_id'),
  event: varchar('event', { length: 100 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  details: json('details'),
  status: varchar('status', { length: 20 }).default('success'),
});
