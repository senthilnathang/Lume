/**
 * @fileoverview SchemaGenerator - Generate Drizzle table schemas from EntityDefinition
 * Converts entity field definitions to Drizzle ORM schema
 */

import logger from '../services/logger.js';

class SchemaGenerator {
  /**
   * Generate Drizzle schema for an entity
   * @param {EntityDefinition} entity - Entity definition
   * @returns {Object} Drizzle table schema definition
   */
  static generateSchema(entity) {
    if (!entity || !entity.tableName) {
      throw new Error('Entity must have a tableName');
    }

    logger.debug(`[SchemaGenerator] Generating schema for ${entity.slug}`);

    const columns = {};

    // Generate columns from fields
    for (const field of entity.fields || []) {
      const column = this.generateColumn(field, entity);
      if (column) {
        columns[field.name] = column;
      }
    }

    // Add soft delete column if enabled
    if (entity.softDelete) {
      columns.deleted_at = {
        type: 'datetime',
        nullable: true,
      };
    }

    // Add audit columns if enabled
    if (entity.auditable) {
      columns.created_at = {
        type: 'datetime',
        defaultValue: () => new Date(),
      };
      columns.updated_at = {
        type: 'datetime',
        defaultValue: () => new Date(),
      };
    }

    const schema = {
      tableName: entity.tableName,
      columns,
      indexes: this.generateIndexes(entity),
    };

    logger.debug(`[SchemaGenerator] Generated schema for ${entity.slug} with ${Object.keys(columns).length} columns`);

    return schema;
  }

  /**
   * Generate a single column definition
   * @private
   * @param {FieldDefinition} field - Field definition
   * @param {EntityDefinition} entity - Parent entity
   * @returns {Object|null} Column definition or null if computed
   */
  static generateColumn(field, entity) {
    // Skip computed fields - they're virtual
    if (field.computed) {
      return null;
    }

    const column = {
      type: this.mapFieldType(field.type),
      nullable: !field.required,
      primaryKey: field.name === 'id',
      unique: field.unique || false,
    };

    // Add default value
    if (field.defaultValue !== null && field.defaultValue !== undefined) {
      if (typeof field.defaultValue === 'function') {
        column.defaultValue = field.defaultValue;
      } else {
        column.defaultValue = field.defaultValue;
      }
    } else if (field.type === 'boolean') {
      column.defaultValue = false;
    }

    return column;
  }

  /**
   * Map field type to Drizzle/database type
   * @private
   * @param {string} fieldType - Field type
   * @returns {string} Database type
   */
  static mapFieldType(fieldType) {
    const typeMap = {
      text: 'varchar',
      email: 'varchar',
      phone: 'varchar',
      url: 'varchar',
      color: 'varchar',
      'rich-text': 'text', // Use TEXT for rich content
      number: 'integer',
      date: 'date',
      datetime: 'datetime',
      boolean: 'boolean',
      select: 'varchar',
      'multi-select': 'json',
      relation: 'integer', // Foreign key as integer ID
    };

    return typeMap[fieldType] || 'varchar';
  }

  /**
   * Generate indexes for an entity
   * @private
   * @param {EntityDefinition} entity - Entity definition
   * @returns {Object[]} Indexes array
   */
  static generateIndexes(entity) {
    const indexes = [];

    // Index on soft delete column for queries
    if (entity.softDelete) {
      indexes.push({
        columns: ['deleted_at'],
        name: `idx_${entity.tableName}_deleted_at`,
      });
    }

    // Index on created_at for sorting/filtering
    if (entity.auditable) {
      indexes.push({
        columns: ['created_at'],
        name: `idx_${entity.tableName}_created_at`,
      });
    }

    // Index explicitly marked fields
    for (const field of entity.fields || []) {
      if (field.indexed && field.name !== 'id') {
        indexes.push({
          columns: [field.name],
          name: `idx_${entity.tableName}_${field.name}`,
        });
      }
    }

    // Index relation foreign keys
    for (const relation of entity.relations || []) {
      if (relation.type === 'many-to-one') {
        const fkColumn = relation.foreignKey || `${relation.name}_id`;
        indexes.push({
          columns: [fkColumn],
          name: `idx_${entity.tableName}_${fkColumn}`,
        });
      }
    }

    return indexes;
  }

  /**
   * Generate SQL for creating table
   * @param {EntityDefinition} entity - Entity definition
   * @returns {string} SQL CREATE TABLE statement
   */
  static generateSQL(entity) {
    const schema = this.generateSchema(entity);
    const { tableName, columns } = schema;

    let sql = `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;

    const columnDefs = [];
    for (const [name, def] of Object.entries(columns)) {
      let colDef = `  ${name} ${def.type.toUpperCase()}`;

      if (def.primaryKey) {
        colDef += ' PRIMARY KEY AUTO_INCREMENT';
      }

      if (!def.nullable && !def.primaryKey) {
        colDef += ' NOT NULL';
      }

      if (def.unique) {
        colDef += ' UNIQUE';
      }

      columnDefs.push(colDef);
    }

    sql += columnDefs.join(',\n');
    sql += '\n);\n';

    // Add indexes
    for (const index of schema.indexes) {
      sql += `CREATE INDEX ${index.name} ON ${tableName} (${index.columns.join(', ')});\n`;
    }

    return sql;
  }

  /**
   * Validate entity schema
   * @param {EntityDefinition} entity - Entity definition
   * @returns {string[]} Array of validation errors (empty if valid)
   */
  static validate(entity) {
    const errors = [];

    if (!entity.tableName) {
      errors.push('tableName is required');
    }

    if (!entity.fields || entity.fields.length === 0) {
      errors.push('Entity must have at least one field');
    }

    // Check for duplicate field names
    const fieldNames = new Set();
    for (const field of entity.fields || []) {
      if (fieldNames.has(field.name)) {
        errors.push(`Duplicate field name: ${field.name}`);
      }
      fieldNames.add(field.name);

      // Check field type is valid
      const validTypes = [
        'text', 'email', 'phone', 'url', 'color', 'rich-text',
        'number', 'date', 'datetime', 'boolean', 'select', 'multi-select', 'relation',
      ];
      if (!validTypes.includes(field.type)) {
        errors.push(`Invalid field type: ${field.type}`);
      }
    }

    return errors;
  }
}

export default SchemaGenerator;
