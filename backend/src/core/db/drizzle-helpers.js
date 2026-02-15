import { int, timestamp, boolean } from 'drizzle-orm/mysql-core';

export function baseColumns() {
  return {
    id: int('id').primaryKey().autoincrement(),
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
  // Helper — import mysqlEnum from drizzle-orm/mysql-core and use directly
  // This is just a documentation helper
}

export function withActive() {
  return {
    isActive: boolean('is_active').default(true).notNull(),
  };
}
