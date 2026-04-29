import * as mysqlCore from 'drizzle-orm/mysql-core';

const DB_TYPE = (process.env.DB_TYPE || 'mysql').toLowerCase();
const usePostgres = DB_TYPE === 'postgresql' || DB_TYPE === 'postgres' || DB_TYPE === 'pg';

const dialect = usePostgres ? null : mysqlCore;

// Re-export for MySQL (default in Lume)
export const table = mysqlCore.mysqlTable;
export const dbEnum = mysqlCore.mysqlEnum;

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
} = mysqlCore;

export const longtext = mysqlCore.longtext;

export default mysqlCore;

export const DIALECT = 'mysql';
export const isMySQL = true;
export const isPostgreSQL = false;
