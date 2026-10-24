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
  // Args are `_`-prefixed per the lint config — this class only declares
  // the interface; concrete adapters (prisma-adapter, drizzle-adapter)
  // override these methods and consume the args. See CODE_QUALITY.md.
  async findAll(_options) {
    throw new Error('findAll() not implemented');
  }

  /**
   * Find a single record by primary key.
   * @param {number|string} id
   * @param {Object} options - { include }
   * @returns {Object|null}
   */
  async findById(_id, _options = {}) {
    throw new Error('findById() not implemented');
  }

  /**
   * Create a new record.
   * @param {Object} data - Field values
   * @returns {Object} Created record
   */
  async create(_data) {
    throw new Error('create() not implemented');
  }

  /**
   * Update a record by ID.
   * @param {number|string} id
   * @param {Object} data - Fields to update
   * @returns {Object|null} Updated record
   */
  async update(_id, _data) {
    throw new Error('update() not implemented');
  }

  /**
   * Delete a record by ID (hard delete).
   * @param {number|string} id
   * @returns {boolean} Whether a record was deleted
   */
  async destroy(_id) {
    throw new Error('destroy() not implemented');
  }

  /**
   * Count records matching a where clause.
   * @param {Array} where - Domain tuples
   * @returns {number}
   */
  async count(_where = []) {
    throw new Error('count() not implemented');
  }

  /**
   * Bulk create records.
   * @param {Object[]} records
   * @returns {Object[]}
   */
  async bulkCreate(_records) {
    throw new Error('bulkCreate() not implemented');
  }

  /**
   * Bulk delete records by IDs (hard delete).
   * @param {number[]|string[]} ids
   * @returns {number} Number deleted
   */
  async bulkDestroy(_ids) {
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
