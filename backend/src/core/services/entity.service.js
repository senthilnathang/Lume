/**
 * EntityService - CRUD operations for custom entities
 *
 * Manages entity definitions, fields, and views created via the entity builder UI.
 * Provides validation, creation, retrieval, listing, updating, and deletion of entities.
 *
 * Usage:
 *   import { EntityService } from '../services/entity.service.js';
 *   import { DrizzleAdapter } from '../db/adapters/drizzle-adapter.js';
 *   import { customEntities } from '../../modules/base/models/schema.js';
 *
 *   const adapter = new DrizzleAdapter(customEntities);
 *   const service = new EntityService(adapter);
 *
 *   // Create
 *   const entity = await service.createEntity({
 *     name: 'Product',
 *     slug: 'product',
 *     description: 'Product entity',
 *     icon: 'box',
 *     color: '#FF5733',
 *     isPublishable: true,
 *   });
 *
 *   // Read
 *   const entity = await service.getEntity(1);
 *
 *   // List
 *   const { items, total, page, limit, totalPages } = await service.listEntities({
 *     page: 1,
 *     limit: 20,
 *   });
 *
 *   // Update
 *   const updated = await service.updateEntity(1, { name: 'Updated Product' });
 *
 *   // Delete (soft delete)
 *   const deleted = await service.deleteEntity(1);
 */

export class EntityService {
  /**
   * @param {DrizzleAdapter} adapter - DrizzleAdapter instance for customEntities table
   */
  constructor(adapter) {
    this.adapter = adapter;
  }

  /**
   * Validate entity data.
   * Throws an error with .errors object if validation fails.
   *
   * Checks:
   * - name: required, non-empty string
   * - slug: required, lowercase alphanumeric/hyphens/underscores only
   *
   * @param {Object} data - Entity data to validate
   * @throws {Error} Validation error with .errors property
   */
  validateEntity(data) {
    const errors = {};

    // Validate name
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      errors.name = 'Name is required and must be a non-empty string';
    }

    // Validate slug
    if (!data.slug || typeof data.slug !== 'string' || data.slug.trim() === '') {
      errors.slug = 'Slug is required and must be a non-empty string';
    } else if (!/^[a-z0-9_-]+$/.test(data.slug)) {
      errors.slug = 'Slug must contain only lowercase letters, numbers, hyphens, and underscores';
    }

    if (Object.keys(errors).length > 0) {
      const err = new Error('Entity validation failed');
      err.errors = errors;
      throw err;
    }
  }

  /**
   * Create a new entity.
   *
   * @param {Object} data - Entity data
   * @param {string} data.name - Entity name
   * @param {string} data.slug - URL-friendly slug (lowercase alphanumeric/hyphens/underscores)
   * @param {string} [data.description] - Entity description
   * @param {string} [data.icon] - Icon name
   * @param {string} [data.color] - Hex color code
   * @param {boolean} [data.isPublishable] - Whether entity supports publishing
   * @returns {Promise<Object>} Created entity with isPublished=false
   * @throws {Error} Validation error or database error
   */
  async createEntity(data) {
    // Validate first
    this.validateEntity(data);

    // Set default values
    const entityData = {
      ...data,
      isPublished: false,
    };

    return this.adapter.create(entityData);
  }

  /**
   * Get entity by ID.
   *
   * Returns entity with all fields and views loaded.
   * Returns null if entity not found or is deleted.
   *
   * @param {number} id - Entity ID
   * @returns {Promise<Object|null>} Entity object or null
   */
  async getEntity(id) {
    const entity = await this.adapter.findById(id);

    // Return null if entity not found or is deleted
    if (!entity || entity.deletedAt) {
      return null;
    }

    return entity;
  }

  /**
   * List all non-deleted entities with pagination.
   *
   * @param {Object} options - Pagination options
   * @param {number} [options.page=1] - Page number (1-indexed)
   * @param {number} [options.limit=20] - Records per page
   * @returns {Promise<Object>} Pagination result {items, total, page, limit, totalPages}
   */
  async listEntities(options = {}) {
    const { page = 1, limit = 20 } = options;

    // Query with soft-delete filter
    const { rows, count } = await this.adapter.findAll({
      where: [['deletedAt', '=', null]],
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      items: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  /**
   * Update entity metadata.
   *
   * @param {number} id - Entity ID
   * @param {Object} data - Fields to update
   * @returns {Promise<Object|null>} Updated entity or null if not found
   */
  async updateEntity(id, data) {
    return this.adapter.update(id, data);
  }

  /**
   * Delete entity (soft delete - sets deletedAt timestamp).
   *
   * @param {number} id - Entity ID
   * @returns {Promise<Object>} Deleted entity (with deletedAt set)
   */
  async deleteEntity(id) {
    return this.adapter.update(id, {
      deletedAt: new Date(),
    });
  }
}

export default EntityService;
