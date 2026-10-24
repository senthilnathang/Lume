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
  bigint,
  smallint,
  decimal,
  real,
  date,
  time,
  serial,
  char,
} = mysqlCore;

// Existing Lume tables store JSON in LONGTEXT as well as native JSON columns.
// mysql2 parses native JSON, but returns LONGTEXT unchanged. Decode text at the
// persistence boundary so every transport receives the same arrays/objects.
export const json = mysqlCore.customType<{ data: any; driverData: any }>({
  dataType: () => 'json',
  toDriver: value => JSON.stringify(value),
  fromDriver: value => typeof value === 'string' ? JSON.parse(value) : value,
});

// Portable aliases backed by actual MySQL column builders.
export const integer = mysqlCore.int;
export const doublePrecision = mysqlCore.double;

export const longtext = mysqlCore.longtext;

export default mysqlCore;

export const DIALECT = 'mysql';
export const isMySQL = true;
export const isPostgreSQL = false;
