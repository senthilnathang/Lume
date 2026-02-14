/**
 * Data Management Services
 * Import/export workflow with model introspection
 */

export class FeaturesDataService {
  constructor(models, sequelize) {
    this.models = models;
    this.sequelize = sequelize;
  }

  // ── Model Introspection ─────────────────────────────────────────

  /**
   * Get all importable/exportable models with their fields
   */
  getAvailableModels() {
    const allModels = this.sequelize.models;
    const result = [];

    for (const [name, model] of Object.entries(allModels)) {
      // Skip internal/system models
      if (['SequelizeMeta'].includes(name)) continue;

      const fields = [];
      const rawAttributes = model.rawAttributes || {};

      for (const [fieldName, attr] of Object.entries(rawAttributes)) {
        // Skip auto-generated fields
        if (['id', 'createdAt', 'updatedAt', 'deletedAt', 'created_at', 'updated_at', 'deleted_at'].includes(fieldName)) continue;

        const fieldType = this._getFieldType(attr);
        fields.push({
          name: attr.field || fieldName,
          display_name: this._toDisplayName(fieldName),
          field_type: fieldType,
          required: attr.allowNull === false,
          default_value: attr.defaultValue ?? null,
        });
      }

      if (fields.length > 0) {
        result.push({
          name,
          display_name: this._toDisplayName(name),
          description: `${name} model`,
          fields,
          table_name: model.tableName || name,
        });
      }
    }

    return result.sort((a, b) => a.display_name.localeCompare(b.display_name));
  }

  // ── Import Workflow ────────────────────────────────────────────

  /**
   * Parse a CSV file from base64 content
   */
  parseFile(fileContent, fileName, hasHeader = true, delimiter = ',') {
    const buffer = Buffer.from(fileContent, 'base64');
    const text = buffer.toString('utf-8');
    const lines = text.split(/\r?\n/).filter(line => line.trim());

    if (lines.length === 0) {
      throw new Error('File is empty');
    }

    const parseLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    let columns = [];
    let dataStartIndex = 0;

    if (hasHeader) {
      columns = parseLine(lines[0]);
      dataStartIndex = 1;
    } else {
      const firstRow = parseLine(lines[0]);
      columns = firstRow.map((_, i) => `Column_${i + 1}`);
    }

    const rows = [];
    for (let i = dataStartIndex; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      const row = {};
      columns.forEach((col, idx) => {
        row[col] = values[idx] || '';
      });
      rows.push(row);
    }

    return { columns, rows, totalRows: rows.length };
  }

  /**
   * Suggest column mappings based on field name similarity
   */
  suggestMappings(csvColumns, modelFields) {
    const mappings = {};

    for (const col of csvColumns) {
      const normalizedCol = col.toLowerCase().replace(/[_\s-]/g, '');

      for (const field of modelFields) {
        const normalizedField = field.name.toLowerCase().replace(/[_\s-]/g, '');
        const normalizedDisplay = field.display_name.toLowerCase().replace(/[_\s-]/g, '');

        if (normalizedCol === normalizedField || normalizedCol === normalizedDisplay) {
          mappings[col] = field.name;
          break;
        }
      }
    }

    return mappings;
  }

  /**
   * Validate import data against model schema
   */
  validateImportData(modelName, rows, columnMappings) {
    const model = this.sequelize.models[modelName];
    if (!model) throw new Error(`Model "${modelName}" not found`);

    const rawAttributes = model.rawAttributes || {};
    const errors = [];
    let validRows = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let rowValid = true;

      for (const mapping of columnMappings) {
        const { source_column, target_field } = mapping;
        if (!target_field) continue;

        const value = row[source_column];
        const attr = Object.values(rawAttributes).find(a => (a.field || a.fieldName) === target_field) ||
                     rawAttributes[target_field];

        if (!attr) continue;

        // Check required
        if (attr.allowNull === false && (!value || value === '')) {
          errors.push({
            row_number: i + 1,
            column: source_column,
            value: value || '',
            error: `"${target_field}" is required`,
          });
          rowValid = false;
          continue;
        }

        // Type validation
        if (value && value !== '') {
          const typeError = this._validateFieldType(value, attr);
          if (typeError) {
            errors.push({
              row_number: i + 1,
              column: source_column,
              value,
              error: typeError,
            });
            rowValid = false;
          }
        }
      }

      if (rowValid) validRows++;
    }

    return {
      is_valid: errors.length === 0,
      total_rows: rows.length,
      valid_rows: validRows,
      error_count: errors.length,
      errors: errors.slice(0, 100),
    };
  }

  /**
   * Execute the import
   */
  async executeImport(modelName, rows, columnMappings, options = {}) {
    const { updateExisting = false, skipErrors = false } = options;
    const model = this.sequelize.models[modelName];
    if (!model) throw new Error(`Model "${modelName}" not found`);

    let importedRows = 0;
    let updatedRows = 0;
    let errorRows = 0;
    const importErrors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const record = {};

      for (const mapping of columnMappings) {
        if (!mapping.target_field) continue;
        const value = row[mapping.source_column];
        if (value !== undefined && value !== '') {
          record[mapping.target_field] = this._convertValue(value, mapping.target_field, model);
        }
      }

      try {
        if (updateExisting) {
          // Try to find existing record by unique fields
          const uniqueFields = this._getUniqueFields(model);
          let existing = null;

          for (const field of uniqueFields) {
            if (record[field]) {
              existing = await model.findOne({ where: { [field]: record[field] } });
              if (existing) break;
            }
          }

          if (existing) {
            await existing.update(record);
            updatedRows++;
            continue;
          }
        }

        await model.create(record);
        importedRows++;
      } catch (err) {
        errorRows++;
        importErrors.push({
          row_number: i + 1,
          error: err.message,
        });
        if (!skipErrors) {
          return {
            status: 'FAILED',
            imported_rows: importedRows,
            updated_rows: updatedRows,
            error_rows: errorRows,
            errors: importErrors,
          };
        }
      }
    }

    const status = errorRows === 0 ? 'COMPLETED' : (importedRows > 0 || updatedRows > 0) ? 'PARTIAL' : 'FAILED';

    return {
      status,
      imported_rows: importedRows,
      updated_rows: updatedRows,
      error_rows: errorRows,
      errors: importErrors.slice(0, 50),
    };
  }

  /**
   * Generate a CSV template for a model
   */
  generateTemplate(modelName) {
    const models = this.getAvailableModels();
    const modelInfo = models.find(m => m.name === modelName);
    if (!modelInfo) throw new Error(`Model "${modelName}" not found`);

    const headers = modelInfo.fields.map(f => f.name);
    const sampleRow = modelInfo.fields.map(f => {
      if (f.required) return `<${f.field_type}_required>`;
      return `<${f.field_type}>`;
    });

    return [headers.join(','), sampleRow.join(',')].join('\n');
  }

  // ── Export Workflow ────────────────────────────────────────────

  /**
   * Get export data from a model
   */
  async getExportData(modelName, options = {}) {
    const { fields, search, limit, orderBy } = options;
    const model = this.sequelize.models[modelName];
    if (!model) throw new Error(`Model "${modelName}" not found`);

    const queryOptions = {
      raw: true,
    };

    // Select specific fields
    if (fields && fields.length > 0) {
      queryOptions.attributes = ['id', ...fields];
    }

    // Search across common text fields
    if (search) {
      const { Op } = (await import('sequelize')).default || await import('sequelize');
      const searchableFields = Object.entries(model.rawAttributes)
        .filter(([_, attr]) => {
          const type = attr.type?.constructor?.name || attr.type?.key || '';
          return ['STRING', 'TEXT'].includes(type);
        })
        .map(([name]) => name);

      if (searchableFields.length > 0) {
        queryOptions.where = {
          [Op.or]: searchableFields.map(field => ({
            [field]: { [Op.like]: `%${search}%` },
          })),
        };
      }
    }

    // Ordering
    if (orderBy) {
      const desc = orderBy.startsWith('-');
      const field = desc ? orderBy.slice(1) : orderBy;
      queryOptions.order = [[field, desc ? 'DESC' : 'ASC']];
    } else {
      queryOptions.order = [['id', 'ASC']];
    }

    // Limit
    if (limit) {
      queryOptions.limit = parseInt(limit, 10);
    }

    const data = await model.findAll(queryOptions);
    const count = await model.count(queryOptions.where ? { where: queryOptions.where } : {});

    return { data, total_records: count };
  }

  /**
   * Export data to CSV string
   */
  exportToCsv(data, fields = null) {
    if (!data || data.length === 0) return '';

    const headers = fields || Object.keys(data[0]).filter(k => k !== 'id');
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = [headers.map(escapeCsv).join(',')];
    for (const row of data) {
      rows.push(headers.map(h => escapeCsv(row[h])).join(','));
    }

    return '\uFEFF' + rows.join('\n');
  }

  /**
   * Export data to JSON string
   */
  exportToJson(data, fields = null) {
    if (fields && fields.length > 0) {
      data = data.map(row => {
        const filtered = {};
        for (const f of fields) {
          filtered[f] = row[f];
        }
        return filtered;
      });
    }
    return JSON.stringify(data, null, 2);
  }

  // ── Feature Flags (kept for backward compat) ──────────────────

  async getFeatureFlags(userId = null) {
    const flags = await this.models.FeatureFlag.findAll({
      order: [['sequence', 'ASC']],
    });

    return flags.map(flag => {
      if (!flag.enabled) return { ...flag.toJSON(), active: false };
      if (flag.enabledFor && flag.enabledFor.length > 0) {
        const active = userId && flag.enabledFor.includes(userId);
        return { ...flag.toJSON(), active };
      }
      if (flag.disabledFor && flag.disabledFor.includes(userId)) {
        return { ...flag.toJSON(), active: false };
      }
      const now = new Date();
      if (flag.expiresAt && new Date(flag.expiresAt) < now) {
        return { ...flag.toJSON(), active: false };
      }
      return { ...flag.toJSON(), active: true };
    });
  }

  async isFeatureEnabled(key, userId = null) {
    const flag = await this.models.FeatureFlag.findOne({ where: { key } });
    if (!flag || !flag.enabled) return false;
    if (flag.enabledFor && flag.enabledFor.length > 0) {
      return userId && flag.enabledFor.includes(userId);
    }
    if (flag.disabledFor && flag.disabledFor.includes(userId)) return false;
    if (flag.expiresAt && new Date(flag.expiresAt) < new Date()) return false;
    return true;
  }

  async toggleFeature(key, enabled) {
    const flag = await this.models.FeatureFlag.findOne({ where: { key } });
    if (flag) await flag.update({ enabled });
    return flag;
  }

  async createFeature(data) {
    return this.models.FeatureFlag.create(data);
  }

  async updateFeature(id, data) {
    const flag = await this.models.FeatureFlag.findByPk(id);
    if (flag) await flag.update(data);
    return flag;
  }

  async deleteFeature(id) {
    const flag = await this.models.FeatureFlag.findByPk(id);
    if (flag) await flag.destroy();
    return flag;
  }

  // ── Private Helpers ────────────────────────────────────────────

  _getFieldType(attr) {
    const typeName = attr.type?.constructor?.name || attr.type?.key || 'STRING';
    const typeMap = {
      STRING: 'string',
      TEXT: 'string',
      INTEGER: 'integer',
      BIGINT: 'integer',
      FLOAT: 'float',
      DOUBLE: 'float',
      DECIMAL: 'float',
      BOOLEAN: 'boolean',
      DATE: 'datetime',
      DATEONLY: 'date',
      JSON: 'json',
      JSONB: 'json',
      ENUM: 'select',
      ARRAY: 'array',
      UUID: 'string',
    };
    return typeMap[typeName] || 'string';
  }

  _toDisplayName(name) {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  _validateFieldType(value, attr) {
    const typeName = attr.type?.constructor?.name || attr.type?.key || 'STRING';

    switch (typeName) {
      case 'INTEGER':
      case 'BIGINT':
        if (!/^-?\d+$/.test(value)) return `Expected integer, got "${value}"`;
        break;
      case 'FLOAT':
      case 'DOUBLE':
      case 'DECIMAL':
        if (isNaN(parseFloat(value))) return `Expected number, got "${value}"`;
        break;
      case 'BOOLEAN':
        if (!['true', 'false', '1', '0', 'yes', 'no'].includes(value.toLowerCase())) {
          return `Expected boolean, got "${value}"`;
        }
        break;
      case 'DATE':
      case 'DATEONLY':
        if (isNaN(Date.parse(value))) return `Expected date, got "${value}"`;
        break;
    }
    return null;
  }

  _convertValue(value, fieldName, model) {
    const attr = model.rawAttributes[fieldName] ||
                 Object.values(model.rawAttributes).find(a => a.field === fieldName);
    if (!attr) return value;

    const typeName = attr.type?.constructor?.name || attr.type?.key || 'STRING';

    switch (typeName) {
      case 'INTEGER':
      case 'BIGINT':
        return parseInt(value, 10);
      case 'FLOAT':
      case 'DOUBLE':
      case 'DECIMAL':
        return parseFloat(value);
      case 'BOOLEAN':
        return ['true', '1', 'yes'].includes(String(value).toLowerCase());
      case 'DATE':
      case 'DATEONLY':
        return new Date(value);
      case 'JSON':
      case 'JSONB':
        try { return JSON.parse(value); } catch { return value; }
      default:
        return value;
    }
  }

  _getUniqueFields(model) {
    const uniqueFields = [];
    const rawAttributes = model.rawAttributes || {};

    for (const [name, attr] of Object.entries(rawAttributes)) {
      if (attr.unique === true) uniqueFields.push(name);
    }

    // Common unique candidates
    const candidates = ['email', 'key', 'code', 'slug', 'username'];
    for (const c of candidates) {
      if (rawAttributes[c] && !uniqueFields.includes(c)) {
        uniqueFields.push(c);
      }
    }

    return uniqueFields;
  }
}

export default { FeaturesDataService };
