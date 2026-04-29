/**
 * Record Service
 * Manages CRUD operations for entity records with company scoping
 */

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
  async createRecord(entityId, recordData, companyId, userId) {
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

    // Create record
    const record = await this.prisma.entityRecord.create({
      data: {
        entityId,
        data: JSON.stringify(recordData),
        createdBy: userId,
        companyId,
        visibility: 'private'
      }
    });

    return {
      ...record,
      data: JSON.parse(record.data)
    };
  }

  /**
   * Get a record by ID with company scoping
   * @param {number} recordId - Record ID
   * @param {number} companyId - Company ID for scoping
   * @returns {Promise<Object|null>} Record or null if not found
   */
  async getRecord(recordId, companyId) {
    const record = await this.prisma.entityRecord.findUnique({
      where: { id: recordId }
    });

    if (!record || record.deletedAt || record.companyId !== companyId) {
      return null;
    }

    return {
      ...record,
      data: JSON.parse(record.data)
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
    const { page = 1, limit = 20, filters = [], sort = {} } = options;

    // Build where conditions for database query
    const where = {
      entityId,
      companyId,
      deletedAt: null
    };

    // Get all records for this entity/company (we'll filter in-memory for JSON data)
    // Note: For better performance with large datasets, consider using full-text search
    const allRecords = await this.prisma.entityRecord.findMany({
      where,
      orderBy: Object.keys(sort).length > 0 ? sort : { createdAt: 'desc' }
    });

    // Parse data
    const parsedRecords = allRecords.map(record => ({
      ...record,
      data: JSON.parse(record.data)
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
  async updateRecord(recordId, updates, companyId) {
    // Get existing record
    const existing = await this.prisma.entityRecord.findUnique({
      where: { id: recordId }
    });

    if (!existing || existing.deletedAt || existing.companyId !== companyId) {
      return null;
    }

    // Parse existing data
    const existingData = JSON.parse(existing.data);

    // Merge updates
    const mergedData = { ...existingData, ...updates };

    // Validate merged data
    const entity = await this.prisma.entity.findUnique({
      where: { id: existing.entityId }
    });

    const fields = await this.prisma.entityField.findMany({
      where: { entityId: existing.entityId, deletedAt: null }
    });

    this.validateRecordData(mergedData, fields);

    // Update record
    const updated = await this.prisma.entityRecord.update({
      where: { id: recordId },
      data: {
        data: JSON.stringify(mergedData)
      }
    });

    return {
      ...updated,
      data: JSON.parse(updated.data)
    };
  }

  /**
   * Delete a record (soft or hard delete)
   * @param {number} recordId - Record ID
   * @param {boolean} softDelete - Whether to soft delete (default true)
   * @param {number} companyId - Company ID for scoping
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteRecord(recordId, softDelete = true, companyId) {
    // Get existing record
    const existing = await this.prisma.entityRecord.findUnique({
      where: { id: recordId }
    });

    if (!existing || existing.companyId !== companyId) {
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

    return true;
  }

  /**
   * Validate record data against entity fields
   * @param {Object} data - Record data
   * @param {Array} fields - Entity field definitions
   * @throws {Error} If validation fails
   */
  validateRecordData(data, fields) {
    const errors = {};

    for (const field of fields) {
      const value = data[field.name];

      // Check required fields
      if (field.required && (value === undefined || value === null || value === '')) {
        errors[field.name] = `${field.label} is required`;
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
