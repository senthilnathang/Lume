/**
 * RecordService - CRUD operations for dynamic entity records
 *
 * Manages records (data instances) for custom entities created via the entity builder UI.
 * Provides record creation, retrieval, validation, updating, and deletion with company scoping
 * and field-level access control.
 *
 * Usage:
 *   import { RecordService } from '../services/record.service.js';
 *   import { prisma } from '../db/prisma.js';
 *   import { AccessControlService } from './access-control.service.js';
 *   import { ViewRendererService } from './view-renderer.service.js';
 *
 *   const acService = new AccessControlService(prisma);
 *   const recordService = new RecordService(prisma, acService);
 *
 *   // Create a record
 *   const record = await recordService.createRecord(1, {
 *     name: 'Product A',
 *     price: 99.99,
 *     email: 'contact@example.com',
 *   }, 5);
 *
 *   // Get a record
 *   const record = await recordService.getRecord(123, 5);
 *
 *   // List records
 *   const { records, total, page, limit, hasMore } = await recordService.listRecords(
 *     1,
 *     5,
 *     { page: 1, limit: 20, filters: {}, sort: { createdAt: 'desc' } }
 *   );
 *
 *   // Update a record
 *   const updated = await recordService.updateRecord(123, { price: 149.99 }, 5);
 *
 *   // Delete a record (soft delete by default)
 *   const deleted = await recordService.deleteRecord(123, true, 5);
 *
 *   // Restore a soft-deleted record
 *   const restored = await recordService.restoreRecord(123, 5);
 */

// Field type validators
const FIELD_TYPE_VALIDATORS = {
  text: (value) => typeof value === 'string',
  email: (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  phone: (value) => typeof value === 'string' && /^[\d\s\-\+\(\)]+$/.test(value),
  number: (value) => typeof value === 'number' && !isNaN(value),
  date: (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value),
  datetime: (value) => typeof value === 'string' && !isNaN(Date.parse(value)),
  boolean: (value) => typeof value === 'boolean',
  select: (value) => typeof value === 'string',
  'multi-select': (value) => Array.isArray(value) && value.every(v => typeof v === 'string'),
  'rich-text': (value) => typeof value === 'string' || typeof value === 'object',
  url: (value) => typeof value === 'string' && /^https?:\/\//.test(value),
  color: (value) => typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value),
};

export class RecordService {
  /**
   * @param {Object} prisma - Prisma client instance
   * @param {AccessControlService} accessControlService - For company scoping
   * @param {ViewRendererService} [viewRendererService] - For view metadata (optional)
   */
  constructor(prisma, accessControlService, viewRendererService = null) {
    if (!prisma) {
      throw new Error('RecordService requires a Prisma client instance');
    }
    if (!accessControlService) {
      throw new Error('RecordService requires an AccessControlService instance');
    }

    this.prisma = prisma;
    this.accessControl = accessControlService;
    this.viewRenderer = viewRendererService;
  }

  /**
   * Get entity with all non-deleted fields
   *
   * @async
   * @param {number} entityId - Entity ID
   * @returns {Promise<Object>} Entity with fields array
   * @throws {Error} If entity not found
   */
  async getEntitySchema(entityId) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
    });

    if (!entity) {
      throw new Error(`Entity with ID ${entityId} not found`);
    }

    const fields = await this.prisma.entityField.findMany({
      where: {
        entityId,
        deletedAt: null,
      },
      orderBy: { sequence: 'asc' },
    });

    return {
      ...entity,
      fields,
    };
  }

  /**
   * Validate record data against entity schema
   *
   * Checks:
   * - Required fields are present and non-null
   * - Field values match expected types
   * - Email fields have valid email format
   *
   * @param {Object[]} fields - Array of EntityField objects
   * @param {Object} data - Data to validate
   * @returns {Object} Validation result: { valid: bool, errors: { fieldName: string } }
   */
  validateRecord(fields, data) {
    const errors = {};

    // Check required fields
    for (const field of fields) {
      if (field.required && (!data.hasOwnProperty(field.name) || data[field.name] === null || data[field.name] === '')) {
        errors[field.name] = `${field.label || field.name} is required`;
      }
    }

    // Check field types
    for (const field of fields) {
      if (data.hasOwnProperty(field.name) && data[field.name] !== null && data[field.name] !== '') {
        const validator = FIELD_TYPE_VALIDATORS[field.type];

        if (validator && !validator(data[field.name])) {
          if (field.type === 'email') {
            errors[field.name] = `${field.label || field.name} must be a valid email address`;
          } else if (field.type === 'number') {
            errors[field.name] = `${field.label || field.name} must be a number`;
          } else if (field.type === 'url') {
            errors[field.name] = `${field.label || field.name} must be a valid URL`;
          } else if (field.type === 'color') {
            errors[field.name] = `${field.label || field.name} must be a valid hex color`;
          } else {
            errors[field.name] = `${field.label || field.name} has invalid format for type ${field.type}`;
          }
        }
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Create a new record
   *
   * @async
   * @param {number} entityId - Entity ID
   * @param {Object} data - Record data (field values)
   * @param {number} companyId - Company ID for scoping
   * @returns {Promise<Object>} Created EntityRecord
   * @throws {Error} If entity not found or validation fails
   */
  async createRecord(entityId, data, companyId) {
    // Get entity schema
    const schema = await this.getEntitySchema(entityId);

    // Validate data
    const validation = this.validateRecord(schema.fields, data);
    if (!validation.valid) {
      const err = new Error('Record validation failed');
      err.errors = validation.errors;
      throw err;
    }

    // Create record
    const record = await this.prisma.entityRecord.create({
      data: {
        entityId,
        data: JSON.stringify(data),
        companyId,
        visibility: 'private',
        createdBy: 1, // Default system user
      },
    });

    // Return with parsed data
    return {
      ...record,
      data: JSON.parse(record.data),
    };
  }

  /**
   * Get a single record by ID
   *
   * @async
   * @param {number} recordId - Record ID
   * @param {number} companyId - Company ID for access control
   * @returns {Promise<Object>} EntityRecord with parsed data
   * @throws {Error} If record not found or access denied
   */
  async getRecord(recordId, companyId) {
    let query = {
      where: { id: recordId },
    };

    // Apply company scoping
    query = this.accessControl.scopeQuery(query, companyId);

    const record = await this.prisma.entityRecord.findFirst(query);

    if (!record) {
      throw new Error('Record not found or access denied');
    }

    // Parse and return data
    return {
      ...record,
      data: JSON.parse(record.data),
    };
  }

  /**
   * List records for an entity with pagination and filtering
   *
   * @async
   * @param {number} entityId - Entity ID
   * @param {number} companyId - Company ID for access control
   * @param {Object} options - Pagination and filtering options
   * @param {number} options.page - Page number (default 1)
   * @param {number} options.limit - Records per page (default 20)
   * @param {Object} options.filters - Additional where filters (optional)
   * @param {Object} options.sort - Sort order, e.g. { createdAt: 'desc' } (default { createdAt: 'desc' })
   * @returns {Promise<Object>} { records: [], total: number, page: number, limit: number, hasMore: boolean }
   */
  async listRecords(entityId, companyId, options = {}) {
    const { page = 1, limit = 20, filters = {}, sort = { createdAt: 'desc' } } = options;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build query
    let query = {
      where: {
        entityId,
        deletedAt: null,
        ...filters,
      },
      skip,
      take: limit,
      orderBy: sort,
    };

    // Apply company scoping
    query = this.accessControl.scopeQuery(query, companyId);

    // Query records and count
    const [records, total] = await Promise.all([
      this.prisma.entityRecord.findMany(query),
      this.prisma.entityRecord.count({
        where: query.where,
      }),
    ]);

    // Parse data in records
    const parsedRecords = records.map(r => ({
      ...r,
      data: JSON.parse(r.data),
    }));

    return {
      records: parsedRecords,
      total,
      page,
      limit,
      hasMore: skip + limit < total,
    };
  }

  /**
   * Update an existing record
   *
   * @async
   * @param {number} recordId - Record ID
   * @param {Object} data - Partial data to update
   * @param {number} companyId - Company ID for access control
   * @returns {Promise<Object>} Updated EntityRecord with parsed data
   * @throws {Error} If record not found, access denied, or validation fails
   */
  async updateRecord(recordId, data, companyId) {
    // Get existing record (validates access)
    const existingRecord = await this.getRecord(recordId, companyId);

    // Get entity schema
    const schema = await this.getEntitySchema(existingRecord.entityId);

    // Merge existing data with new data
    const mergedData = {
      ...existingRecord.data,
      ...data,
    };

    // Validate merged data
    const validation = this.validateRecord(schema.fields, mergedData);
    if (!validation.valid) {
      const err = new Error('Record validation failed');
      err.errors = validation.errors;
      throw err;
    }

    // Update record
    const updated = await this.prisma.entityRecord.update({
      where: { id: recordId },
      data: {
        data: JSON.stringify(mergedData),
        updatedAt: new Date(),
      },
    });

    return {
      ...updated,
      data: JSON.parse(updated.data),
    };
  }

  /**
   * Delete a record (soft or hard delete)
   *
   * @async
   * @param {number} recordId - Record ID
   * @param {boolean} softDelete - Use soft delete (set deletedAt) or hard delete (default true)
   * @param {number} companyId - Company ID for access control
   * @returns {Promise<Object>} Deleted/updated record
   * @throws {Error} If record not found or access denied
   */
  async deleteRecord(recordId, softDelete = true, companyId) {
    // Verify access and record exists
    await this.getRecord(recordId, companyId);

    if (softDelete) {
      // Soft delete: set deletedAt
      const updated = await this.prisma.entityRecord.update({
        where: { id: recordId },
        data: {
          deletedAt: new Date(),
        },
      });

      return {
        ...updated,
        data: JSON.parse(updated.data),
      };
    } else {
      // Hard delete
      const deleted = await this.prisma.entityRecord.delete({
        where: { id: recordId },
      });

      return {
        ...deleted,
        data: JSON.parse(deleted.data),
      };
    }
  }

  /**
   * Restore a soft-deleted record
   *
   * @async
   * @param {number} recordId - Record ID
   * @param {number} companyId - Company ID for access control
   * @returns {Promise<Object>} Restored record with parsed data
   * @throws {Error} If record not found or access denied
   */
  async restoreRecord(recordId, companyId) {
    // Build query without soft-delete filter to find deleted records
    let query = {
      where: { id: recordId },
    };

    // Apply company scoping
    query = this.accessControl.scopeQuery(query, companyId);

    const record = await this.prisma.entityRecord.findFirst(query);

    if (!record) {
      throw new Error('Record not found or access denied');
    }

    // Set deletedAt to null
    const restored = await this.prisma.entityRecord.update({
      where: { id: recordId },
      data: {
        deletedAt: null,
      },
    });

    return {
      ...restored,
      data: JSON.parse(restored.data),
    };
  }
}
