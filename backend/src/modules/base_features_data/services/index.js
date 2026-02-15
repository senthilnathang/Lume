/**
 * Data Management Services
 * Import/export workflow with model introspection via DrizzleAdapter
 */

export class FeaturesDataService {
  constructor(models) {
    this.models = models;
  }

  // ── Model Introspection ─────────────────────────────────────────

  /**
   * Get all importable/exportable models with their fields
   */
  getAvailableModels() {
    const result = [];

    for (const [name, adapter] of Object.entries(this.models)) {
      const fieldMeta = adapter.getFields();
      const fields = [];

      for (const [fieldName, info] of Object.entries(fieldMeta)) {
        if (['id', 'createdAt', 'updatedAt', 'deletedAt', 'created_at', 'updated_at', 'deleted_at'].includes(fieldName)) continue;

        fields.push({
          name: info.field || fieldName,
          display_name: this._toDisplayName(fieldName),
          field_type: this._mapDrizzleType(info.type),
          required: !info.allowNull,
          default_value: info.defaultValue ?? null,
        });
      }

      if (fields.length > 0) {
        result.push({
          name,
          display_name: this._toDisplayName(name),
          description: `${name} model`,
          fields,
          table_name: name,
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
    const adapter = this.models[modelName];
    if (!adapter) throw new Error(`Model "${modelName}" not found`);

    const fieldMeta = adapter.getFields();
    const errors = [];
    let validRows = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let rowValid = true;

      for (const mapping of columnMappings) {
        const { source_column, target_field } = mapping;
        if (!target_field) continue;

        const value = row[source_column];
        const attr = Object.values(fieldMeta).find(a => (a.field || a.fieldName) === target_field) ||
                     fieldMeta[target_field];

        if (!attr) continue;

        // Check required
        if (!attr.allowNull && (!value || value === '')) {
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
    const adapter = this.models[modelName];
    if (!adapter) throw new Error(`Model "${modelName}" not found`);

    const fieldMeta = adapter.getFields();
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
          record[mapping.target_field] = this._convertValue(value, mapping.target_field, fieldMeta);
        }
      }

      try {
        if (updateExisting) {
          // Try to find existing record by unique fields
          const uniqueFields = this._getUniqueFields(fieldMeta);
          let existing = null;

          for (const field of uniqueFields) {
            if (record[field]) {
              const result = await adapter.findAll({ where: [[field, '=', record[field]]], limit: 1 });
              if (result.rows.length > 0) {
                existing = result.rows[0];
                break;
              }
            }
          }

          if (existing) {
            await adapter.update(existing.id, record);
            updatedRows++;
            continue;
          }
        }

        await adapter.create(record);
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
    const adapter = this.models[modelName];
    if (!adapter) throw new Error(`Model "${modelName}" not found`);

    const where = [];

    // Search across common text fields
    if (search) {
      const fieldMeta = adapter.getFields();
      const searchableFields = Object.entries(fieldMeta)
        .filter(([_, info]) => {
          const type = (info.type || '').toLowerCase();
          return ['string', 'text', 'varchar'].some(t => type.includes(t));
        })
        .map(([name]) => name);

      // Build OR-style search using 'contains' on each searchable field
      // DrizzleAdapter supports 'contains' operator for LIKE %value%
      if (searchableFields.length > 0) {
        // Use first searchable field with contains for simplicity
        // If adapter supports OR logic via domain tuples, use it; otherwise search first text field
        for (const field of searchableFields) {
          where.push([field, 'contains', search]);
        }
      }
    }

    // Ordering
    let order;
    if (orderBy) {
      const desc = orderBy.startsWith('-');
      const field = desc ? orderBy.slice(1) : orderBy;
      order = [[field, desc ? 'DESC' : 'ASC']];
    } else {
      order = [['id', 'ASC']];
    }

    const queryOptions = { where, order };
    if (limit) {
      queryOptions.limit = parseInt(limit, 10);
    }

    const result = await adapter.findAll(queryOptions);
    const count = where.length > 0 ? await adapter.count(where) : result.count;

    return { data: result.rows, total_records: count };
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
    const result = await this.models.FeatureFlag.findAll({
      order: [['sequence', 'ASC']],
    });

    return result.rows.map(flag => {
      if (!flag.enabled) return { ...flag, active: false };
      if (flag.enabledFor && flag.enabledFor.length > 0) {
        const active = userId && flag.enabledFor.includes(userId);
        return { ...flag, active };
      }
      if (flag.disabledFor && flag.disabledFor.includes(userId)) {
        return { ...flag, active: false };
      }
      const now = new Date();
      if (flag.expiresAt && new Date(flag.expiresAt) < now) {
        return { ...flag, active: false };
      }
      return { ...flag, active: true };
    });
  }

  async isFeatureEnabled(key, userId = null) {
    const result = await this.models.FeatureFlag.findAll({
      where: [['key', '=', key]],
      limit: 1
    });
    const flag = result.rows[0];
    if (!flag || !flag.enabled) return false;
    if (flag.enabledFor && flag.enabledFor.length > 0) {
      return userId && flag.enabledFor.includes(userId);
    }
    if (flag.disabledFor && flag.disabledFor.includes(userId)) return false;
    if (flag.expiresAt && new Date(flag.expiresAt) < new Date()) return false;
    return true;
  }

  async toggleFeature(key, enabled) {
    const result = await this.models.FeatureFlag.findAll({
      where: [['key', '=', key]],
      limit: 1
    });
    const flag = result.rows[0];
    if (!flag) return null;
    return this.models.FeatureFlag.update(flag.id, { enabled });
  }

  async createFeature(data) {
    // Auto-generate key from name if not provided
    if (!data.key && data.name) {
      data.key = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    }
    // Map is_enabled to enabled if needed
    if (data.is_enabled !== undefined && data.enabled === undefined) {
      data.enabled = data.is_enabled;
      delete data.is_enabled;
    }
    return this.models.FeatureFlag.create(data);
  }

  async updateFeature(id, data) {
    const flag = await this.models.FeatureFlag.findById(id);
    if (!flag) return null;
    return this.models.FeatureFlag.update(id, data);
  }

  async deleteFeature(id) {
    const flag = await this.models.FeatureFlag.findById(id);
    if (!flag) return null;
    await this.models.FeatureFlag.destroy(id);
    return flag;
  }

  // ── Private Helpers ────────────────────────────────────────────

  _mapDrizzleType(type) {
    if (!type) return 'string';
    const t = type.toLowerCase();

    if (t.includes('int') || t.includes('serial')) return 'integer';
    if (t.includes('float') || t.includes('double') || t.includes('decimal') || t.includes('numeric') || t.includes('real')) return 'float';
    if (t.includes('bool')) return 'boolean';
    if (t.includes('datetime') || t.includes('timestamp')) return 'datetime';
    if (t.includes('date')) return 'date';
    if (t.includes('json')) return 'json';
    if (t.includes('enum')) return 'select';
    if (t.includes('array')) return 'array';
    if (t.includes('text')) return 'string';
    if (t.includes('varchar') || t.includes('char') || t.includes('string') || t.includes('uuid')) return 'string';
    return 'string';
  }

  _toDisplayName(name) {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  _validateFieldType(value, attr) {
    const type = this._mapDrizzleType(attr.type);

    switch (type) {
      case 'integer':
        if (!/^-?\d+$/.test(value)) return `Expected integer, got "${value}"`;
        break;
      case 'float':
        if (isNaN(parseFloat(value))) return `Expected number, got "${value}"`;
        break;
      case 'boolean':
        if (!['true', 'false', '1', '0', 'yes', 'no'].includes(value.toLowerCase())) {
          return `Expected boolean, got "${value}"`;
        }
        break;
      case 'datetime':
      case 'date':
        if (isNaN(Date.parse(value))) return `Expected date, got "${value}"`;
        break;
    }
    return null;
  }

  _convertValue(value, fieldName, fieldMeta) {
    const attr = fieldMeta[fieldName] ||
                 Object.values(fieldMeta).find(a => a.field === fieldName);
    if (!attr) return value;

    const type = this._mapDrizzleType(attr.type);

    switch (type) {
      case 'integer':
        return parseInt(value, 10);
      case 'float':
        return parseFloat(value);
      case 'boolean':
        return ['true', '1', 'yes'].includes(String(value).toLowerCase());
      case 'datetime':
      case 'date':
        return new Date(value);
      case 'json':
        try { return JSON.parse(value); } catch { return value; }
      default:
        return value;
    }
  }

  _getUniqueFields(fieldMeta) {
    const uniqueFields = [];

    for (const [name, attr] of Object.entries(fieldMeta)) {
      if (attr.unique === true) uniqueFields.push(name);
    }

    // Common unique candidates
    const candidates = ['email', 'key', 'code', 'slug', 'username'];
    for (const c of candidates) {
      if (fieldMeta[c] && !uniqueFields.includes(c)) {
        uniqueFields.push(c);
      }
    }

    return uniqueFields;
  }
}

export default { FeaturesDataService };
