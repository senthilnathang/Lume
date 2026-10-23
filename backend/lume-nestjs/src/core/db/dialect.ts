import * as mysqlCore from 'drizzle-orm/mysql-core';

// Re-export for MySQL (default in Lume)
export const table = mysqlCore.mysqlTable;
export const dbEnum = mysqlCore.mysqlEnum;

export const {
  int,
  varchar,
  text,
  boolean,
  timestamp,
  json,
  bigint,
  smallint,
  decimal,
  real,
  date,
  time,
  serial,
  char,
} = mysqlCore;

// Portable aliases backed by actual MySQL column builders.
export const integer = mysqlCore.int;
export const doublePrecision = mysqlCore.double;

export const longtext = mysqlCore.longtext;

export default mysqlCore;

export const DIALECT = 'mysql';
export const isMySQL = true;
export const isPostgreSQL = false;
