# Database Migrations

This directory contains all database migrations for the Lume metadata-driven framework.

## Overview

Migrations are numbered SQL files that create tables and modify schemas to support the metadata-driven architecture.

## Running Migrations

### Using the TypeScript Runner

```bash
# With environment variables
DB_HOST=localhost DB_USER=gawdesy DB_PASSWORD=gawdesy DB_NAME=lume npx ts-node migrations/run-migrations.ts

# Or configure in .env file
npx ts-node migrations/run-migrations.ts
```

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
