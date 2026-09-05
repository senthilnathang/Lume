/**
 * Record Service
 * Manages CRUD operations for entity records with company scoping
 */

import ValidationRules from '../../../core/services/field-validation.service.js';
import { maskValue } from '../../../core/services/field-mask.service.js';

export class RecordService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * Create a new record for an entity
   * @param {number} entityId - Entity ID
   * @param {Object} recordData - Record data (field values)
   * @param {number} companyId - Company ID for scoping
   * @param {number} userId - User ID who is creating the record
   * @returns {Promise<Object>} Created record
   */
  async getFieldPolicy(fields, roleId) {
    if (!roleId || !this.prisma.entityFieldPermission) {
      return null;
    }
    const ids = (fields || []).map(f => f.id).filter(Boolean);
    if (!ids.length) {
      return null;
    }
    let rows = [];
    try {
      rows = await this.prisma.entityFieldPermission.findMany({
        where: { fieldId: { in: ids }, roleId }
      });
    } catch {
      return null;
    }
    if (!rows.length) {
      return null;
    }
    const byId = new Map((fields || []).map(f => [f.id, f.name]));
    const policy = {
      read: new Set(rows.filter(r => r.canRead).map(r => byId.get(r.fieldId)).filter(Boolean)),
      write: new Set(rows.filter(r => r.canWrite).map(r => byId.get(r.fieldId)).filter(Boolean)),
      masks: new Map(),
    };
    const { getFieldMask } = await import('../../../core/services/field-mask.service.js');
    const denied = rows.filter(r => !r.canRead && byId.get(r.fieldId));
    await Promise.all(denied.map(async (r) => {
      const rule = await getFieldMask(this.prisma, r.fieldId, roleId);
      if (rule) {
        policy.masks.set(byId.get(r.fieldId), rule);
      }
    }));
    return policy;
  }

  stripUnreadable(data, policy) {
    if (!policy) {
      return data;
    }
    const out = {};
    for (const [k, v] of Object.entries(data || {})) {
      if (policy.read.has(k)) {
        out[k] = v;
      } else if (policy.masks && policy.masks.has(k)) {
        out[k] = maskValue(v, policy.masks.get(k).preserveLast);
      }
    }
    return out;
  }

  stripUnwritable(input, fields, policy) {
    if (!policy) {
      return { ...input };
    }
    const formulaNames = new Set((fields || []).filter(f => f.formulaExpression).map(f => f.name));
    const out = {};
    for (const [k, v] of Object.entries(input || {})) {
      if (formulaNames.has(k)) {
        continue;
      }
      if (policy.write.has(k)) {
        out[k] = v;
      }
    }
    return out;
  }

  async createRecord(entityId, recordData, companyId, userId, options = {}) {
    // Validate entity exists
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId }
    });

    if (!entity) {
      throw new Error('Entity not found');
    }

    // Validate fields
    const fields = await this.prisma.entityField.findMany({
      where: { entityId, deletedAt: null }
    });

    this.validateRecordData(recordData, fields);

    // Materialize server-computed formula fields (client values never trusted)
    const { computeFormulaFields } = await import('../../../core/services/formula.service.js');
    const withFormulas = computeFormulaFields(fields, recordData);

    // Drop non-writable input fields when a field policy exists for this role
    const policy = await this.getFieldPolicy(fields, options.roleId);
    const finalData = computeFormulaFields(fields, this.stripUnwritable(withFormulas, fields, policy));

    await this.assertUnique(fields, finalData, entityId, companyId, null);

    const { AccessControlService } = await import('../../../core/services/access-control.service.js');
    const visibility = await new AccessControlService(this.prisma).resolveRecordVisibility(
      entityId, recordData.visibility
    );

    // Create record
    const record = await this.prisma.entityRecord.create({
      data: {
        entityId,
        data: JSON.stringify(finalData),
        createdBy: userId,
        companyId,
        visibility
      }
    });

    return {
      ...record,
      data: this.stripUnreadable(JSON.parse(record.data), policy)
    };
  }

  /**
   * Get a record by ID with company scoping
   * @param {number} recordId - Record ID
   * @param {number} companyId - Company ID for scoping
   * @returns {Promise<Object|null>} Record or null if not found
   */
  isRecordVisible(record, { userId, isPrivileged = false } = {}) {
    if (!record || record.deletedAt) {
      return false;
    }
    if (isPrivileged) {
      return true;
    }
    if (userId === undefined || userId === null) {
      return true;
    }
    if (record.visibility && record.visibility !== 'private') {
      return true;
    }
    return Number(record.createdBy) === Number(userId);
  }

  async getRecord(recordId, companyId, options = {}) {
    const record = await this.prisma.entityRecord.findUnique({
      where: { id: recordId }
    });

    if (!record || record.companyId !== companyId) {
      return null;
    }
    if (!this.isRecordVisible(record, options)) {
      return null;
    }

    const fields = await this.prisma.entityField.findMany({
      where: { entityId: record.entityId, deletedAt: null }
    });
    const policy = await this.getFieldPolicy(fields, options.roleId);

    return {
      ...record,
      data: this.stripUnreadable(JSON.parse(record.data), policy)
    };
  }

  /**
   * List records for an entity with pagination and filtering
   * @param {number} entityId - Entity ID
   * @param {number} companyId - Company ID for scoping
   * @param {Object} options - Query options
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=20] - Records per page
   * @param {Array} [options.filters] - Filter conditions (applied in-memory since data is JSON)
   * @param {Object} [options.sort] - Sort options
   * @returns {Promise<Object>} { records, pagination: { page, limit, total, hasMore } }
   */
  async listRecords(entityId, companyId, options = {}) {
    const { page = 1, limit = 20, filters = [], sort = {}, roleId, userId, isPrivileged = false } = options;

    // Build where conditions for database query
    const where = {
      entityId,
      companyId,
      deletedAt: null
    };
    const scopedToOwner = !isPrivileged && userId !== undefined && userId !== null;
    if (scopedToOwner) {
      where.OR = [
        { visibility: { not: 'private' } },
        { createdBy: userId },
      ];
    }

    // Get all records for this entity/company (we'll filter in-memory for JSON data)
    // Note: For better performance with large datasets, consider using full-text search
    const allRecords = await this.prisma.entityRecord.findMany({
      where,
      orderBy: Object.keys(sort).length > 0 ? sort : { createdAt: 'desc' }
    });

    // Parse data and strip fields this role may not read
    const fields = await this.prisma.entityField.findMany({
      where: { entityId, deletedAt: null }
    });
    const policy = await this.getFieldPolicy(fields, roleId);
    const parsedRecords = allRecords.map(record => ({
      ...record,
      data: this.stripUnreadable(JSON.parse(record.data), policy)
    }));

    // Apply filters in-memory
    let filteredRecords = parsedRecords;
    if (filters && filters.length > 0) {
      filteredRecords = parsedRecords.filter(record => {
        return filters.every(filter => {
          const fieldValue = record.data[filter.field];
          const filterValue = filter.value;
          const operator = filter.operator || 'contains';

          if (operator === 'contains') {
            return String(fieldValue || '').includes(String(filterValue));
          } else if (operator === 'equals') {
            return fieldValue === filterValue;
          } else if (operator === 'startsWith') {
            return String(fieldValue || '').startsWith(String(filterValue));
          }
          return true;
        });
      });
    }

    // Apply pagination
    const total = filteredRecords.length;
    const paginatedRecords = filteredRecords.slice(
      (page - 1) * limit,
      page * limit
    );

    return {
      records: paginatedRecords,
      pagination: {
        page,
        limit,
        total,
        hasMore: (page - 1) * limit + limit < total
      }
    };
  }

  /**
   * Update a record
   * @param {number} recordId - Record ID
   * @param {Object} updates - Fields to update
   * @param {number} companyId - Company ID for scoping
   * @returns {Promise<Object|null>} Updated record or null if not found
   */
  async updateRecord(recordId, updates, companyId, options = {}) {
    // Get existing record
    const existing = await this.prisma.entityRecord.findUnique({
      where: { id: recordId }
    });

    if (!existing || existing.companyId !== companyId) {
      return null;
    }
    if (!this.isRecordVisible(existing, options)) {
      return null;
    }

    // Parse existing data
    const existingData = JSON.parse(existing.data);

    // Validate merged data
    const fields = await this.prisma.entityField.findMany({
      where: { entityId: existing.entityId, deletedAt: null }
    });

    // Drop non-writable fields, recompute formulas, then validate
    const policy = await this.getFieldPolicy(fields, options.roleId);
    const allowedUpdates = this.stripUnwritable(updates, fields, policy);
    const { computeFormulaFields } = await import('../../../core/services/formula.service.js');
    const mergedData = computeFormulaFields(fields, { ...existingData, ...allowedUpdates });

    this.validateRecordData(mergedData, fields);
    await this.assertUnique(fields, mergedData, existing.entityId, companyId, recordId);

    // Update record
    const updated = await this.prisma.entityRecord.update({
      where: { id: recordId },
      data: {
        data: JSON.stringify(mergedData)
      }
    });

    return {
      ...updated,
      data: this.stripUnreadable(JSON.parse(updated.data), policy)
    };
  }

  /**
   * Delete a record (soft or hard delete)
   * @param {number} recordId - Record ID
   * @param {boolean} softDelete - Whether to soft delete (default true)
   * @param {number} companyId - Company ID for scoping
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteRecord(recordId, softDelete = true, companyId, options = {}) {
    // Get existing record
    const existing = await this.prisma.entityRecord.findUnique({
      where: { id: recordId }
    });

    if (!existing || existing.companyId !== companyId) {
      return false;
    }
    if (!this.isRecordVisible(existing, options)) {
      return false;
    }

    if (softDelete) {
      // Soft delete
      await this.prisma.entityRecord.update({
        where: { id: recordId },
        data: { deletedAt: new Date() }
      });
    } else {
      // Hard delete
      await this.prisma.entityRecord.delete({
        where: { id: recordId }
      });
    }

    const { cascadeDeleteRecords } = await import('../../../core/services/cascade.service.js');
    await cascadeDeleteRecords(this.prisma, existing.entityId, recordId, { soft: softDelete });

    return true;
  }

  /**
   * Validate record data against entity fields
   * @param {Object} data - Record data
   * @param {Array} fields - Entity field definitions
   * @throws {Error} If validation fails
   */
  async assertUnique(fields, data, entityId, companyId, excludeId) {
    const uniqueFields = (fields || []).filter((f) => ValidationRules.requiresUnique(f));
    if (!uniqueFields.length) {
      return;
    }
    const errors = {};
    const findRecords = (id) => this.prisma.entityRecord.findMany({
      where: { entityId: id, companyId, deletedAt: null },
    });
    for (const field of uniqueFields) {
      const conflict = await ValidationRules.findUniqueConflict(
        findRecords, entityId, field, data[field.name], excludeId
      );
      if (conflict) {
        errors[field.name] = `${field.label} must be unique`;
      }
    }
    if (Object.keys(errors).length > 0) {
      const error = new Error('Validation failed');
      error.errors = errors;
      throw error;
    }
  }

  validateRecordData(data, fields) {
    const errors = {};

    for (const field of fields) {
      const value = data[field.name];

      // Check required fields (formula fields are server-computed, exempt here)
      if (field.required && !field.formulaExpression && (value === undefined || value === null || value === '')) {
        errors[field.name] = `${field.label} is required`;
      }

      if (value !== undefined && value !== null && value !== '') {
        const ruleError = ValidationRules.applyRules(field, value);
        if (ruleError) {
          errors[field.name] = ruleError;
        }
      }

      // Type-specific validation
      if (value !== undefined && value !== null) {
        switch (field.type) {
          case 'email':
            if (!this.isValidEmail(value)) {
              errors[field.name] = 'Invalid email format';
            }
            break;
          case 'number':
            if (isNaN(Number(value))) {
              errors[field.name] = 'Must be a number';
            }
            break;
          case 'date':
            if (isNaN(Date.parse(value))) {
              errors[field.name] = 'Invalid date format';
            }
            break;
          case 'url':
            if (!this.isValidUrl(value)) {
              errors[field.name] = 'Invalid URL format';
            }
            break;
          case 'currency':
            if (!(typeof value === 'number' || (value && typeof value.amount === 'number'))) {
              errors[field.name] = 'Must be a number or { amount } object';
            }
            break;
          case 'file':
            if (!(typeof value === 'string' || (value && typeof value.url === 'string'))) {
              errors[field.name] = 'Must be a URL string or { url } object';
            }
            break;
          case 'signature':
            if (!(typeof value === 'string' && /^(data:image\/[a-zA-Z+]+;base64,|https?:\/\/)/.test(value))) {
              errors[field.name] = 'Must be a signature data-URL or image URL';
            }
            break;
          case 'lookup':
          case 'master-detail':
            if (!(typeof value === 'number' || typeof value === 'string' || (value && value.id !== undefined))) {
              errors[field.name] = 'Must reference a record id';
            }
            break;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      const error = new Error('Validation failed');
      error.errors = errors;
      throw error;
    }
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid
   */
  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

export default RecordService;
