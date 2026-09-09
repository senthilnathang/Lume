#!/usr/bin/env node
/**
 * Module migration state tracker (F5.2).
 *
 * Records each module's manifest version in `schema_migrations` so drift
 * between code and database is visible:
 *
 *   node src/scripts/migrate.js --status   # report applied vs manifest versions
 *   node src/scripts/migrate.js --apply    # record current manifest versions
 *                                          # (run after setupDrizzle.js)
 *
 * Table DDL evolution itself stays with setupDrizzle.js (CREATE TABLE IF
 * NOT EXISTS) and Prisma migrations for core tables; this tracker answers
 * "which module version shaped this database?".
 */

import dotenv from 'dotenv';
dotenv.config();

import mysql from 'mysql2/promise';
import { readdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULES_DIR = path.resolve(__dirname, '..', 'modules');

export async function discoverModuleVersions() {
  const versions = [];
  for (const name of readdirSync(MODULES_DIR)) {
    const manifestPath = path.join(MODULES_DIR, name, '__manifest__.js');
    if (!existsSync(manifestPath)) {
      continue;
    }
    try {
      const manifest = (await import(pathToFileURL(manifestPath).href)).default || {};
      const content = `${manifest.technicalName || name}@${manifest.version || '0.0.0'}`;
      versions.push({
        module: manifest.technicalName || name,
        version: manifest.version || '0.0.0',
        checksum: crypto.createHash('sha256').update(content).digest('hex').slice(0, 16),
      });
    } catch {
      /* unreadable manifest — reported as drift */
    }
  }
  return versions.sort((a, b) => a.module.localeCompare(b.module));
}

export function diffVersions(manifests, recorded) {
  const recordedByModule = new Map((recorded || []).map((r) => [r.module, r]));
  return manifests.map((m) => {
    const row = recordedByModule.get(m.module);
    if (!row) {
      return { ...m, state: 'pending', recordedVersion: null };
    }
    if (row.version !== m.version || (row.checksum && row.checksum !== m.checksum)) {
      return { ...m, state: 'drifted', recordedVersion: row.version };
    }
    return { ...m, state: 'applied', recordedVersion: row.version };
  });
}

async function connect() {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lume',
    multipleStatements: true,
  });
}

async function ensureTable(connection) {
  await connection.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
    \`module\` VARCHAR(100) PRIMARY KEY,
    \`version\` VARCHAR(50) NOT NULL,
    \`checksum\` VARCHAR(64) NULL,
    \`applied_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);
}

async function main() {
  const mode = process.argv.includes('--apply') ? 'apply' : 'status';
  const manifests = await discoverModuleVersions();
  const connection = await connect();
  try {
    await ensureTable(connection);
    const [rows] = await connection.execute('SELECT `module`, `version`, `checksum` FROM schema_migrations');
    if (mode === 'status') {
      for (const entry of diffVersions(manifests, rows)) {
        console.log(`${entry.state.padEnd(8)} ${entry.module} (manifest ${entry.version}, db ${entry.recordedVersion || '—'})`);
      }
      return;
    }
    for (const entry of manifests) {
      await connection.execute(
        'INSERT INTO schema_migrations (`module`, `version`, `checksum`) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `version` = VALUES(`version`), `checksum` = VALUES(`checksum`)',
        [entry.module, entry.version, entry.checksum]
      );
    }
    console.log(`Recorded ${manifests.length} module versions`);
  } finally {
    await connection.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
