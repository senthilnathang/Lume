/**
 * Entity Schema Generator
 * Generates Drizzle table definitions and SQL CREATE TABLE statements
 * from entity and field definitions
 */

import {
  mysqlTable as table,
  int,
  varchar,
  text,
  boolean,
  decimal,
  datetime,
  json,
  timestamp,
} from 'drizzle-orm/mysql-core';

/**
 * Map entity field types to Drizzle column types
 * Returns a column builder function, not yet called
 */
function getDrizzleColumnType(fieldType, fieldName, fieldConfig = {}) {
  const columnName = fieldName.toLowerCase().replace(/\s+/g, '_');

  switch (fieldType) {
    case 'text':
    case 'email':
      return () => varchar(columnName, { length: 255 });
    case 'textarea':
      return () => text(columnName);
    case 'number':
      return () => decimal(columnName, { precision: 12, scale: 2 });
    case 'boolean':
      return () => boolean(columnName);
    case 'date':
      return () => datetime(columnName, { mode: 'date' });
    case 'datetime':
      return () => datetime(columnName, { mode: 'date', fsp: 0 });
    case 'select':
    case 'multiselect':
      return () => varchar(columnName, { length: 500 });
    case 'lookup':
    case 'formula':
    case 'count':
      return () => text(columnName);
    default:
      return () => varchar(columnName, { length: 255 });
  }
}

/**
 * Map entity field types to MySQL column types (for SQL generation)
 */
function getMySQLColumnType(fieldType, fieldConfig = {}) {
  switch (fieldType) {
    case 'text':
    case 'email':
      return 'VARCHAR(255)';
    case 'textarea':
      return 'TEXT';
    case 'number':
      return 'DECIMAL(12,2)';
    case 'boolean':
      return 'BOOLEAN';
    case 'date':
      return 'DATE';
    case 'datetime':
      return 'DATETIME(0)';
    case 'select':
    case 'multiselect':
      return 'VARCHAR(500)';
    case 'lookup':
    case 'formula':
    case 'count':
      return 'TEXT';
    default:
      return 'VARCHAR(255)';
  }
}

/**
 * Generate a Drizzle mysqlTable definition for an entity
 * @param {Object} entity - Entity definition with id, name, label
 * @param {Array} fields - Array of field definitions
 * @returns {Object} Drizzle table definition
 */
export function generateEntityRecordSchema(entity, fields = []) {
  if (!entity || !entity.name) {
    throw new Error('Entity must have a name');
  }

  const tableName = `entity_records_${entity.name.toLowerCase().replace(/\s+/g, '_')}`;
  const columns = {
    id: int('id').primaryKey().autoincrement(),
    entityId: int('entity_id').notNull(),
    data: text('data').notNull(),
    createdBy: int('created_by').notNull(),
    createdAt: datetime('created_at', { mode: 'date', fsp: 0 }),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 0 }),
    deletedAt: datetime('deleted_at', { mode: 'date', fsp: 0 }),
  };

  // Add individual field columns for indexing/filtering
  fields.forEach((field) => {
    const columnName = field.name.toLowerCase().replace(/\s+/g, '_');
    const columnBuilder = getDrizzleColumnType(field.type, field.name, field);

    // Build the column - nullable if not required
    let column = columnBuilder();

    if (!field.required) {
      column = column.notNull(false);
    } else {
      column = column.notNull();
    }

    columns[columnName] = column;
  });

  return table(tableName, columns);
}

/**
 * Format a default value for SQL based on field type
 * @param {string} fieldType - The field type
 * @param {string|number|boolean} value - The default value
 * @returns {string} SQL formatted default value
 */
function formatDefaultValue(fieldType, value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  switch (fieldType) {
    case 'number':
      return `DEFAULT ${Number(value)}`;
    case 'boolean':
      return `DEFAULT ${value ? 'TRUE' : 'FALSE'}`;
    case 'date':
    case 'datetime':
      // Ensure ISO format
      return `DEFAULT '${String(value).substring(0, 10)}'`;
    case 'text':
    case 'email':
    case 'textarea':
    case 'select':
    case 'multiselect':
    case 'lookup':
    case 'formula':
    case 'count':
    default:
      // Escape single quotes by doubling them
      const escaped = String(value).replace(/'/g, "''");
      return `DEFAULT '${escaped}'`;
  }
}

/**
 * Generate a MySQL CREATE TABLE statement for an entity
 * @param {Object} entity - Entity definition with id, name, label
 * @param {Array} fields - Array of field definitions
 * @returns {string} SQL CREATE TABLE statement
 */
export function generateCreateTableSQL(entity, fields = []) {
  if (!entity || !entity.name) {
    throw new Error('Entity must have a name');
  }

  const tableName = `entity_records_${entity.name.toLowerCase().replace(/\s+/g, '_')}`;
  const lines = [];

  lines.push(`CREATE TABLE IF NOT EXISTS \`${tableName}\` (`);
  lines.push('  `id` INT AUTO_INCREMENT PRIMARY KEY,');
  lines.push('  `entity_id` INT NOT NULL,');
  lines.push('  `data` LONGTEXT NOT NULL,');
  lines.push('  `created_by` INT NOT NULL,');
  lines.push('  `created_at` DATETIME(0) DEFAULT CURRENT_TIMESTAMP,');
  lines.push('  `updated_at` DATETIME(0) DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,');
  lines.push('  `deleted_at` DATETIME(0) NULL,');

  // Add individual field columns
  fields.forEach((field) => {
    const columnName = field.name.toLowerCase().replace(/\s+/g, '_');
    const columnType = getMySQLColumnType(field.type, field);
    const nullable = field.required ? '' : ' NULL';
    const unique = field.unique ? ' UNIQUE' : '';
    const defaultValue = field.defaultValue ? ` ${formatDefaultValue(field.type, field.defaultValue)}` : '';

    lines.push(`  \`${columnName}\` ${columnType}${nullable}${unique}${defaultValue},`);
  });

  // Add indexes
  lines.push('  KEY `idx_entity_id` (`entity_id`),');
  lines.push('  KEY `idx_created_at` (`created_at`),');
  lines.push('  KEY `idx_deleted_at` (`deleted_at`)');

  lines.push(');');

  return lines.join('\n');
}
