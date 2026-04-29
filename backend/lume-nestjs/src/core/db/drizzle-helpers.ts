import { int, timestamp, boolean } from './dialect';

const idCol = int;

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

export function withStatus(values: any, defaultVal?: any) {
  // Helper — import mysqlEnum/pgEnum from dialect.ts and use directly
}

export function withActive() {
  return {
    isActive: boolean('is_active').default(true).notNull(),
  };
}
