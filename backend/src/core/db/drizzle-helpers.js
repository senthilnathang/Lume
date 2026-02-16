/**
 * Drizzle Schema Helpers
 * Database-agnostic column helpers — works with MySQL and PostgreSQL.
 * Import types from dialect.js which resolves the correct dialect at runtime.
 */

import { int, integer, timestamp, boolean } from './dialect.js';

// Use int for MySQL, integer for PostgreSQL
const idCol = int || integer;

export function baseColumns() {
  return {
    id: idCol('id').primaryKey().autoincrement(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
  };
}

export function withSoftDelete() {
  return {
    deletedAt: timestamp('deleted_at'),
  };
}

export function withStatus(values, defaultVal) {
  // Helper — import mysqlEnum/pgEnum from dialect.js and use directly
  // This is just a documentation helper
}

export function withActive() {
  return {
    isActive: boolean('is_active').default(true).notNull(),
  };
}
