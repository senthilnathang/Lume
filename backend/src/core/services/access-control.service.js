/**
 * AccessControlService - Manages company scoping and field-level permissions
 *
 * Handles:
 * 1. Company-level data scoping (isolates records by company)
 * 2. Field-level read/write permissions based on role
 * 3. Dynamic field visibility and editability enforcement
 */

export class AccessControlService {
  /**
   * @param {Object} prisma - Prisma client instance (or null for testing)
   */
  constructor(prisma = null) {
    this.prisma = prisma;
  }

  /**
   * Add company filter to a Prisma query object
   *
   * @param {Object} query - Prisma query object (with optional where clause)
   * @param {number} companyId - Company ID to filter by
   * @returns {Object} Query with companyId filter added
   *
   * @example
   * const query = { where: { status: 'active' } };
   * const scoped = acService.scopeQuery(query, 5);
   * // => { where: { status: 'active', companyId: 5 } }
   */
  scopeQuery(query, companyId) {
    if (!query) {
      query = {};
    }
    if (!query.where) {
      query.where = {};
    }
    query.where.companyId = companyId;
    return query;
  }

  /**
   * Filter a record to only include allowed fields
   *
   * @param {Object} record - Data object to filter
   * @param {string[]} allowedFields - Array of field names to keep
   * @returns {Object} New object with only allowed fields
   *
   * @example
   * const record = { name: 'John', email: 'john@example.com', salary: 50000 };
   * const filtered = acService.enforceFieldPermissions(record, ['name', 'email']);
   * // => { name: 'John', email: 'john@example.com' }
   */
  enforceFieldPermissions(record, allowedFields) {
    if (!record || typeof record !== 'object') {
      return {};
    }
    if (!Array.isArray(allowedFields)) {
      return {};
    }

    const result = {};
    for (const field of allowedFields) {
      if (field in record) {
        result[field] = record[field];
      }
    }
    return result;
  }

  /**
   * Check if a role can read a specific field
   *
   * @async
   * @param {number} fieldId - Entity field ID
   * @param {number} roleId - Role ID
   * @returns {Promise<boolean>} True if role can read the field
   *
   * @example
   * const canRead = await acService.canReadField(123, 5);
   * // => true or false
   */
  async canReadField(fieldId, roleId) {
    // If no prisma client (testing), allow all access
    if (!this.prisma) {
      return true;
    }

    try {
      const permission = await this.prisma.entityFieldPermission.findUnique({
        where: {
          entity_field_permissions_field_id_role_id: {
            fieldId,
            roleId,
          },
        },
      });

      // Permission exists and canRead is true
      if (!permission) {
        return false;
      }
      return permission.canRead === true;
    } catch (err) {
      console.error('Error checking field read permission:', err.message);
      return false;
    }
  }

  /**
   * Check if a role can write to a specific field
   *
   * @async
   * @param {number} fieldId - Entity field ID
   * @param {number} roleId - Role ID
   * @returns {Promise<boolean>} True if role can write to the field
   *
   * @example
   * const canWrite = await acService.canWriteField(123, 5);
   * // => true or false
   */
  async canWriteField(fieldId, roleId) {
    // If no prisma client (testing), allow all access
    if (!this.prisma) {
      return true;
    }

    try {
      const permission = await this.prisma.entityFieldPermission.findUnique({
        where: {
          entity_field_permissions_field_id_role_id: {
            fieldId,
            roleId,
          },
        },
      });

      // Permission exists and canWrite is true
      if (!permission) {
        return false;
      }
      return permission.canWrite === true;
    } catch (err) {
      console.error('Error checking field write permission:', err.message);
      return false;
    }
  }

  /**
   * Get list of readable field IDs for a role
   *
   * @async
   * @param {number[]} fieldIds - Array of field IDs to check
   * @param {number} roleId - Role ID
   * @returns {Promise<number[]>} Array of field IDs where role has read permission
   *
   * @example
   * const readableFields = await acService.getReadableFields([1, 2, 3, 4], 5);
   * // => [1, 3] (only fields where role can read)
   */
  async getReadableFields(fieldIds, roleId) {
    // If no prisma client (testing), allow all fields
    if (!this.prisma) {
      return fieldIds;
    }

    if (!Array.isArray(fieldIds) || fieldIds.length === 0) {
      return [];
    }

    try {
      const permissions = await this.prisma.entityFieldPermission.findMany({
        where: {
          fieldId: {
            in: fieldIds,
          },
          roleId,
          canRead: true,
        },
        select: {
          fieldId: true,
        },
      });

      return permissions.map(p => p.fieldId);
    } catch (err) {
      console.error('Error fetching readable fields:', err.message);
      return [];
    }
  }
}

export default AccessControlService;
