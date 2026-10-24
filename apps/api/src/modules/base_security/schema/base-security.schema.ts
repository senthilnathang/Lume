import {
  int,
  varchar,
  boolean,
  json,
  timestamp,
  text,
  mysqlTable,
} from 'drizzle-orm/mysql-core';

export const apiKeys = mysqlTable('api_keys', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }).notNull(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  prefix: varchar('prefix', { length: 20 }).notNull(),
  userId: int('user_id'),
  expiresAt: timestamp('expires_at'),
  lastUsedAt: timestamp('last_used_at'),
  status: varchar('status', { length: 20 }).default('active'),
  scopes: json('scopes').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  deletedAt: timestamp('deleted_at'),
});

export const sessions = mysqlTable('sessions', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  token: varchar('token', { length: 500 }).notNull().unique(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  expiresAt: timestamp('expires_at').notNull(),
  lastActivityAt: timestamp('last_activity_at'),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  deletedAt: timestamp('deleted_at'),
});

export const ipAccess = mysqlTable('ip_access', {
  id: int('id').primaryKey().autoincrement(),
  ipAddress: varchar('ip_address', { length: 45 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  type: varchar('type', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  deletedAt: timestamp('deleted_at'),
});

export const twoFactor = mysqlTable('two_factor', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().unique(),
  secret: varchar('secret', { length: 255 }).notNull(),
  backupCodes: json('backup_codes').$type<string[]>(),
  enabled: boolean('enabled').default(false),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  deletedAt: timestamp('deleted_at'),
});

export const securityLogs = mysqlTable('security_logs', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id'),
  event: varchar('event', { length: 100 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  details: json('details').$type<Record<string, any>>(),
  status: varchar('status', { length: 20 }).default('success'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  deletedAt: timestamp('deleted_at'),
});
