/**
 * Database Dialect Abstraction
 *
 * Re-exports Drizzle ORM types for the configured database.
 * Set DB_TYPE=mysql (default) or DB_TYPE=postgresql in environment.
 *
 * All module schemas should import from this file instead of
 * directly from 'drizzle-orm/mysql-core' or 'drizzle-orm/pg-core'.
 */

const DB_TYPE = (process.env.DB_TYPE || 'mysql').toLowerCase();

let dialect;

if (DB_TYPE === 'postgresql' || DB_TYPE === 'postgres' || DB_TYPE === 'pg') {
  dialect = await import('drizzle-orm/pg-core');
} else {
  dialect = await import('drizzle-orm/mysql-core');
}

// ─── Table builder ───
// MySQL: mysqlTable, PostgreSQL: pgTable → export as `table`
export const table = dialect.mysqlTable || dialect.pgTable;

// ─── Enum builder ───
// MySQL: mysqlEnum, PostgreSQL: pgEnum
// Note: pgEnum returns a reusable type, mysqlEnum is inline
// We normalize to a function: createEnum(name, values) → column builder for MySQL, type for PG
export const dbEnum = dialect.mysqlEnum || dialect.pgEnum;

// ─── Column types (common across both dialects) ───
export const {
  int,
  integer,
  varchar,
  text,
  boolean,
  timestamp,
  json,
  bigint,
  smallint,
  decimal,
  real,
  doublePrecision,
  date,
  time,
  serial,
  char,
} = dialect;

// MySQL-specific: int exists, PG uses integer — alias both
const intCol = dialect.int || dialect.integer;
const integerCol = dialect.integer || dialect.int;
export { intCol as safeInt, integerCol as safeInteger };

// longtext: MySQL has it, PG uses text
export const longtext = dialect.longtext || dialect.text;

// ─── Re-export everything for advanced use ───
export default dialect;

// ─── Dialect info ───
export const DIALECT = DB_TYPE === 'postgresql' || DB_TYPE === 'postgres' || DB_TYPE === 'pg' ? 'postgresql' : 'mysql';
export const isMySQL = DIALECT === 'mysql';
export const isPostgreSQL = DIALECT === 'postgresql';
