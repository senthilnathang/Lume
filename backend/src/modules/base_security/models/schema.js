import { mysqlTable, int, varchar, text, boolean, json, timestamp, mysqlEnum } from 'drizzle-orm/mysql-core';
import { baseColumns } from '../../../core/db/drizzle-helpers.js';

export const apiKeys = mysqlTable('api_keys', {
  ...baseColumns(),
  name: varchar('name', { length: 100 }).notNull(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  prefix: varchar('prefix', { length: 20 }).notNull(),
  userId: int('user_id'),
  expiresAt: timestamp('expires_at'),
  lastUsedAt: timestamp('last_used_at'),
  status: mysqlEnum('status', ['active', 'inactive', 'expired']).default('active'),
  scopes: json('scopes').$type().default([]),
});

export const sessions = mysqlTable('sessions', {
  ...baseColumns(),
  userId: int('user_id').notNull(),
  token: varchar('token', { length: 500 }).notNull().unique(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  expiresAt: timestamp('expires_at').notNull(),
  lastActivityAt: timestamp('last_activity_at'),
  status: mysqlEnum('status', ['active', 'expired', 'revoked']).default('active'),
});

export const ipAccess = mysqlTable('ip_access', {
  ...baseColumns(),
  ipAddress: varchar('ip_address', { length: 45 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  type: mysqlEnum('type', ['whitelist', 'blacklist']).notNull(),
  status: mysqlEnum('status', ['active', 'inactive']).default('active'),
});

export const twoFactor = mysqlTable('two_factor', {
  ...baseColumns(),
  userId: int('user_id').notNull().unique(),
  secret: varchar('secret', { length: 255 }).notNull(),
  backupCodes: json('backup_codes'),
  enabled: boolean('enabled').default(false),
  verifiedAt: timestamp('verified_at'),
});

export const securityLogs = mysqlTable('security_logs', {
  ...baseColumns(),
  userId: int('user_id'),
  event: varchar('event', { length: 100 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  details: json('details'),
  status: mysqlEnum('status', ['success', 'failed', 'blocked']).default('success'),
});
