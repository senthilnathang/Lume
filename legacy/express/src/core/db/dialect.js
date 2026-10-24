/**
 * Database Dialect Abstraction
 *
 * Re-exports Drizzle ORM types for the configured database.
 * Set DB_TYPE=mysql (default) or DB_TYPE=postgresql in environment.
 *
 * All module schemas should import from this file instead of
 * directly from 'drizzle-orm/mysql-core' or 'drizzle-orm/pg-core'.
 */

// Import both dialects statically for drizzle-kit compatibility
import * as mysqlCore from 'drizzle-orm/mysql-core';
import * as pgCore from 'drizzle-orm/pg-core';

const DB_TYPE = (process.env.DB_TYPE || 'mysql').toLowerCase();
const usePostgres = DB_TYPE === 'postgresql' || DB_TYPE === 'postgres' || DB_TYPE === 'pg';

const dialect = usePostgres ? pgCore : mysqlCore;

// ─── Table builder ───
// MySQL: mysqlTable, PostgreSQL: pgTable → export as `table`
export const table = usePostgres ? pgCore.pgTable : mysqlCore.mysqlTable;

// ─── Enum builder ───
// MySQL: mysqlEnum, PostgreSQL: pgEnum
export const dbEnum = usePostgres ? pgCore.pgEnum : mysqlCore.mysqlEnum;

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
export const longtext = usePostgres ? pgCore.text : mysqlCore.longtext;

// ─── Re-export everything for advanced use ───
export default dialect;

// ─── Dialect info ───
export const DIALECT = usePostgres ? 'postgresql' : 'mysql';
export const isMySQL = DIALECT === 'mysql';
export const isPostgreSQL = DIALECT === 'postgresql';
