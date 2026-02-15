/**
 * BaseAdapter — Abstract ORM adapter interface.
 * Provides a unified API that BaseService and createCrudRouter
 * use regardless of the underlying ORM (Prisma or Drizzle).
 *
 * Every concrete adapter must implement these methods.
 */

export class BaseAdapter {
  /**
   * Search records with pagination and filtering.
   * @param {Object} options
   * @param {Array} options.where - Array of [field, operator, value] domain tuples
   * @param {Array} options.order - Array of [field, direction] tuples
   * @param {number} options.limit
   * @param {number} options.offset
   * @param {*} options.include - ORM-specific eager loading config
   * @returns {{ rows: Object[], count: number }}
   */
  async findAll(options) {
    throw new Error('findAll() not implemented');
  }

  /**
   * Find a single record by primary key.
   * @param {number|string} id
   * @param {Object} options - { include }
   * @returns {Object|null}
   */
  async findById(id, options = {}) {
    throw new Error('findById() not implemented');
  }

  /**
   * Create a new record.
   * @param {Object} data - Field values
   * @returns {Object} Created record
   */
  async create(data) {
    throw new Error('create() not implemented');
  }

  /**
   * Update a record by ID.
   * @param {number|string} id
   * @param {Object} data - Fields to update
   * @returns {Object|null} Updated record
   */
  async update(id, data) {
    throw new Error('update() not implemented');
  }

  /**
   * Delete a record by ID (hard delete).
   * @param {number|string} id
   * @returns {boolean} Whether a record was deleted
   */
  async destroy(id) {
    throw new Error('destroy() not implemented');
  }

  /**
   * Count records matching a where clause.
   * @param {Array} where - Domain tuples
   * @returns {number}
   */
  async count(where = []) {
    throw new Error('count() not implemented');
  }

  /**
   * Bulk create records.
   * @param {Object[]} records
   * @returns {Object[]}
   */
  async bulkCreate(records) {
    throw new Error('bulkCreate() not implemented');
  }

  /**
   * Bulk delete records by IDs (hard delete).
   * @param {number[]|string[]} ids
   * @returns {number} Number deleted
   */
  async bulkDestroy(ids) {
    throw new Error('bulkDestroy() not implemented');
  }

  /**
   * Return field metadata for schema introspection.
   * @returns {Object} Field definitions
   */
  getFields() {
    throw new Error('getFields() not implemented');
  }
}

export default BaseAdapter;
