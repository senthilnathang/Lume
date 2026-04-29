/**
 * EntityService - CRUD operations for custom entities
 *
 * Manages entity definitions, fields, and views created via the entity builder UI.
 * Provides validation, creation, retrieval, listing, updating, and deletion of entities.
 *
 * Usage:
 *   import { EntityService } from '../services/entity.service.js';
 *   import { DrizzleAdapter } from '../db/adapters/drizzle-adapter.js';
 *   import { customEntities, entityFields } from '../../modules/base/models/schema.js';
 *
 *   const adapter = new DrizzleAdapter(customEntities);
 *   const fieldsAdapter = new DrizzleAdapter(entityFields);
 *   const service = new EntityService(adapter, fieldsAdapter);
 *
 *   // Create entity
 *   const entity = await service.createEntity({
 *     name: 'Product',
 *     slug: 'product',
 *     description: 'Product entity',
 *     icon: 'box',
 *     color: '#FF5733',
 *     isPublishable: true,
 *   });
 *
 *   // Create field
 *   const field = await service.createField(entity.id, {
 *     slug: 'product-name',
 *     name: 'productName',
 *     type: 'text',
 *     label: 'Product Name',
 *     required: true,
 *     position: 1,
 *   });
 *
 *   // Get fields for entity
 *   const fields = await service.getFieldsByEntity(entity.id);
 *
 *   // Update field
 *   const updated = await service.updateField(field.id, { label: 'Updated Label' });
 *
 *   // Delete field
 *   const deleted = await service.deleteField(field.id);
 */

// Valid field types for entity fields
const VALID_FIELD_TYPES = [
  'text',
  'email',
  'phone',
  'number',
  'date',
  'datetime',
  'boolean',
  'select',
  'multi-select',
  'rich-text',
  'url',
  'color',
];

export class EntityService {
  /**
   * @param {DrizzleAdapter} adapter - DrizzleAdapter instance for customEntities table
   * @param {DrizzleAdapter} [fieldsAdapter] - DrizzleAdapter instance for entityFields table
   */
  constructor(adapter, fieldsAdapter) {
    this.adapter = adapter;
    this.fieldsAdapter = fieldsAdapter;
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

  /**
   * Validate field data.
   * Throws an error with .errors object if validation fails.
   *
   * Checks:
   * - name: required, non-empty string
   * - label: required, non-empty string
   * - type: required, must be one of VALID_FIELD_TYPES
   * - slug: if provided, must be lowercase alphanumeric/hyphens/underscores
   *
   * @param {Object} field - Field data to validate
   * @throws {Error} Validation error with .errors property
   */
  validateField(field) {
    const errors = {};

    // Validate name
    if (!field.name || typeof field.name !== 'string' || field.name.trim() === '') {
      errors.name = 'Name is required and must be a non-empty string';
    }

    // Validate label
    if (!field.label || typeof field.label !== 'string' || field.label.trim() === '') {
      errors.label = 'Label is required and must be a non-empty string';
    }

    // Validate type
    if (!field.type || typeof field.type !== 'string') {
      errors.type = 'Type is required and must be a string';
    } else if (!VALID_FIELD_TYPES.includes(field.type)) {
      errors.type = `Type must be one of: ${VALID_FIELD_TYPES.join(', ')}`;
    }

    // Validate slug if provided
    if (field.slug && typeof field.slug === 'string') {
      if (!/^[a-z0-9_-]+$/.test(field.slug)) {
        errors.slug = 'Slug must contain only lowercase letters, numbers, hyphens, and underscores';
      }
    }

    if (Object.keys(errors).length > 0) {
      const err = new Error('Field validation failed');
      err.errors = errors;
      throw err;
    }
  }

  /**
   * Create a new field for an entity.
   *
   * @param {number} entityId - Entity ID
   * @param {Object} field - Field data
   * @param {string} field.slug - URL-friendly slug (lowercase alphanumeric/hyphens/underscores)
   * @param {string} field.name - Field name (camelCase or snake_case)
   * @param {string} field.type - Field type (one of VALID_FIELD_TYPES)
   * @param {string} field.label - Human-readable label
   * @param {string} [field.description] - Field description
   * @param {boolean} [field.required] - Whether field is required
   * @param {boolean} [field.unique] - Whether field must be unique
   * @param {string} [field.validation] - JSON validation rules
   * @param {number} [field.position] - Field position/order (0 by default)
   * @param {string} [field.defaultValue] - Default value for field
   * @returns {Promise<Object>} Created field with entityId
   * @throws {Error} Validation error or database error
   */
  async createField(entityId, field) {
    // Lowercase slug before validation
    const normalizedField = {
      ...field,
      slug: field.slug ? field.slug.toLowerCase() : field.slug,
    };

    // Validate normalized field
    this.validateField(normalizedField);

    // Prepare field data
    const fieldData = {
      entityId: Number(entityId),
      slug: normalizedField.slug,
      name: normalizedField.name,
      type: normalizedField.type,
      label: normalizedField.label,
      description: normalizedField.description || null,
      required: normalizedField.required || false,
      unique: normalizedField.unique || false,
      validation: normalizedField.validation ? JSON.stringify(normalizedField.validation) : null,
      position: normalizedField.position || 0,
      defaultValue: normalizedField.defaultValue || null,
    };

    return this.fieldsAdapter.create(fieldData);
  }

  /**
   * Get all fields for an entity, ordered by position.
   *
   * @param {number} entityId - Entity ID
   * @returns {Promise<Array>} Array of fields ordered by position ascending
   */
  async getFieldsByEntity(entityId) {
    const { rows } = await this.fieldsAdapter.findAll({
      where: [['entityId', '=', Number(entityId)]],
      order: [['position', 'ASC']],
      limit: 1000, // No pagination for fields
      offset: 0,
    });

    // Parse validation JSON if present
    return rows.map(field => ({
      ...field,
      validation: field.validation ? JSON.parse(field.validation) : null,
    }));
  }

  /**
   * Update field metadata.
   *
   * @param {number} fieldId - Field ID
   * @param {Object} data - Fields to update (partial)
   * @returns {Promise<Object|null>} Updated field or null if not found
   */
  async updateField(fieldId, data) {
    const updateData = { ...data };

    // Parse validation if it's a string, stringify if it's an object
    if (updateData.validation !== undefined) {
      if (typeof updateData.validation === 'object' && updateData.validation !== null) {
        updateData.validation = JSON.stringify(updateData.validation);
      }
    }

    const updated = await this.fieldsAdapter.update(Number(fieldId), updateData);

    if (updated && updated.validation) {
      updated.validation = JSON.parse(updated.validation);
    }

    return updated;
  }

  /**
   * Delete field.
   *
   * @param {number} fieldId - Field ID
   * @returns {Promise<Object|boolean>} Deleted field or true if successful
   */
  async deleteField(fieldId) {
    const result = await this.fieldsAdapter.destroy(Number(fieldId));
    return result;
  }

  /**
   * Publish a publishable entity.
   *
   * Checks if entity is publishable before publishing.
   * Sets isPublished=true on the entity.
   *
   * @param {number} id - Entity ID
   * @returns {Promise<Object|null>} Updated entity or null if not found
   * @throws {Error} If entity is not publishable
   */
  async publishEntity(id) {
    // Get entity first
    const entity = await this.getEntity(id);
    if (!entity) {
      return null;
    }

    // Check if publishable
    if (!entity.isPublishable) {
      const err = new Error('Entity is not publishable');
      err.code = 'NOT_PUBLISHABLE';
      throw err;
    }

    // Set isPublished=true
    return this.adapter.update(id, {
      isPublished: true,
    });
  }

  /**
   * Unpublish an entity.
   *
   * Sets isPublished=false on the entity.
   *
   * @param {number} id - Entity ID
   * @returns {Promise<Object|null>} Updated entity or null if not found
   */
  async unpublishEntity(id) {
    return this.adapter.update(id, {
      isPublished: false,
    });
  }

  /**
   * Get all published entities.
   *
   * Returns only entities where isPublished=true AND deletedAt=null.
   * No pagination.
   *
   * @returns {Promise<Array>} Array of published, non-deleted entities
   */
  async getPublishedEntities() {
    const { rows } = await this.adapter.findAll({
      where: [
        ['isPublished', '=', true],
        ['deletedAt', '=', null],
      ],
      order: [['createdAt', 'DESC']],
      limit: 10000,
      offset: 0,
    });

    return rows;
  }
}

export default EntityService;
