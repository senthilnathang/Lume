/**
 * @fileoverview MetadataRegistry - Central registry for all entity, workflow, view, permission, and agent definitions
 * Provides in-memory storage with Redis TTL-based caching for performance
 */

import Redis from 'ioredis';
import logger from '../services/logger.js';

const TTL = {
  ENTITY: 3600,          // 1 hour
  WORKFLOW: 3600,        // 1 hour
  PERMISSION: 1800,      // 30 minutes
  VIEW: 3600,            // 1 hour
  AGENT: 3600,           // 1 hour
  COMPUTED_FIELD: 300,   // 5 minutes
};

class MetadataRegistry {
  /**
   * @param {Redis|null} redisClient - Optional Redis client for caching
   */
  constructor(redisClient = null) {
    this.redisClient = redisClient;

    // In-memory storage
    this.entities = new Map();      // slug -> EntityDefinition
    this.workflows = new Map();     // id -> WorkflowDefinition
    this.views = new Map();         // {entitySlug}:{viewId} -> ViewDefinition
    this.permissions = new Map();   // {resource}:{action} -> PermissionPolicy[]
    this.agents = new Map();        // {entitySlug}:{agentId} -> AgentDefinition
    this.templates = new Map();     // id -> DomainTemplate

    logger.info('[MetadataRegistry] Initialized');
  }

  /**
   * Register an entity definition
   * @param {EntityDefinition} entity - Entity definition
   * @returns {Promise<void>}
   */
  async registerEntity(entity) {
    if (!entity.slug) throw new Error('Entity must have a slug');

    this.entities.set(entity.slug, entity);

    if (this.redisClient) {
      const key = `entity:${entity.slug}`;
      await this.redisClient.setex(key, TTL.ENTITY, JSON.stringify(entity));
    }

    // Register permissions from entity
    if (entity.permissions) {
      for (const policy of entity.permissions) {
        this.registerPermission(policy);
      }
    }

    logger.info(`[MetadataRegistry] Registered entity: ${entity.slug}`);
  }

  /**
   * Register a workflow definition
   * @param {WorkflowDefinition} workflow - Workflow definition
   * @returns {Promise<void>}
   */
  async registerWorkflow(workflow) {
    if (!workflow.id) throw new Error('Workflow must have an id');

    this.workflows.set(workflow.id, workflow);

    if (this.redisClient) {
      const key = `workflow:${workflow.id}`;
      await this.redisClient.setex(key, TTL.WORKFLOW, JSON.stringify(workflow));
    }

    logger.info(`[MetadataRegistry] Registered workflow: ${workflow.id}`);
  }

  /**
   * Register a view definition
   * @param {string} entitySlug - Entity slug
   * @param {ViewDefinition} view - View definition
   * @returns {Promise<void>}
   */
  async registerView(entitySlug, view) {
    if (!view.id) throw new Error('View must have an id');

    const key = `${entitySlug}:${view.id}`;
    this.views.set(key, view);

    if (this.redisClient) {
      const redisKey = `view:${key}`;
      await this.redisClient.setex(redisKey, TTL.VIEW, JSON.stringify(view));
    }

    logger.info(`[MetadataRegistry] Registered view: ${key}`);
  }

  /**
   * Register a permission policy
   * @param {PermissionPolicy} policy - Permission policy
   * @returns {Promise<void>}
   */
  async registerPermission(policy) {
    const key = `${policy.resource}:${policy.action}`;
    const existing = this.permissions.get(key) || [];
    existing.push(policy);
    this.permissions.set(key, existing);

    if (this.redisClient) {
      const redisKey = `permission:${key}`;
      await this.redisClient.setex(redisKey, TTL.PERMISSION, JSON.stringify(existing));
    }

    logger.debug(`[MetadataRegistry] Registered permission: ${key}`);
  }

  /**
   * Register an agent definition
   * @param {string} entitySlug - Entity slug
   * @param {AgentDefinition} agent - Agent definition
   * @returns {Promise<void>}
   */
  async registerAgent(entitySlug, agent) {
    if (!agent.id) throw new Error('Agent must have an id');

    const key = `${entitySlug}:${agent.id}`;
    this.agents.set(key, agent);

    if (this.redisClient) {
      const redisKey = `agent:${key}`;
      await this.redisClient.setex(redisKey, TTL.AGENT, JSON.stringify(agent));
    }

    logger.info(`[MetadataRegistry] Registered agent: ${key}`);
  }

  /**
   * Register a template
   * @param {string} id - Template ID
   * @param {Object} template - Template definition
   * @returns {Promise<void>}
   */
  async registerTemplate(id, template) {
    this.templates.set(id, template);

    if (this.redisClient) {
      const key = `template:${id}`;
      await this.redisClient.setex(key, TTL.ENTITY, JSON.stringify(template));
    }

    logger.info(`[MetadataRegistry] Registered template: ${id}`);
  }

  /**
   * Get entity by slug
   * @param {string} slug - Entity slug
   * @returns {Promise<EntityDefinition|null>}
   */
  async getEntity(slug) {
    // Try memory first
    if (this.entities.has(slug)) {
      return this.entities.get(slug);
    }

    // Try Redis
    if (this.redisClient) {
      try {
        const key = `entity:${slug}`;
        const cached = await this.redisClient.get(key);
        if (cached) {
          const entity = JSON.parse(cached);
          this.entities.set(slug, entity);
          return entity;
        }
      } catch (error) {
        logger.warn(`[MetadataRegistry] Redis error reading entity ${slug}:`, error.message);
      }
    }

    return null;
  }

  /**
   * Get workflow by ID
   * @param {string} id - Workflow ID
   * @returns {Promise<WorkflowDefinition|null>}
   */
  async getWorkflow(id) {
    if (this.workflows.has(id)) {
      return this.workflows.get(id);
    }

    if (this.redisClient) {
      try {
        const key = `workflow:${id}`;
        const cached = await this.redisClient.get(key);
        if (cached) {
          const workflow = JSON.parse(cached);
          this.workflows.set(id, workflow);
          return workflow;
        }
      } catch (error) {
        logger.warn(`[MetadataRegistry] Redis error reading workflow ${id}:`, error.message);
      }
    }

    return null;
  }

  /**
   * Get view by entity slug and view ID
   * @param {string} entitySlug - Entity slug
   * @param {string} viewId - View ID
   * @returns {Promise<ViewDefinition|null>}
   */
  async getView(entitySlug, viewId) {
    const key = `${entitySlug}:${viewId}`;
    if (this.views.has(key)) {
      return this.views.get(key);
    }

    if (this.redisClient) {
      try {
        const redisKey = `view:${key}`;
        const cached = await this.redisClient.get(redisKey);
        if (cached) {
          const view = JSON.parse(cached);
          this.views.set(key, view);
          return view;
        }
      } catch (error) {
        logger.warn(`[MetadataRegistry] Redis error reading view ${key}:`, error.message);
      }
    }

    return null;
  }

  /**
   * Get all views for an entity
   * @param {string} entitySlug - Entity slug
   * @returns {Promise<ViewDefinition[]>}
   */
  async getViews(entitySlug) {
    const views = [];
    for (const [key, view] of this.views.entries()) {
      if (key.startsWith(entitySlug + ':')) {
        views.push(view);
      }
    }
    return views;
  }

  /**
   * Get permissions for a resource/action
   * @param {string} resource - Resource name
   * @param {string} action - Action name
   * @returns {Promise<PermissionPolicy[]>}
   */
  async getPermissions(resource, action) {
    const key = `${resource}:${action}`;

    if (this.permissions.has(key)) {
      return this.permissions.get(key) || [];
    }

    if (this.redisClient) {
      try {
        const redisKey = `permission:${key}`;
        const cached = await this.redisClient.get(redisKey);
        if (cached) {
          const policies = JSON.parse(cached);
          this.permissions.set(key, policies);
          return policies;
        }
      } catch (error) {
        logger.warn(`[MetadataRegistry] Redis error reading permissions ${key}:`, error.message);
      }
    }

    return [];
  }

  /**
   * Get agents for an entity
   * @param {string} entitySlug - Entity slug
   * @returns {Promise<AgentDefinition[]>}
   */
  async getAgents(entitySlug) {
    const agents = [];
    for (const [key, agent] of this.agents.entries()) {
      if (key.startsWith(entitySlug + ':')) {
        agents.push(agent);
      }
    }
    return agents;
  }

  /**
   * Get agent by entity and ID
   * @param {string} entitySlug - Entity slug
   * @param {string} agentId - Agent ID
   * @returns {Promise<AgentDefinition|null>}
   */
  async getAgent(entitySlug, agentId) {
    const key = `${entitySlug}:${agentId}`;
    return this.agents.get(key) || null;
  }

  /**
   * Get template by ID
   * @param {string} id - Template ID
   * @returns {Promise<Object|null>}
   */
  async getTemplate(id) {
    if (this.templates.has(id)) {
      return this.templates.get(id);
    }

    if (this.redisClient) {
      try {
        const key = `template:${id}`;
        const cached = await this.redisClient.get(key);
        if (cached) {
          const template = JSON.parse(cached);
          this.templates.set(id, template);
          return template;
        }
      } catch (error) {
        logger.warn(`[MetadataRegistry] Redis error reading template ${id}:`, error.message);
      }
    }

    return null;
  }

  /**
   * List all entities
   * @returns {Promise<EntityDefinition[]>}
   */
  async listEntities() {
    return Array.from(this.entities.values());
  }

  /**
   * List all workflows
   * @returns {Promise<WorkflowDefinition[]>}
   */
  async listWorkflows() {
    return Array.from(this.workflows.values());
  }

  /**
   * Check if entity exists
   * @param {string} slug - Entity slug
   * @returns {boolean}
   */
  hasEntity(slug) {
    return this.entities.has(slug);
  }

  /**
   * Check if workflow exists
   * @param {string} id - Workflow ID
   * @returns {boolean}
   */
  hasWorkflow(id) {
    return this.workflows.has(id);
  }

  /**
   * Invalidate entity cache
   * @param {string} slug - Entity slug
   * @returns {Promise<void>}
   */
  async invalidateEntity(slug) {
    this.entities.delete(slug);

    if (this.redisClient) {
      try {
        const key = `entity:${slug}`;
        await this.redisClient.del(key);
      } catch (error) {
        logger.warn(`[MetadataRegistry] Error invalidating entity ${slug}:`, error.message);
      }
    }
  }

  /**
   * Invalidate workflow cache
   * @param {string} id - Workflow ID
   * @returns {Promise<void>}
   */
  async invalidateWorkflow(id) {
    this.workflows.delete(id);

    if (this.redisClient) {
      try {
        const key = `workflow:${id}`;
        await this.redisClient.del(key);
      } catch (error) {
        logger.warn(`[MetadataRegistry] Error invalidating workflow ${id}:`, error.message);
      }
    }
  }

  /**
   * Invalidate permission cache
   * @param {string} resource - Resource name
   * @param {string} action - Action name
   * @returns {Promise<void>}
   */
  async invalidatePermissions(resource, action) {
    const key = `${resource}:${action}`;
    this.permissions.delete(key);

    if (this.redisClient) {
      try {
        const redisKey = `permission:${key}`;
        await this.redisClient.del(redisKey);
      } catch (error) {
        logger.warn(`[MetadataRegistry] Error invalidating permissions ${key}:`, error.message);
      }
    }
  }

  /**
   * Unregister a workflow
   * @param {string} id - Workflow ID
   * @returns {Promise<void>}
   */
  async unregisterWorkflow(id) {
    this.workflows.delete(id);

    if (this.redisClient) {
      try {
        const key = `workflow:${id}`;
        await this.redisClient.del(key);
      } catch (error) {
        logger.warn(`[MetadataRegistry] Error unregistering workflow ${id}:`, error.message);
      }
    }

    logger.info(`[MetadataRegistry] Unregistered workflow: ${id}`);
  }

  /**
   * Unregister an agent
   * @param {string} entitySlug - Entity slug
   * @param {string} agentId - Agent ID
   * @returns {Promise<void>}
   */
  async unregisterAgent(entitySlug, agentId) {
    const key = `${entitySlug}:${agentId}`;
    this.agents.delete(key);

    if (this.redisClient) {
      try {
        const redisKey = `agent:${key}`;
        await this.redisClient.del(redisKey);
      } catch (error) {
        logger.warn(`[MetadataRegistry] Error unregistering agent ${key}:`, error.message);
      }
    }

    logger.info(`[MetadataRegistry] Unregistered agent: ${key}`);
  }

  /**
   * Clear all caches
   * @returns {Promise<void>}
   */
  async clear() {
    this.entities.clear();
    this.workflows.clear();
    this.views.clear();
    this.permissions.clear();
    this.agents.clear();
    this.templates.clear();

    if (this.redisClient) {
      try {
        const keys = await this.redisClient.keys('entity:*');
        keys.push(...await this.redisClient.keys('workflow:*'));
        keys.push(...await this.redisClient.keys('permission:*'));
        keys.push(...await this.redisClient.keys('view:*'));
        keys.push(...await this.redisClient.keys('agent:*'));
        keys.push(...await this.redisClient.keys('template:*'));

        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } catch (error) {
        logger.warn('[MetadataRegistry] Error clearing Redis cache:', error.message);
      }
    }

    logger.info('[MetadataRegistry] Cleared all caches');
  }
}

export default MetadataRegistry;
