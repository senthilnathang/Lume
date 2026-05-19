#!/usr/bin/env node
/**
 * Drizzle module-table setup.
 *
 * Creates every table declared in src/modules/<name>/models/schema.js
 * that is missing from the live MySQL database. Idempotent
 * (CREATE TABLE IF NOT EXISTS) — safe to run multiple times.
 *
 * Solves P0-1: `npx prisma db push` creates only Prisma core tables
 * (User, Role, Permission, etc.); 34+ Drizzle module tables across 7
 * modules (agentgrid, base_automation, base_rbac, compliance, documents,
 * editor, flowgrid) never get created, leading to runtime
 * "ER_NO_SUCH_TABLE" errors deep in business logic.
 *
 * Why programmatic instead of `drizzle-kit push`:
 *   drizzle-kit requires a TTY for table-conflict resolution prompts
 *   (Prisma-owned vs Drizzle-owned tables). Non-interactive mode is not
 *   supported. This script bypasses drizzle-kit entirely by importing
 *   each schema and using drizzle-orm's `getTableConfig()` to read
 *   column definitions, then issuing CREATE TABLE IF NOT EXISTS
 *   directly through mysql2.
 *
 * Usage:
 *   node src/scripts/setupDrizzle.js            # default: skip on table conflict
 *   node src/scripts/setupDrizzle.js --verbose  # log every CREATE statement
 *
 * Limitations:
 *   - Foreign keys are NOT created. Modules that declare FKs across other
 *     modules' tables can be wired up later by the module loader. Adding
 *     FKs here would require dependency-ordered execution.
 *   - Indexes declared via .index() in the schema are honored.
 *   - Default expressions ((now()), (uuid())) are emitted literally.
 */

import dotenv from 'dotenv';
dotenv.config();

import mysql from 'mysql2/promise';
import { readdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { getTableConfig } from 'drizzle-orm/mysql-core';
import { is, Table } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODULES_DIR = path.resolve(__dirname, '..', 'modules');

const VERBOSE = process.argv.includes('--verbose');

function sqlIdent(name) {
  return '`' + name.replace(/`/g, '``') + '`';
}

/**
 * Convert a Drizzle column's default value to a SQL fragment.
 * Drizzle stores:
 *   - undefined: hasDefault=true means SQL-expression like (now()) — auto_increment, etc.
 *   - primitive: literal value
 *   - object with .queryChunks: raw SQL expression
 *   - object with sql: same
 */
function defaultToSql(col) {
  if (!col.hasDefault) return null;
  const d = col.default;

  if (d === undefined) {
    // Likely an auto-incrementing PK; no explicit DEFAULT clause needed.
    return null;
  }
  if (d && typeof d === 'object') {
    // SQL expression: sql`(now())` becomes an SQL object whose queryChunks
    // hold StringChunk { value: ['(now())'] } instances. Walk them and
    // concatenate the underlying strings.
    if (Array.isArray(d.queryChunks)) {
      try {
        const parts = d.queryChunks.map((c) => {
          if (typeof c === 'string') return c;
          if (c && Array.isArray(c.value)) return c.value.join('');
          if (c && c.value !== undefined && typeof c.value !== 'object') return String(c.value);
          return '';
        });
        const joined = parts.join('').trim();
        return joined.length > 0 ? joined : null;
      } catch {
        return null;
      }
    }
    // JSON column defaults stored as plain object/array
    if (Array.isArray(d) || d.constructor === Object) {
      return `('${JSON.stringify(d).replace(/'/g, "\\'")}')`;
    }
  }
  if (typeof d === 'string') return `'${d.replace(/'/g, "''")}'`;
  if (typeof d === 'number') return String(d);
  if (typeof d === 'boolean') return d ? '1' : '0';
  if (d instanceof Date) return `'${d.toISOString().slice(0, 19).replace('T', ' ')}'`;
  return null;
}

function columnToSql(col) {
  const parts = [sqlIdent(col.name), col.getSQLType()];
  if (col.notNull) parts.push('NOT NULL');
  if (col.autoIncrement) parts.push('AUTO_INCREMENT');
  const defSql = defaultToSql(col);
  if (defSql !== null) parts.push(`DEFAULT ${defSql}`);
  return parts.join(' ');
}

function tableToCreateSql(tableObj) {
  const cfg = getTableConfig(tableObj);
  const lines = cfg.columns.map(columnToSql);

  // Primary key (composite or single)
  const pkCols = cfg.columns.filter((c) => c.primary);
  if (pkCols.length > 0) {
    lines.push(`PRIMARY KEY (${pkCols.map((c) => sqlIdent(c.name)).join(', ')})`);
  }

  // Indexes
  for (const idx of cfg.indexes || []) {
    const idxCfg = idx.config || idx;
    const cols = (idxCfg.columns || []).map((c) => sqlIdent(c.name || c)).join(', ');
    const name = idxCfg.name || `idx_${cfg.name}_${(idxCfg.columns || []).map((c) => c.name || c).join('_')}`;
    if (cols) {
      const kw = idxCfg.unique ? 'UNIQUE INDEX' : 'INDEX';
      lines.push(`${kw} ${sqlIdent(name)} (${cols})`);
    }
  }

  // Unique constraints
  for (const uq of cfg.uniqueConstraints || []) {
    const cols = uq.columns.map((c) => sqlIdent(c.name)).join(', ');
    const name = uq.name || `unique_${cfg.name}_${uq.columns.map((c) => c.name).join('_')}`;
    lines.push(`UNIQUE ${sqlIdent(name)} (${cols})`);
  }

  return `CREATE TABLE IF NOT EXISTS ${sqlIdent(cfg.name)} (\n  ${lines.join(',\n  ')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
}

async function discoverSchemas() {
  const tables = [];
  for (const moduleName of readdirSync(MODULES_DIR)) {
    const schemaPath = path.join(MODULES_DIR, moduleName, 'models', 'schema.js');
    if (!existsSync(schemaPath)) continue;
    try {
      const mod = await import(pathToFileURL(schemaPath).href);
      for (const [exportName, exported] of Object.entries(mod)) {
        // Drizzle tables expose Table.Symbol.IsDrizzleTable or pass `is(x, Table)`.
        if (exported && is(exported, Table)) {
          tables.push({ moduleName, exportName, table: exported });
        }
      }
    } catch (err) {
      console.warn(`[setupDrizzle] Skip ${moduleName}: ${err.message}`);
    }
  }
  return tables;
}

async function main() {
  console.log('🚀 Drizzle module-table setup\n');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'gawdesy',
    password: process.env.DB_PASSWORD || 'gawdesy',
    database: process.env.DB_NAME || 'lume',
    multipleStatements: false,
  });

  let created = 0;
  let alreadyExists = 0;
  let failed = 0;
  let totalScanned = 0;

  try {
    const tables = await discoverSchemas();
    totalScanned = tables.length;

    // Get current state of tables to avoid noisy DDL on existing ones.
    const [rows] = await conn.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
      [process.env.DB_NAME || 'lume'],
    );
    const existing = new Set(rows.map((r) => r.TABLE_NAME));

    for (const { moduleName, exportName, table } of tables) {
      const cfg = getTableConfig(table);
      if (existing.has(cfg.name)) {
        alreadyExists++;
        if (VERBOSE) console.log(`  ⊙ ${cfg.name} (${moduleName}.${exportName}) — exists, skipping`);
        continue;
      }

      try {
        const sql = tableToCreateSql(table);
        if (VERBOSE) console.log(`\n--- ${moduleName}.${exportName} → ${cfg.name} ---\n${sql}`);
        await conn.execute(sql);
        created++;
        console.log(`  ✓ ${cfg.name} (${moduleName})`);
      } catch (err) {
        failed++;
        console.error(`  ✗ ${cfg.name} (${moduleName}): ${err.message}`);
        if (VERBOSE) console.error(err.stack);
      }
    }
  } finally {
    await conn.end();
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Scanned:        ${totalScanned} tables`);
  console.log(`Created:        ${created}`);
  console.log(`Already exists: ${alreadyExists}`);
  console.log(`Failed:         ${failed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('\n❌ setupDrizzle failed:', err);
  process.exit(1);
});
