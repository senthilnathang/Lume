/**
 * @fileoverview ViewStore - Central store for view definitions
 * Manages registration, retrieval, and lifecycle of view definitions
 */

import logger from '../../core/services/logger.js';

/**
 * @typedef {Object} ViewStore
 */

class ViewStore {
  /**
   * @param {Object} registry - MetadataRegistry instance
   */
  constructor(registry) {
    this.views = new Map(); // {slug}:{id} -> ViewDefinition
    this.byEntity = new Map(); // slug -> [ViewDefinition]
    this.defaultViews = new Map(); // slug -> defaultViewId
    this.registry = registry;
  }

  /**
   * Register a view definition
   * @param {string} slug - Entity slug
   * @param {ViewDefinition} viewDef - View definition
   * @returns {Promise<ViewDefinition>} Registered view
   */
  async register(slug, viewDef) {
    // Validate view
    const errors = this.validate(viewDef);
    if (errors.length > 0) {
      throw new Error(`View validation failed: ${errors.join(', ')}`);
    }

    const key = `${slug}:${viewDef.id}`;
    this.views.set(key, viewDef);

    if (!this.byEntity.has(slug)) {
      this.byEntity.set(slug, []);
    }

    this.byEntity.get(slug).push(viewDef);

    // Register in central registry
    if (this.registry) {
      await this.registry.registerView(slug, viewDef);
    }

    // Mark as default if specified
    if (viewDef.default) {
      this.defaultViews.set(slug, viewDef.id);
    }

    logger.debug(`[ViewStore] Registered view: ${key}`);
    return viewDef;
  }

  /**
   * Get a view by ID
   * @param {string} slug - Entity slug
   * @param {string} id - View ID
   * @returns {Promise<ViewDefinition|null>}
   */
  async get(slug, id) {
    const key = `${slug}:${id}`;
    return this.views.get(key) || null;
  }

  /**
   * Get all views for an entity
   * @param {string} slug - Entity slug
   * @returns {Promise<ViewDefinition[]>}
   */
  async getByEntity(slug) {
    return this.byEntity.get(slug) || [];
  }

  /**
   * Get views by type
   * @param {string} slug - Entity slug
   * @param {string} type - View type (table, form, kanban, calendar, timeline)
   * @returns {Promise<ViewDefinition[]>}
   */
  async getByType(slug, type) {
    const views = this.byEntity.get(slug) || [];
    return views.filter(v => v.type === type);
  }

  /**
   * Get default view for entity
   * @param {string} slug - Entity slug
   * @returns {Promise<ViewDefinition|null>}
   */
  async getDefault(slug) {
    const defaultId = this.defaultViews.get(slug);
    if (defaultId) {
      return this.get(slug, defaultId);
    }

    // Return first view if no default set
    const views = await this.getByEntity(slug);
    return views.length > 0 ? views[0] : null;
  }

  /**
   * Update a view definition
   * @param {string} slug - Entity slug
   * @param {string} id - View ID
   * @param {Object} updates - Partial updates
   * @returns {Promise<ViewDefinition>}
   */
  async update(slug, id, updates) {
    const view = await this.get(slug, id);
    if (!view) {
      throw new Error(`View not found: ${slug}:${id}`);
    }

    const updated = { ...view, ...updates };
    const errors = this.validate(updated);
    if (errors.length > 0) {
      throw new Error(`Update validation failed: ${errors.join(', ')}`);
    }

    const key = `${slug}:${id}`;
    this.views.set(key, updated);

    // Update in registry
    if (this.registry) {
      await this.registry.registerView(slug, updated);
    }

    logger.debug(`[ViewStore] Updated view: ${key}`);
    return updated;
  }

  /**
   * Unregister a view
   * @param {string} slug - Entity slug
   * @param {string} id - View ID
   * @returns {Promise<void>}
   */
  async unregister(slug, id) {
    const view = await this.get(slug, id);
    if (!view) {
      throw new Error(`View not found: ${slug}:${id}`);
    }

    const key = `${slug}:${id}`;
    this.views.delete(key);

    const entityViews = this.byEntity.get(slug);
    if (entityViews) {
      const idx = entityViews.findIndex(v => v.id === id);
      if (idx >= 0) {
        entityViews.splice(idx, 1);
      }
    }

    if (this.defaultViews.get(slug) === id) {
      this.defaultViews.delete(slug);
    }

    if (this.registry) {
      // Note: registry doesn't have unregisterView yet, may need to add
      logger.debug(`[ViewStore] Unregistered view: ${key}`);
    }
  }

  /**
   * Check if view exists
   * @param {string} slug - Entity slug
   * @param {string} id - View ID
   * @returns {boolean}
   */
  has(slug, id) {
    const key = `${slug}:${id}`;
    return this.views.has(key);
  }

  /**
   * Validate view definition
   * @private
   * @param {Object} view - View to validate
   * @returns {string[]} Array of error messages
   */
  validate(view) {
    const errors = [];

    if (!view.id) {
      errors.push('id is required');
    }

    if (!view.slug) {
      errors.push('slug is required');
    }

    if (!view.type) {
      errors.push('type is required');
    }

    const validTypes = ['table', 'form', 'kanban', 'calendar', 'timeline'];
    if (view.type && !validTypes.includes(view.type)) {
      errors.push(`type must be one of: ${validTypes.join(', ')}`);
    }

    if (!view.config) {
      errors.push('config is required');
    }

    // Type-specific validation
    if (view.type === 'table' && view.config) {
      if (!Array.isArray(view.config.columns)) {
        errors.push('table view requires columns array in config');
      }
    }

    if (view.type === 'kanban' && view.config) {
      if (!view.config.groupBy) {
        errors.push('kanban view requires groupBy field in config');
      }
    }

    if (view.type === 'calendar' && view.config) {
      if (!view.config.dateField) {
        errors.push('calendar view requires dateField in config');
      }
    }

    if (view.type === 'timeline' && view.config) {
      if (!view.config.startDateField || !view.config.endDateField) {
        errors.push('timeline view requires startDateField and endDateField in config');
      }
    }

    return errors;
  }

  /**
   * List all views
   * @returns {Promise<ViewDefinition[]>}
   */
  async list() {
    return Array.from(this.views.values());
  }

  /**
   * Clear all views
   * @returns {Promise<void>}
   */
  async clear() {
    this.views.clear();
    this.byEntity.clear();
    this.defaultViews.clear();
    logger.debug('[ViewStore] Cleared all views');
  }
}

export default ViewStore;
