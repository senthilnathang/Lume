/**
 * Module table parity check.
 *
 * At startup, walks every Drizzle module schema and confirms the expected
 * tables exist in MySQL. Logs a single grouped warning (not a per-query
 * error) when tables are missing so operators see the problem ONCE at boot
 * instead of as silent 500s on first request.
 *
 * Why this exists:
 *   `npx prisma db push` creates Prisma core tables (User, Role, ...) but
 *   does NOT create Drizzle module tables. A fresh `db:setup` run can
 *   leave 10+ module tables missing, surfacing later as opaque
 *   "ER_NO_SUCH_TABLE" errors deep in business logic.
 *
 * Caller:
 *   import { checkTableParity } from './check-table-parity.js';
 *   await checkTableParity(prisma);   // logger.warn on missing tables
 *
 * Non-fatal by design — the check only warns. Boot continues even if
 * tables are missing. Set `LUME_STRICT_TABLE_PARITY=true` to convert
 * warnings into a startup failure (useful for CI/production).
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULES_DIR = path.resolve(__dirname, '..', '..', 'modules');

/**
 * Scrape table names from a Drizzle schema source.
 *
 * Drizzle declares tables as:
 *   export const foo = mysqlTable('table_name', { ... })
 *   export const bar = pgTable('table_name', { ... })
 *   export const baz = table('table_name', { ... })   // via dialect.js
 *
 * Static parsing is intentional — importing the schema would trigger the
 * Drizzle ORM setup, defeating the point of a cheap pre-flight check.
 */
function extractTableNames(schemaPath) {
  const src = readFileSync(schemaPath, 'utf-8');
  const names = new Set();

  const re = /\b(?:mysqlTable|pgTable|sqliteTable|table)\s*\(\s*['"`]([a-zA-Z0-9_]+)['"`]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    names.add(m[1]);
  }

  return [...names];
}

function discoverExpectedTables() {
  const expected = {};
  if (!existsSync(MODULES_DIR)) return expected;

  for (const moduleName of readdirSync(MODULES_DIR)) {
    const schemaPath = path.join(MODULES_DIR, moduleName, 'models', 'schema.js');
    if (!existsSync(schemaPath)) continue;
    try {
      const tables = extractTableNames(schemaPath);
      if (tables.length > 0) {
        expected[moduleName] = tables;
      }
    } catch (err) {
      console.warn(`[table-parity] Could not parse ${schemaPath}: ${err.message}`);
    }
  }

  return expected;
}

async function queryActualTables(prisma) {
  const dbName = process.env.DB_NAME || 'lume';
  const rows = await prisma.$queryRawUnsafe(
    `SELECT TABLE_NAME as tableName
       FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_TYPE   = 'BASE TABLE'`,
    dbName,
  );
  return new Set(rows.map((r) => r.tableName));
}

export async function checkTableParity(prisma, { logger = console } = {}) {
  const expected = discoverExpectedTables();
  const actual = await queryActualTables(prisma);

  const missing = {};
  for (const [moduleName, tables] of Object.entries(expected)) {
    const gone = tables.filter((t) => !actual.has(t));
    if (gone.length > 0) {
      missing[moduleName] = gone;
    }
  }

  const moduleCount = Object.keys(expected).length;
  const tableCount = Object.values(expected).reduce((n, t) => n + t.length, 0);

  if (Object.keys(missing).length === 0) {
    logger.log(`✅ Table parity OK (${moduleCount} modules, ${tableCount} tables checked)`);
    return missing;
  }

  const lines = [
    '',
    '⚠️  Module table parity WARNING',
    `   ${moduleCount} modules scanned, ${tableCount} tables expected.`,
    `   ${Object.keys(missing).length} module(s) have missing tables.`,
    '',
  ];
  for (const [moduleName, tables] of Object.entries(missing)) {
    lines.push(`   ${moduleName}: ${tables.join(', ')}`);
  }
  lines.push('');
  lines.push('   These tables are declared in src/modules/<name>/models/schema.js');
  lines.push("   but don't exist in MySQL. `prisma db push` only creates Prisma");
  lines.push('   core tables — Drizzle module schemas need a separate migration.');
  lines.push('   See docs/deployment/PRE_LAUNCH_IMPROVEMENTS.md → P0-1.');
  lines.push('');

  logger.warn(lines.join('\n'));

  if (process.env.LUME_STRICT_TABLE_PARITY === 'true') {
    throw new Error(
      `Table parity check failed in strict mode: ${Object.keys(missing).length} modules have missing tables`,
    );
  }

  return missing;
}
