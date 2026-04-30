/**
 * @fileoverview EntityStore - Central store for entity definitions
 * Manages registration, retrieval, and validation of entities
 * Integrates with MetadataRegistry for central management
 */

import logger from '../../core/services/logger.js';

class EntityStore {
  /**
   * @param {MetadataRegistry} registry - Metadata registry
   */
  constructor(registry) {
    this.registry = registry;
    this.entities = new Map(); // slug -> EntityDefinition
  }

  /**
   * Register an entity
   * @param {EntityDefinition} entity - Entity definition
   * @returns {Promise<EntityDefinition>} Registered entity
   */
  async register(entity) {
    // Validate entity
    const errors = this.validate(entity);
    if (errors.length > 0) {
      throw new Error(`Entity validation failed: ${errors.join(', ')}`);
    }

    // Store locally
    this.entities.set(entity.slug, entity);

    // Register in central registry
    if (this.registry) {
      await this.registry.registerEntity(entity);
    }

    // Register entity workflows
    if (entity.workflows) {
      for (const trigger of ['onCreate', 'onUpdate', 'onDelete']) {
        if (entity.workflows[trigger] && Array.isArray(entity.workflows[trigger])) {
          for (const workflowId of entity.workflows[trigger]) {
            logger.debug(`[EntityStore] Registered workflow trigger: ${entity.slug}#${trigger} -> ${workflowId}`);
          }
        }
      }
    }

    // Register entity agents
    if (entity.agents && Array.isArray(entity.agents)) {
      for (const agent of entity.agents) {
        if (this.registry) {
          await this.registry.registerAgent(entity.slug, agent);
        }
        logger.debug(`[EntityStore] Registered agent: ${entity.slug}#${agent.id}`);
      }
    }

    // Register entity views
    if (entity.views && Array.isArray(entity.views)) {
      for (const view of entity.views) {
        if (this.registry) {
          await this.registry.registerView(entity.slug, view);
        }
        logger.debug(`[EntityStore] Registered view: ${entity.slug}#${view.id}`);
      }
    }

    // Register entity permissions
    if (entity.permissions && Array.isArray(entity.permissions)) {
      for (const permission of entity.permissions) {
        if (this.registry) {
          await this.registry.registerPermission(permission);
        }
        logger.debug(`[EntityStore] Registered permission: ${permission.resource}#${permission.action}`);
      }
    }

    logger.info(`[EntityStore] Registered entity: ${entity.slug}`);
    return entity;
  }

  /**
   * Get entity by slug
   * @param {string} slug - Entity slug
   * @returns {Promise<EntityDefinition|null>}
   */
  async get(slug) {
    // Try local storage first
    if (this.entities.has(slug)) {
      return this.entities.get(slug);
    }

    // Try registry
    if (this.registry) {
      return await this.registry.getEntity(slug);
    }

    return null;
  }

  /**
   * Check if entity exists
   * @param {string} slug - Entity slug
   * @returns {boolean}
   */
  has(slug) {
    return this.entities.has(slug);
  }

  /**
   * Get all registered entities
   * @returns {Promise<EntityDefinition[]>}
   */
  async list() {
    return Array.from(this.entities.values());
  }

  /**
   * Get entities as a map
   * @returns {Map<string, EntityDefinition>}
   */
  getMap() {
    return new Map(this.entities);
  }

  /**
   * Unregister an entity
   * @param {string} slug - Entity slug
   * @returns {Promise<void>}
   */
  async unregister(slug) {
    this.entities.delete(slug);

    if (this.registry) {
      await this.registry.invalidateEntity(slug);
    }

    logger.info(`[EntityStore] Unregistered entity: ${slug}`);
  }

  /**
   * Update an entity
   * @param {string} slug - Entity slug
   * @param {Partial<EntityDefinition>} updates - Partial entity updates
   * @returns {Promise<EntityDefinition>}
   */
  async update(slug, updates) {
    const entity = await this.get(slug);
    if (!entity) {
      throw new Error(`Entity not found: ${slug}`);
    }

    const updated = { ...entity, ...updates };

    // Unregister old
    await this.unregister(slug);

    // Register new
    return await this.register(updated);
  }

  /**
   * Validate entity definition
   * @private
   * @param {EntityDefinition} entity - Entity definition
   * @returns {string[]} Array of error messages (empty if valid)
   */
  validate(entity) {
    const errors = [];

    if (!entity.slug) {
      errors.push('slug is required');
    }

    if (!entity.name) {
      errors.push('name is required');
    }

    if (!entity.orm || !['prisma', 'drizzle'].includes(entity.orm)) {
      errors.push('orm must be "prisma" or "drizzle"');
    }

    if (!entity.tableName) {
      errors.push('tableName is required');
    }

    if (!Array.isArray(entity.fields) || entity.fields.length === 0) {
      errors.push('must have at least one field');
    }

    // Validate fields
    if (entity.fields) {
      const fieldNames = new Set();
      for (const field of entity.fields) {
        if (!field.name || !field.type) {
          errors.push(`field missing name or type: ${JSON.stringify(field)}`);
        }

        if (fieldNames.has(field.name)) {
          errors.push(`duplicate field name: ${field.name}`);
        }
        fieldNames.add(field.name);
      }
    }

    // Validate relations
    if (entity.relations) {
      for (const relation of entity.relations) {
        if (!relation.name || !relation.target || !relation.type) {
          errors.push(`relation missing name, target, or type: ${JSON.stringify(relation)}`);
        }
      }
    }

    // Validate permissions
    if (entity.permissions) {
      for (const perm of entity.permissions) {
        if (!perm.resource || !perm.action) {
          errors.push(`permission missing resource or action: ${JSON.stringify(perm)}`);
        }
      }
    }

    return errors;
  }

  /**
   * Clear all entities
   * @returns {Promise<void>}
   */
  async clear() {
    this.entities.clear();
    logger.info('[EntityStore] Cleared all entities');
  }

  /**
   * Create singleton instance
   * @static
   * @param {MetadataRegistry} registry - Metadata registry
   * @returns {EntityStore}
   */
  static create(registry) {
    return new EntityStore(registry);
  }
}

export default EntityStore;
