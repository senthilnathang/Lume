## Migration 017: document soft-delete alignment

`017_align_document_soft_delete.sql` adds nullable `documents.deleted_at` only if
absent, preserving existing rows and any existing deletion timestamps. Prisma now
maps the same field as Drizzle. Apply this migration before deploying global search.
Verified against disposable databases both with and without the column and with
existing rows. Back up and restore-test the application database before applying.

# Database Migrations

This directory contains all database migrations for the Lume metadata-driven framework.

## Overview

Migrations are numbered SQL files that create tables and modify schemas to support the metadata-driven architecture.

## Running Migrations

### Current local verification (2026-10-23)

The local `lume` database initially recorded **001–015** as applied. Inspection confirmed
the tables and columns from 014–015, including job leases/receipts, approval
outcome fields, entity publication fields and stored-formula metadata. No
migrations were replayed during this inspection. The ledger is not proof that
every older migration matches its current file; the 2026-10-22 section below is
a historical deployment record, not the current migration status.

A fresh private logical backup was created under `/opt/Lume/backups.local/`.
Its SHA-256 was checked and the dump was restored into a disposable database;
all 136 base tables and 15 migration records were recovered. The disposable
restore database was removed. Backup details are recorded in
`docs/verification-2026-10-23.txt` at the repository root.

014 adds durable automation jobs, action receipts and approval outcome workflow
configuration. 015 aligns legacy entity tables with Prisma's publication and
stored-formula fields. Existing installations must inspect schema and ledger
before selecting files; these migrations are not safe to blindly replay.

Full application startup then exposed five missing Drizzle marketplace tables.
Migration **016_create_marketplace_tables.sql** was tested in a disposable database
with real catalog seeding and replay preservation, then applied to local `lume`
after confirming all five tables were absent. The ledger now records **001–016**.
016 creates categories, plugins, reviews, downloads and submissions; it does not
alter existing tables. Its `IF NOT EXISTS` clauses preserve existing tables but
do not reconcile incompatible pre-existing schemas.

### Application repair deployment (2026-10-22)

Migrations **009–013** were applied to the local `lume` application database
after a full logical backup. Their filenames and execution times are recorded
in `migrations`; `schema_migrations` continues to track module versions and
`_prisma_migrations` retains the earlier Prisma history.

- 009: relationship `cascade_update`, default false.
- 010: assignment `last_assigned_index`, default -1.
- 011: approval request history table and lookup index.
- 012: approval `trigger_event`, default manual.
- 013: notification tenant/event columns and recipient/inbox indexes.

Verified all added columns/defaults and index definitions, unchanged existing
data in affected tables, and generated Prisma reads against the application DB.
The five related integration suites passed (81 tests), as did typecheck, build,
and compiled AppModule import. Integration tests used disposable databases.

Local evidence: `/tmp/lume-verification/application-migrations-009-013.json`.
The private backup path is recorded in
`/tmp/lume-verification/application-migration-backup-path.txt`.
These temporary files should be retained elsewhere for long-term operations.

**Do not run the entire legacy migration sequence against this database.**
Migrations 001–008 have not been reconciled with its current module-managed
schema; some reference legacy `records`/field layouts. This deployment
executed only the reviewed single-statement files 009–013 and did not baseline
older migrations or use `prisma db push`/a database reset.

### Using the TypeScript Runner

```bash
# Read-only status (also the default when no arguments are provided)
npm run db:migrate:sql -- --status

# Apply only explicitly reviewed files, in filename order
npm run db:migrate:sql -- --apply 009_add_relationship_cascade_update.sql
```

Run from `apps/api`. The runner loads `.env` without overriding
existing environment variables and prefers `DATABASE_URL`; otherwise it uses
`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS` (or `DB_PASSWORD`), and `DB_NAME`.
The existing `db:migrate` command is the separate Prisma development command.

Status is ledger-based: **unrecorded does not prove a schema change is absent**.
It creates no ledger and makes no schema changes. Review current table definitions
and take a backup before selecting migrations. Applied files are skipped; competing
runners use a database-specific advisory lock. All selected scripts are parsed
before execution. The parser handles quoted semicolons, comments, and `DELIMITER`
blocks under standard MySQL quoting rules, and rejects executable version comments.

MySQL DDL is not transactional. A failed file is not recorded, but its earlier
statements may have committed; inspect and repair that partial state before retrying.
This runner does not detect edited applied files or automatically reconcile drift.

Migration 002's invalid `SELECT ... INTO NEW.version_number` syntax was repaired
and tested in a disposable MariaDB database. Its max-plus-one trigger is not a
concurrent version allocator: concurrent inserts may hit the unique constraint
and require application-level serialization/retry. Migrations 001–008 remain
unapplied to the application database pending the wider compatibility review.

### Manual Execution

```bash
mysql -h localhost -u gawdesy -p lume < migrations/001_create_workflow_runs_table.sql
mysql -h localhost -u gawdesy -p lume < migrations/002_create_record_versions_table.sql
# ... and so on
```

## Migration List

### 001_create_workflow_runs_table.sql
Creates `workflow_runs` table for tracking all workflow executions.

**Tables:**
- `workflow_runs`: stores execution status, logs, errors, timing

**Columns:**
- `id`, `workflow_name`, `workflow_version`, `entity_name`, `record_id`
- `trigger_type`, `status`, `steps_log`, `error_message`
- `started_at`, `completed_at`, `duration_ms`
- `triggered_by`, `triggered_by_type`

**Indexes:**
- `idx_workflow_record(workflow_name, record_id)` - for query by workflow and record
- `idx_status(status)` - for filtering by execution status
- `idx_created(started_at)` - for time-range queries

---

### 002_create_record_versions_table.sql
Creates `record_versions` table for full record versioning with field-level diffs.

**Tables:**
- `record_versions`: stores complete version history with snapshots and diffs

**Columns:**
- `id`, `entity_name`, `record_id`, `version_number` (auto-incremented per record)
- `data_snapshot` (JSON) - complete record state
- `changed_fields` (JSON array) - fields that changed
- `field_diff` (JSON) - {fieldName: {from, to}} structure
- `change_type` - create|update|delete|restore
- `change_source` - user|workflow|api|import
- `changed_by`, `created_at`

**Trigger:**
- `auto_version_number` - auto-increments version_number per record

**Indexes:**
- `unique_version(entity_name, record_id, version_number)` - prevents duplicate versions
- `idx_record(entity_name, record_id)` - query all versions of a record
- `idx_created(created_at)` - query recent changes

---

### 003_create_workflow_versions_table.sql
Creates `workflow_versions` table for workflow definition versioning.

**Tables:**
- `workflow_versions`: stores workflow definition snapshots

**Columns:**
- `id`, `workflow_name`, `version_number`
- `definition` (JSON) - complete workflow definition
- `triggers`, `steps`, `hooks` (JSON) - snapshots of each component
- `change_note`, `changed_by`, `created_at`

---

### 004_create_policies_table.sql
Creates `policies` table for ABAC+RBAC policy storage.

**Tables:**
- `policies`: centralized policy definitions

**Columns:**
- `id`, `name`, `entity`, `description`
- `actions` (JSON array) - read|write|delete|create|*
- `conditions` (JSON array) - ABAC conditions: [{field, operator, value}]
- `roles` (JSON array) - RBAC role names
- `deny` - 1 = deny policy, 0 = allow policy
- `module_name`, `is_active`, `created_by`, `updated_by`

**Indexes:**
- `unique_policy_name(name)` - policy names are globally unique
- `idx_entity(entity)` - query policies by entity
- `idx_deny(deny)` - filter deny vs allow policies
- `idx_active(is_active)` - only evaluate active policies

---

### 005_add_ai_metadata_to_entities.sql
Modifies `entities` table to add AI metadata support.

**Changes:**
- `description` (TEXT) - human-readable description for AI context
- `ai_metadata` (JSON) - {description, sensitiveFields[], summarizeWith}
- `updated_at` (TIMESTAMP) - update tracking
- `idx_module_name(module_name)` - module lookup optimization

---

### 006_add_field_indexing_support.sql
Adds field indexing and search index table for optimized queries.

**Changes to entity_fields:**
- `is_indexed` (TINYINT) - marks fields that should be indexed

**New Tables:**
- `entity_record_search_index`: denormalized index of field values for fast filtering
  - Separate columns for case-insensitive search, numeric ranges, date ranges
  - Kept in sync with record updates

**Indexes:**
- `unique_index(entity_name, record_id, field_name)` - one entry per indexed field per record
- `idx_value(field_value)`, `idx_value_lower(field_value_lower)` - string search
- `idx_numeric(value_numeric)`, `idx_date(value_date)` - range queries

---

### 007_create_module_versions_table.sql
Creates `module_versions` table for tracking module installation history.

**Tables:**
- `module_versions`: installation and upgrade history

**Columns:**
- `id`, `module_name`, `version`
- `manifest_snapshot` (JSON) - module manifest at install time
- `entities`, `workflows`, `permissions` (JSON) - definition snapshots
- `install_notes`, `installed_by`, `installed_at`

---

### 008_create_plugin_management_tables.sql
Creates tables for plugin management and execution logging.

**Tables:**
- `plugins`: plugin registry with manifest storage
  - `id`, `name`, `display_name`, `version`, `author`, `description`
  - `manifest_json`, `entrypoint`, `db_prefix`
  - `is_enabled`, `is_installed`, `dependencies`, `permissions`
  - `installed_by`, `installed_at`

- `plugin_logs`: execution and operation logs
  - `id`, `plugin_name`, `operation` (install|enable|disable|uninstall|execute)
  - `status` (success|failed|warning), `message`, `stack_trace`
  - `executed_by`, `executed_at`, `duration_ms`

**Indexes:**
- `idx_enabled(is_enabled)` - list enabled plugins
- `idx_installed(is_installed)` - list installed plugins
- `idx_plugin_operation` - query by plugin and operation type
- `idx_status` - filter logs by status
- `idx_executed` - query recent operations

---

## Prerequisites

- MySQL 5.7+
- Database user with CREATE/ALTER TABLE permissions
- Environment variables set (or in .env file):
  - `DB_HOST` - database host (default: localhost)
  - `DB_PORT` - database port (default: 3306)
  - `DB_USER` - database user (default: root)
  - `DB_PASSWORD` - database password
  - `DB_NAME` - database name (default: lume)

## Rollback Strategy

Database migrations are **forward-only**. To rollback:

1. **Rename columns** instead of deleting (for safe rollback potential)
2. **Create shadow tables** for complex changes
3. **Use feature flags** to disable new columns while maintaining compatibility

Example rollback approach (manual):

```sql
-- If migration 005 needs to be undone:
ALTER TABLE entities DROP COLUMN description;
ALTER TABLE entities DROP COLUMN ai_metadata;
-- Manually delete the migrations table entry
DELETE FROM migrations WHERE filename = '005_add_ai_metadata_to_entities.sql';
```

## Performance Notes

1. **Large Tables**: Migrations on tables with millions of rows may take time. Run during maintenance windows.
2. **Locks**: ALTER TABLE operations lock tables on InnoDB. Consider using `pt-online-schema-change` for production.
3. **Indexes**: Always index foreign keys and frequently filtered columns.
4. **JSON Columns**: Keep JSON objects reasonably sized (< 1MB per cell).

## Verification

After running migrations:

```bash
# Check migrations table
mysql -u gawdesy -p lume -e "SELECT * FROM migrations;"

# Verify table structure
mysql -u gawdesy -p lume -e "DESCRIBE workflow_runs;"
mysql -u gawdesy -p lume -e "DESCRIBE record_versions;"
mysql -u gawdesy -p lume -e "DESCRIBE policies;"
```

## Future Migrations

When adding new migrations:

1. Use format: `NNN_descriptive_name.sql` (zero-padded)
2. Include schema comments for clarity
3. Add indexes for frequently queried columns
4. Update this README with table/column descriptions
5. Test on development database before production deployment
