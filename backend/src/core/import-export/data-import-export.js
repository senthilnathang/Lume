/**
 * @fileoverview Data Import/Export Utilities
 * Handles bulk import and export of entity records with validation and transformation
 */

import logger from '../services/logger.js';

/**
 * @typedef {Object} ImportResult
 * @property {boolean} success - Import success
 * @property {number} total - Total records processed
 * @property {number} imported - Records successfully imported
 * @property {number} skipped - Records skipped
 * @property {number} failed - Records that failed
 * @property {Object[]} errors - Error details
 * @property {number} duration - Time taken (ms)
 */

/**
 * @typedef {Object} ExportOptions
 * @property {string} format - 'json', 'csv', 'xlsx'
 * @property {string[]} [fields] - Fields to export
 * @property {Object} [filters] - Query filters
 * @property {boolean} [includeRelations] - Include related records
 * @property {number} [batchSize] - Records per batch
 */

class DataImportExport {
  constructor(config = {}) {
    this.db = config.db;
    this.adapter = config.adapter;
    this.transformers = new Map(); // entity -> transformer function
    this.validators = new Map(); // entity -> validator function
    this.importHistory = []; // Track imports
  }

  /**
   * Register data transformer for entity
   * @param {string} entity - Entity slug
   * @param {Function} transformer - (record) => transformed record
   */
  registerTransformer(entity, transformer) {
    this.transformers.set(entity, transformer);
  }

  /**
   * Register import validator for entity
   * @param {string} entity - Entity slug
   * @param {Function} validator - (record, index) => { valid, errors }
   */
  registerValidator(entity, validator) {
    this.validators.set(entity, validator);
  }

  /**
   * Import records from JSON array
   * @param {string} entity - Entity slug
   * @param {Object[]} records - Records to import
   * @param {Object} [options] - Import options
   * @returns {Promise<ImportResult>}
   */
  async importFromJSON(entity, records, options = {}) {
    const startTime = Date.now();
    const {
      skipValidation = false,
      skipDuplicates = true,
      onConflict = 'error', // 'error', 'skip', 'update'
      transactional = true,
    } = options;

    const result = {
      success: false,
      total: records.length,
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      duration: 0,
    };

    if (records.length === 0) {
      result.success = true;
      result.duration = Date.now() - startTime;
      return result;
    }

    const transformer = this.transformers.get(entity);
    const validator = this.validators.get(entity);

    try {
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const recordResult = { index: i, record, valid: true, errors: [] };

        try {
          // Validate
          if (!skipValidation && validator) {
            const validation = await validator(record, i);
            if (!validation.valid) {
              recordResult.valid = false;
              recordResult.errors = validation.errors || [];
              result.errors.push(recordResult);
              result.failed++;
              continue;
            }
          }

          // Transform
          let transformed = record;
          if (transformer) {
            transformed = await transformer(record);
          }

          // Check for duplicate
          if (skipDuplicates && transformed.id) {
            const existing = await this.adapter.read(entity, transformed.id);
            if (existing) {
              if (onConflict === 'skip') {
                result.skipped++;
                continue;
              } else if (onConflict === 'update') {
                await this.adapter.update(entity, transformed.id, transformed);
                result.imported++;
                continue;
              } else {
                throw new Error(`Record with id ${transformed.id} already exists`);
              }
            }
          }

          // Import
          await this.adapter.create(entity, transformed);
          result.imported++;
        } catch (error) {
          recordResult.valid = false;
          recordResult.errors = [error.message];
          result.errors.push(recordResult);
          result.failed++;

          if (transactional) {
            throw error;
          }
        }
      }

      result.success = result.failed === 0;
    } catch (error) {
      logger.error(`[DataImportExport] Import failed: ${error.message}`);
      throw error;
    }

    result.duration = Date.now() - startTime;

    this.importHistory.push({
      entity,
      timestamp: new Date(),
      result,
    });

    logger.info(
      `[DataImportExport] Imported ${result.imported}/${result.total} records to ${entity} in ${result.duration}ms`
    );

    return result;
  }

  /**
   * Import records from CSV string
   * @param {string} entity - Entity slug
   * @param {string} csvData - CSV data
   * @param {Object} [options] - Import options
   * @returns {Promise<ImportResult>}
   */
  async importFromCSV(entity, csvData, options = {}) {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have headers and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const records = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const record = {};

      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        const value = values[j];

        // Try to parse as number
        if (value && !isNaN(value) && value !== '') {
          record[header] = Number(value);
        } else if (value === 'true') {
          record[header] = true;
        } else if (value === 'false') {
          record[header] = false;
        } else if (value === 'null') {
          record[header] = null;
        } else {
          record[header] = value || null;
        }
      }

      records.push(record);
    }

    return this.importFromJSON(entity, records, options);
  }

  /**
   * Export records to JSON
   * @param {string} entity - Entity slug
   * @param {ExportOptions} [options] - Export options
   * @returns {Promise<string>}
   */
  async exportToJSON(entity, options = {}) {
    const { fields, filters, includeRelations, batchSize = 100 } = options;

    const records = [];
    let offset = 0;

    while (true) {
      const batch = await this.adapter.list(entity, {
        ...filters,
        limit: batchSize,
        offset,
      });

      if (batch.length === 0) break;

      for (let record of batch) {
        if (fields) {
          record = this.filterFields(record, fields);
        }

        records.push(record);
      }

      offset += batchSize;
    }

    return JSON.stringify(records, null, 2);
  }

  /**
   * Export records to CSV
   * @param {string} entity - Entity slug
   * @param {ExportOptions} [options] - Export options
   * @returns {Promise<string>}
   */
  async exportToCSV(entity, options = {}) {
    const { fields, filters, batchSize = 100 } = options;

    const records = [];
    let offset = 0;

    while (true) {
      const batch = await this.adapter.list(entity, {
        ...filters,
        limit: batchSize,
        offset,
      });

      if (batch.length === 0) break;
      records.push(...batch);
      offset += batchSize;
    }

    if (records.length === 0) {
      return '';
    }

    // Determine headers
    const allKeys = new Set();
    for (const record of records) {
      Object.keys(record).forEach(key => allKeys.add(key));
    }

    let headers = Array.from(allKeys);
    if (fields) {
      headers = headers.filter(h => fields.includes(h));
    }

    // Build CSV
    const lines = [headers.join(',')];

    for (const record of records) {
      const values = headers.map(header => {
        let value = record[header];

        if (value === null || value === undefined) {
          return '';
        }

        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }

        return String(value);
      });

      lines.push(values.join(','));
    }

    return lines.join('\n');
  }

  /**
   * Filter record to include only specified fields
   * @param {Object} record - Record to filter
   * @param {string[]} fields - Fields to keep
   * @returns {Object}
   */
  filterFields(record, fields) {
    const filtered = {};
    for (const field of fields) {
      if (field in record) {
        filtered[field] = record[field];
      }
    }
    return filtered;
  }

  /**
   * Batch import with progress callback
   * @param {string} entity - Entity slug
   * @param {Object[]} records - Records to import
   * @param {Object} [options] - Options
   * @returns {Promise<ImportResult>}
   */
  async batchImport(entity, records, options = {}) {
    const { batchSize = 100, onProgress } = options;
    const allErrors = [];
    let totalImported = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const result = await this.importFromJSON(entity, batch, options);

      totalImported += result.imported;
      allErrors.push(...result.errors);

      if (onProgress) {
        onProgress({
          processed: Math.min(i + batchSize, records.length),
          total: records.length,
          imported: totalImported,
        });
      }
    }

    return {
      success: allErrors.length === 0,
      total: records.length,
      imported: totalImported,
      skipped: 0,
      failed: allErrors.length,
      errors: allErrors,
      duration: 0,
    };
  }

  /**
   * Generate import template
   * @param {string} entity - Entity slug
   * @param {string[]} fields - Fields to include
   * @param {string} format - 'json' or 'csv'
   * @returns {string}
   */
  generateTemplate(entity, fields, format = 'json') {
    const template = {};

    for (const field of fields) {
      template[field] = `<${field}>`;
    }

    if (format === 'json') {
      return JSON.stringify([template], null, 2);
    } else if (format === 'csv') {
      const headers = fields.join(',');
      const values = fields.map(f => `<${f}>`).join(',');
      return `${headers}\n${values}`;
    }

    return '';
  }

  /**
   * Get import history
   * @param {string} [entity] - Filter by entity
   * @returns {Object[]}
   */
  getImportHistory(entity) {
    if (entity) {
      return this.importHistory.filter(h => h.entity === entity);
    }
    return this.importHistory;
  }

  /**
   * Validate records before import
   * @param {string} entity - Entity slug
   * @param {Object[]} records - Records to validate
   * @returns {Promise<{valid: boolean, errors: Object[]}>}
   */
  async validateRecords(entity, records) {
    const validator = this.validators.get(entity);
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      if (validator) {
        const validation = await validator(records[i], i);
        if (!validation.valid) {
          errors.push({
            index: i,
            errors: validation.errors || [],
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Clear import history
   */
  clearHistory() {
    this.importHistory = [];
  }

  /**
   * Get import/export statistics
   * @returns {Object}
   */
  getStats() {
    let totalImported = 0;
    let totalRecords = 0;

    for (const entry of this.importHistory) {
      totalRecords += entry.result.total;
      totalImported += entry.result.imported;
    }

    return {
      totalImports: this.importHistory.length,
      totalRecords,
      totalImported,
      successRate: totalRecords > 0 ? ((totalImported / totalRecords) * 100).toFixed(2) + '%' : 'N/A',
    };
  }

  /**
   * Clear all data
   */
  clear() {
    this.transformers.clear();
    this.validators.clear();
    this.importHistory = [];
    logger.info('[DataImportExport] All data cleared');
  }
}

export default DataImportExport;
