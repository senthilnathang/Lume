/**
 * @fileoverview AgentStore - Central store for agent definitions
 * Manages registration, retrieval, and lifecycle of agent definitions
 */

import logger from '../../core/services/logger.js';

/**
 * @typedef {Object} AgentDefinition
 * @property {string} id - Unique agent ID
 * @property {string} slug - Entity slug this agent belongs to
 * @property {string} [trigger] - ABAC expression to evaluate
 * @property {string} [schedule] - Cron expression for scheduled agents
 * @property {string} [triggerEvent] - Event type (onCreate, onUpdate, onDelete, scheduled, manual)
 * @property {Object} action - Agent action { type, config }
 * @property {boolean} [enabled] - Whether agent is active
 * @property {string} [description] - Human-readable description
 */

class AgentStore {
  /**
   * @param {Object} registry - MetadataRegistry instance
   */
  constructor(registry) {
    this.agents = new Map(); // id -> AgentDefinition
    this.byEntity = new Map(); // slug -> [AgentDefinition]
    this.byEvent = new Map(); // {slug}:{event} -> [AgentDefinition]
    this.scheduled = new Map(); // id -> { schedule, agentId }
    this.registry = registry;
  }

  /**
   * Register an agent definition
   * @param {AgentDefinition} agentDef - Agent definition
   * @returns {Promise<AgentDefinition>} Registered agent
   */
  async register(agentDef) {
    // Validate agent
    const errors = this.validate(agentDef);
    if (errors.length > 0) {
      throw new Error(`Agent validation failed: ${errors.join(', ')}`);
    }

    // Store by ID
    this.agents.set(agentDef.id, agentDef);

    // Store by entity
    if (!this.byEntity.has(agentDef.slug)) {
      this.byEntity.set(agentDef.slug, []);
    }
    this.byEntity.get(agentDef.slug).push(agentDef);

    // Store by event
    const eventKey = `${agentDef.slug}:${agentDef.triggerEvent}`;
    if (!this.byEvent.has(eventKey)) {
      this.byEvent.set(eventKey, []);
    }
    this.byEvent.get(eventKey).push(agentDef);

    // Register in central registry
    if (this.registry) {
      await this.registry.registerAgent(agentDef.slug, agentDef);
    }

    logger.debug(`[AgentStore] Registered agent: ${agentDef.id}`);
    return agentDef;
  }

  /**
   * Get an agent by ID
   * @param {string} id - Agent ID
   * @returns {Promise<AgentDefinition|null>}
   */
  async get(id) {
    return this.agents.get(id) || null;
  }

  /**
   * Get all agents for an entity
   * @param {string} slug - Entity slug
   * @returns {Promise<AgentDefinition[]>}
   */
  async getByEntity(slug) {
    return this.byEntity.get(slug) || [];
  }

  /**
   * Get agents by trigger event
   * @param {string} slug - Entity slug
   * @param {string} triggerEvent - Event type (onCreate, onUpdate, onDelete, scheduled)
   * @returns {Promise<AgentDefinition[]>}
   */
  async getByEvent(slug, triggerEvent) {
    const eventKey = `${slug}:${triggerEvent}`;
    const agents = this.byEvent.get(eventKey) || [];
    // Only return enabled agents
    return agents.filter(a => a.enabled !== false);
  }

  /**
   * Get scheduled agents
   * @returns {Promise<AgentDefinition[]>}
   */
  async getScheduled() {
    const scheduled = [];
    for (const agent of this.agents.values()) {
      if (agent.triggerEvent === 'scheduled' && agent.schedule && agent.enabled !== false) {
        scheduled.push(agent);
      }
    }
    return scheduled;
  }

  /**
   * Update an agent definition
   * @param {string} id - Agent ID
   * @param {Object} updates - Partial updates
   * @returns {Promise<AgentDefinition>}
   */
  async update(id, updates) {
    const agent = this.agents.get(id);
    if (!agent) {
      throw new Error(`Agent not found: ${id}`);
    }

    const updated = { ...agent, ...updates };
    const errors = this.validate(updated);
    if (errors.length > 0) {
      throw new Error(`Update validation failed: ${errors.join(', ')}`);
    }

    this.agents.set(id, updated);

    // Update in registry
    if (this.registry) {
      await this.registry.registerAgent(updated.slug, updated);
    }

    logger.debug(`[AgentStore] Updated agent: ${id}`);
    return updated;
  }

  /**
   * Unregister an agent
   * @param {string} id - Agent ID
   * @returns {Promise<void>}
   */
  async unregister(id) {
    const agent = this.agents.get(id);
    if (!agent) {
      throw new Error(`Agent not found: ${id}`);
    }

    this.agents.delete(id);

    // Remove from entity agents list
    const entityAgents = this.byEntity.get(agent.slug);
    if (entityAgents) {
      const idx = entityAgents.findIndex(a => a.id === id);
      if (idx >= 0) {
        entityAgents.splice(idx, 1);
      }
    }

    // Remove from event agents list
    const eventKey = `${agent.slug}:${agent.triggerEvent}`;
    const eventAgents = this.byEvent.get(eventKey);
    if (eventAgents) {
      const idx = eventAgents.findIndex(a => a.id === id);
      if (idx >= 0) {
        eventAgents.splice(idx, 1);
      }
    }

    if (this.registry) {
      await this.registry.unregisterAgent(agent.slug, id);
    }

    logger.debug(`[AgentStore] Unregistered agent: ${id}`);
  }

  /**
   * Check if agent exists
   * @param {string} id - Agent ID
   * @returns {boolean}
   */
  has(id) {
    return this.agents.has(id);
  }

  /**
   * Validate agent definition
   * @private
   * @param {Object} agent - Agent to validate
   * @returns {string[]} Array of error messages
   */
  validate(agent) {
    const errors = [];

    if (!agent.id) {
      errors.push('id is required');
    }

    if (!agent.slug) {
      errors.push('slug is required');
    }

    if (!agent.triggerEvent) {
      errors.push('triggerEvent is required');
    }

    const validEvents = ['onCreate', 'onUpdate', 'onDelete', 'scheduled', 'manual'];
    if (agent.triggerEvent && !validEvents.includes(agent.triggerEvent)) {
      errors.push(`triggerEvent must be one of: ${validEvents.join(', ')}`);
    }

    if (agent.triggerEvent === 'scheduled' && !agent.schedule) {
      errors.push('schedule is required for scheduled trigger');
    }

    if (!agent.action) {
      errors.push('action is required');
    }

    const validActionTypes = ['escalate', 'workflow', 'mutate'];
    if (agent.action && !validActionTypes.includes(agent.action.type)) {
      errors.push(`action.type must be one of: ${validActionTypes.join(', ')}`);
    }

    return errors;
  }

  /**
   * List all agents
   * @returns {Promise<AgentDefinition[]>}
   */
  async list() {
    return Array.from(this.agents.values());
  }

  /**
   * Clear all agents
   * @returns {Promise<void>}
   */
  async clear() {
    this.agents.clear();
    this.byEntity.clear();
    this.byEvent.clear();
    this.scheduled.clear();
    logger.debug('[AgentStore] Cleared all agents');
  }
}

export default AgentStore;
