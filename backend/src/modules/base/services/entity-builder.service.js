/**
 * Entity Builder Service
 * Manages entity CRUD operations, field management, and view creation
 */

export class EntityBuilderService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * Create a new entity
   * @param {number} companyId - Company ID
   * @param {number} userId - User ID who is creating the entity
   * @param {Object} data - Entity data
   * @param {string} data.name - Unique entity name (slug-like)
   * @param {string} data.label - Display label for the entity
   * @param {string} [data.description] - Optional description
   * @returns {Promise<Object>} Created entity object
   */
  async createEntity(companyId, userId, { name, label, description }) {
    // Check for name uniqueness
    const existing = await this.prisma.entity.findUnique({
      where: { name }
    });

    if (existing) {
      throw new Error(`Entity with name ${name} already exists`);
    }

    // Create entity
    const entity = await this.prisma.entity.create({
      data: {
        name,
        label,
        description: description || null,
        moduleId: null,
        createdBy: userId
      }
    });

    return entity;
  }

  /**
   * Get entity with all non-deleted fields
   * @param {number} entityId - Entity ID
   * @returns {Promise<Object>} Entity with fields array
   */
  async getEntity(entityId) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId }
    });

    if (!entity) {
      throw new Error('Entity not found');
    }

    // Get non-deleted fields
    const fields = await this.prisma.entityField.findMany({
      where: {
        entityId,
        deletedAt: null
      },
      orderBy: { sequence: 'asc' }
    });

    // Parse selectOptions JSON for each field
    const parsedFields = fields.map(field => ({
      ...field,
      selectOptions: field.selectOptions ? JSON.parse(field.selectOptions) : null
    }));

    return {
      ...entity,
      fields: parsedFields
    };
  }

  /**
   * Add a field to an entity
   * @param {number} entityId - Entity ID
   * @param {Object} data - Field data
   * @param {string} data.name - Unique field name within entity
   * @param {string} data.label - Display label
   * @param {string} data.type - Field type (text, number, select, etc.)
   * @param {boolean} [data.required] - Whether field is required
   * @param {Array} [data.selectOptions] - Options for select fields
   * @param {string} [data.helpText] - Help text for field
   * @param {string} [data.defaultValue] - Default value
   * @returns {Promise<Object>} Created field with parsed selectOptions
   */
  async addField(entityId, {
    name,
    label,
    type,
    required = false,
    selectOptions,
    helpText,
    defaultValue
  }) {
    // Validate entity exists
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId }
    });

    if (!entity) {
      throw new Error('Entity not found');
    }

    // Check for duplicate field name within entity
    const existing = await this.prisma.entityField.findFirst({
      where: {
        entityId,
        name,
        deletedAt: null
      }
    });

    if (existing) {
      throw new Error(`Field with name ${name} already exists in this entity`);
    }

    // Create field
    const field = await this.prisma.entityField.create({
      data: {
        entityId,
        name,
        label,
        type,
        required,
        selectOptions: selectOptions ? JSON.stringify(selectOptions) : null,
        helpText: helpText || null,
        defaultValue: defaultValue || null,
        sequence: 0,
        slug: name.toLowerCase().replace(/\s+/g, '_')
      }
    });

    // Return with parsed selectOptions
    return {
      ...field,
      selectOptions: field.selectOptions ? JSON.parse(field.selectOptions) : null
    };
  }

  /**
   * Update a field (name and type are immutable)
   * @param {number} fieldId - Field ID
   * @param {Object} updates - Updates to apply
   * @param {string} [updates.label] - New label
   * @param {boolean} [updates.required] - New required status
   * @param {string} [updates.helpText] - New help text
   * @param {Array} [updates.selectOptions] - New select options
   * @param {string} [updates.defaultValue] - New default value
   * @returns {Promise<Object>} Updated field with parsed selectOptions
   */
  async updateField(fieldId, updates) {
    // Check for immutable field changes
    if (updates.name !== undefined) {
      throw new Error('Cannot rename field');
    }

    if (updates.type !== undefined) {
      throw new Error('Cannot change field type');
    }

    // Build safe updates
    const safeUpdates = {};

    if (updates.label !== undefined) {
      safeUpdates.label = updates.label;
    }

    if (updates.required !== undefined) {
      safeUpdates.required = updates.required;
    }

    if (updates.helpText !== undefined) {
      safeUpdates.helpText = updates.helpText;
    }

    if (updates.selectOptions !== undefined) {
      safeUpdates.selectOptions = JSON.stringify(updates.selectOptions);
    }

    if (updates.defaultValue !== undefined) {
      safeUpdates.defaultValue = updates.defaultValue;
    }

    // Update field
    const updated = await this.prisma.entityField.update({
      where: { id: fieldId },
      data: safeUpdates
    });

    // Return with parsed selectOptions
    return {
      ...updated,
      selectOptions: updated.selectOptions ? JSON.parse(updated.selectOptions) : null
    };
  }

  /**
   * Soft delete a field
   * @param {number} fieldId - Field ID
   * @returns {Promise<Object>} Deleted field
   */
  async deleteField(fieldId) {
    return this.prisma.entityField.update({
      where: { id: fieldId },
      data: {
        deletedAt: new Date()
      }
    });
  }

  /**
   * Create a view for an entity
   * @param {number} entityId - Entity ID
   * @param {Object} data - View data
   * @param {string} data.name - View name (must be unique within entity)
   * @param {string} data.type - View type (list, grid, form, kanban, calendar)
   * @param {Object} [data.config] - View configuration (stored as JSON)
   * @returns {Promise<Object>} Created view with parsed config
   */
  async createView(entityId, { name, type, config = {} }) {
    // Validate entity exists
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId }
    });

    if (!entity) {
      throw new Error('Entity not found');
    }

    // Check for duplicate view name within entity
    const existing = await this.prisma.entityView.findFirst({
      where: {
        entityId,
        name
      }
    });

    if (existing) {
      throw new Error(`View with name ${name} already exists in this entity`);
    }

    // Create view
    const view = await this.prisma.entityView.create({
      data: {
        entityId,
        name,
        type,
        config: JSON.stringify(config),
        isDefault: false
      }
    });

    // Return with parsed config
    return {
      ...view,
      config: view.config ? JSON.parse(view.config) : {}
    };
  }

  /**
   * Get all views for an entity
   * @param {number} entityId - Entity ID
   * @returns {Promise<Array>} Array of views with parsed config
   */
  async getViews(entityId) {
    const views = await this.prisma.entityView.findMany({
      where: { entityId },
      orderBy: { createdAt: 'asc' }
    });

    // Parse config JSON for each view
    return views.map(view => ({
      ...view,
      config: view.config ? JSON.parse(view.config) : {}
    }));
  }
}
