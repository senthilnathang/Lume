/**
 * Schema portability regression test.
 *
 * MariaDB allows `DEFAULT` values on TEXT/BLOB/JSON/GEOMETRY columns;
 * MySQL 8.0 hard-rejects them at table-creation time:
 *
 *     Error: BLOB, TEXT, GEOMETRY or JSON column 'X' can't have a default value
 *
 * (Not a sql_mode setting — server-level constraint. `DEFAULT (expr)`
 * works but Prisma emits `DEFAULT 'literal'`.)
 *
 * In 2026-05-22 we removed two such defaults from schema.prisma:
 *   - EntityView.config            @default("{}") @db.LongText
 *   - entity_sync_history.changes  @default("{}") @db.LongText
 *
 * The danger: schema.prisma is generated via `npx prisma db pull` (per
 * CLAUDE.md). A future maintainer running `db pull` against a MariaDB
 * dev DB whose columns have been ALTER'd back to a default would
 * silently re-introduce the MySQL incompat — and CI runs MariaDB, so
 * nothing would notice until prod attempts a fresh push on MySQL 8.
 *
 * This test prevents that regression. It's a static read of the
 * schema file — no DB connection, no setup, lightning fast. Wired
 * into `npm run check` so the curated gate fails immediately if the
 * defaults sneak back.
 *
 * Related memory: mariadb-vs-mysql-text-default (in repo /memory)
 */

import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, '../../prisma/schema.prisma');

// Prisma `@db.*` types that MySQL 8 forbids DEFAULTs on.
const FORBIDDEN_TYPES = [
  'LongText',
  'MediumText',
  'TinyText',
  'Text',
  'LongBlob',
  'MediumBlob',
  'TinyBlob',
  'Blob',
  'Json',
];

describe('Prisma schema is portable across MariaDB + MySQL 8 + PostgreSQL', () => {
  let schemaLines;

  beforeAll(() => {
    expect(fs.existsSync(SCHEMA_PATH)).toBe(true);
    schemaLines = fs.readFileSync(SCHEMA_PATH, 'utf8').split('\n');
  });

  // Match lines like:
  //   config String? @default("{}") @db.LongText
  //   data   String  @default("{}")  @db.Text
  // i.e. a line that contains BOTH @default(...) AND @db.<forbiddenType>.
  // We don't enforce ordering — Prisma's formatter has moved these around
  // historically.
  const forbiddenTypeRegex = new RegExp(
    `@db\\.(${FORBIDDEN_TYPES.join('|')})\\b`
  );
  const defaultRegex = /@default\([^)]+\)/;

  it('no @db.{LongText,Text,Blob,Json,...} column has a @default(...) annotation', () => {
    const offenders = [];
    schemaLines.forEach((line, idx) => {
      if (forbiddenTypeRegex.test(line) && defaultRegex.test(line)) {
        offenders.push({ lineNumber: idx + 1, line: line.trim() });
      }
    });

    if (offenders.length > 0) {
      const summary = offenders
        .map((o) => `  schema.prisma:${o.lineNumber}  ${o.line}`)
        .join('\n');
      throw new Error(
        `Found ${offenders.length} TEXT/BLOB/JSON column(s) with a @default(...) — these crash prisma db push on MySQL 8 with "BLOB, TEXT, GEOMETRY or JSON column X can't have a default value":\n${summary}\n\n` +
          `Drop the @default(...) and ALTER the live dev DB to match (see memory mariadb-vs-mysql-text-default for the migration recipe).`
      );
    }
  });

  it('schema declares the expected mysql provider (shared by MariaDB)', () => {
    const text = schemaLines.join('\n');
    expect(text).toMatch(/provider\s*=\s*"mysql"/);
  });
});
