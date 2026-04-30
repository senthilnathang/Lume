/**
 * @fileoverview FieldFilter - Strip forbidden fields from results based on field-level permissions
 */

import logger from '../services/logger.js';

class FieldFilter {
  /**
   * Filter fields from a record or array of records
   * @param {Object|Object[]} data - Record(s) to filter
   * @param {Object} fieldFilters - Field permissions { fieldName: allowed }
   * @param {EntityDefinition} entity - Entity definition (for field metadata)
   * @returns {Object|Object[]} Filtered data
   */
  static filter(data, fieldFilters = {}, entity = null) {
    if (!data) {
      return data;
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(record => this.filterRecord(record, fieldFilters, entity));
    }

    // Handle single record
    return this.filterRecord(data, fieldFilters, entity);
  }

  /**
   * Filter a single record
   * @private
   * @param {Object} record - Record to filter
   * @param {Object} fieldFilters - Field permissions
   * @param {EntityDefinition} entity - Entity definition
   * @returns {Object} Filtered record
   */
  static filterRecord(record, fieldFilters = {}, entity = null) {
    if (!record || typeof record !== 'object') {
      return record;
    }

    const filtered = { ...record };

    // If no filters specified, return all fields
    if (!fieldFilters || Object.keys(fieldFilters).length === 0) {
      return filtered;
    }

    // Get list of allowed fields
    const allowedFields = new Set();

    for (const [field, allowed] of Object.entries(fieldFilters)) {
      if (allowed === true) {
        allowedFields.add(field);
      }
    }

    // If no fields are explicitly allowed, only keep fields with permission
    if (allowedFields.size === 0) {
      // Remove all fields that are explicitly denied
      for (const field of Object.keys(filtered)) {
        if (fieldFilters[field] === false) {
          delete filtered[field];
        }
      }
    } else {
      // Keep only allowed fields + fields without explicit permission
      const keysToDelete = [];
      for (const field of Object.keys(filtered)) {
        // Delete if explicitly denied
        if (fieldFilters[field] === false) {
          keysToDelete.push(field);
        }
      }
      keysToDelete.forEach(field => delete filtered[field]);
    }

    logger.debug(
      `[FieldFilter] Filtered record: kept ${Object.keys(filtered).length} fields`
    );

    return filtered;
  }

  /**
   * Check if a field is readable by user
   * @param {string} fieldName - Field name
   * @param {Object} fieldFilters - Field filters
   * @returns {boolean}
   */
  static isFieldReadable(fieldName, fieldFilters = {}) {
    // If field not in filters, assume readable
    if (!fieldFilters.hasOwnProperty(fieldName)) {
      return true;
    }

    return fieldFilters[fieldName] === true;
  }

  /**
   * Check if a field is writable by user
   * @param {string} fieldName - Field name
   * @param {Object} fieldFilters - Field filters (for read permissions)
   * @param {Object} writeFilters - Write permissions (optional)
   * @returns {boolean}
   */
  static isFieldWritable(fieldName, fieldFilters = {}, writeFilters = null) {
    const filters = writeFilters || fieldFilters;

    // If field not in filters, assume writable
    if (!filters.hasOwnProperty(fieldName)) {
      return true;
    }

    return filters[fieldName] === true;
  }

  /**
   * Get readable fields for a user
   * @param {EntityDefinition} entity - Entity definition
   * @param {Object} fieldFilters - Field permissions
   * @returns {string[]} Array of readable field names
   */
  static getReadableFields(entity, fieldFilters = {}) {
    const readable = [];

    if (!entity || !entity.fields) {
      return readable;
    }

    for (const field of entity.fields) {
      if (this.isFieldReadable(field.name, fieldFilters)) {
        readable.push(field.name);
      }
    }

    return readable;
  }

  /**
   * Get writable fields for a user
   * @param {EntityDefinition} entity - Entity definition
   * @param {Object} fieldFilters - Field permissions
   * @returns {string[]} Array of writable field names
   */
  static getWritableFields(entity, fieldFilters = {}) {
    const writable = [];

    if (!entity || !entity.fields) {
      return writable;
    }

    for (const field of entity.fields) {
      if (this.isFieldWritable(field.name, fieldFilters)) {
        writable.push(field.name);
      }
    }

    return writable;
  }

  /**
   * Validate update payload against field permissions
   * @param {Object} updateData - Update payload
   * @param {Object} fieldFilters - Field permissions
   * @returns {{ valid: boolean, errors: string[] }}
   */
  static validateUpdate(updateData, fieldFilters = {}) {
    const errors = [];

    if (!updateData || typeof updateData !== 'object') {
      return { valid: true, errors: [] };
    }

    for (const [field, value] of Object.entries(updateData)) {
      if (!this.isFieldWritable(field, fieldFilters)) {
        errors.push(`Not allowed to write field: ${field}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize input data to only include allowed fields
   * @param {Object} inputData - Input data from user
   * @param {Object} fieldFilters - Field permissions
   * @returns {Object} Sanitized data with only allowed fields
   */
  static sanitizeInput(inputData, fieldFilters = {}) {
    if (!inputData || typeof inputData !== 'object') {
      return {};
    }

    const sanitized = {};

    for (const [field, value] of Object.entries(inputData)) {
      if (this.isFieldWritable(field, fieldFilters)) {
        sanitized[field] = value;
      }
    }

    logger.debug(
      `[FieldFilter] Sanitized input: kept ${Object.keys(sanitized).length} of ${Object.keys(inputData).length} fields`
    );

    return sanitized;
  }
}

export default FieldFilter;
