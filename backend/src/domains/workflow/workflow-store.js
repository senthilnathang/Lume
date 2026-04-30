/**
 * @fileoverview WorkflowStore - Central store for workflow definitions
 * Manages registration, retrieval, and lifecycle of workflow definitions
 */

import logger from '../../core/services/logger.js';

/**
 * @typedef {Object} WorkflowDefinition
 * @property {string} id - Unique workflow ID
 * @property {string} slug - Entity slug this workflow belongs to
 * @property {string} trigger - Trigger type (onCreate, onUpdate, onDelete, scheduled, manual)
 * @property {string} [schedule] - Cron expression if trigger is scheduled
 * @property {Array<WorkflowStep>} steps - Ordered list of steps
 * @property {boolean} [enabled] - Whether workflow is active
 * @property {string} [description] - Human-readable description
 */

class WorkflowStore {
  /**
   * @param {Object} registry - MetadataRegistry instance
   */
  constructor(registry) {
    this.workflows = new Map(); // slug -> [workflows]
    this.byId = new Map(); // id -> workflow
    this.registry = registry;
  }

  /**
   * Register a workflow definition
   * @param {WorkflowDefinition} workflowDef - Workflow definition
   * @returns {Promise<WorkflowDefinition>} Registered workflow
   */
  async register(workflowDef) {
    // Validate workflow
    const errors = this.validate(workflowDef);
    if (errors.length > 0) {
      throw new Error(`Workflow validation failed: ${errors.join(', ')}`);
    }

    // Store locally
    this.byId.set(workflowDef.id, workflowDef);

    if (!this.workflows.has(workflowDef.slug)) {
      this.workflows.set(workflowDef.slug, []);
    }

    this.workflows.get(workflowDef.slug).push(workflowDef);

    // Register in central registry
    if (this.registry) {
      await this.registry.registerWorkflow(workflowDef);
    }

    logger.debug(`[WorkflowStore] Registered workflow: ${workflowDef.id}`);
    return workflowDef;
  }

  /**
   * Get a workflow by ID
   * @param {string} id - Workflow ID
   * @returns {Promise<WorkflowDefinition>}
   */
  async get(id) {
    return this.byId.get(id) || null;
  }

  /**
   * Get all workflows for an entity
   * @param {string} slug - Entity slug
   * @returns {Promise<WorkflowDefinition[]>}
   */
  async getByEntity(slug) {
    return this.workflows.get(slug) || [];
  }

  /**
   * Get workflows by trigger type
   * @param {string} slug - Entity slug
   * @param {string} trigger - Trigger type (onCreate, onUpdate, onDelete, scheduled)
   * @returns {Promise<WorkflowDefinition[]>}
   */
  async getByTrigger(slug, trigger) {
    const workflows = this.workflows.get(slug) || [];
    return workflows.filter(w => w.trigger === trigger && w.enabled !== false);
  }

  /**
   * Update a workflow definition
   * @param {string} id - Workflow ID
   * @param {Object} updates - Partial updates
   * @returns {Promise<WorkflowDefinition>}
   */
  async update(id, updates) {
    const workflow = this.byId.get(id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }

    const updated = { ...workflow, ...updates };
    const errors = this.validate(updated);
    if (errors.length > 0) {
      throw new Error(`Update validation failed: ${errors.join(', ')}`);
    }

    this.byId.set(id, updated);

    // Update in registry
    if (this.registry) {
      await this.registry.registerWorkflow(updated);
    }

    logger.debug(`[WorkflowStore] Updated workflow: ${id}`);
    return updated;
  }

  /**
   * Unregister a workflow
   * @param {string} id - Workflow ID
   * @returns {Promise<void>}
   */
  async unregister(id) {
    const workflow = this.byId.get(id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }

    this.byId.delete(id);

    const entityWorkflows = this.workflows.get(workflow.slug);
    if (entityWorkflows) {
      const idx = entityWorkflows.findIndex(w => w.id === id);
      if (idx >= 0) {
        entityWorkflows.splice(idx, 1);
      }
    }

    if (this.registry) {
      await this.registry.unregisterWorkflow(id);
    }

    logger.debug(`[WorkflowStore] Unregistered workflow: ${id}`);
  }

  /**
   * Check if workflow exists
   * @param {string} id - Workflow ID
   * @returns {boolean}
   */
  has(id) {
    return this.byId.has(id);
  }

  /**
   * List all workflows
   * @returns {Promise<WorkflowDefinition[]>}
   */
  async list() {
    return Array.from(this.byId.values());
  }

  /**
   * Validate workflow definition
   * @private
   * @param {Object} workflow - Workflow to validate
   * @returns {string[]} Array of error messages
   */
  validate(workflow) {
    const errors = [];

    if (!workflow.id) {
      errors.push('id is required');
    }

    if (!workflow.slug) {
      errors.push('slug is required');
    }

    if (!workflow.trigger) {
      errors.push('trigger is required');
    }

    const validTriggers = ['onCreate', 'onUpdate', 'onDelete', 'scheduled', 'manual'];
    if (!validTriggers.includes(workflow.trigger)) {
      errors.push(`trigger must be one of: ${validTriggers.join(', ')}`);
    }

    if (workflow.trigger === 'scheduled' && !workflow.schedule) {
      errors.push('schedule is required for scheduled trigger');
    }

    if (!Array.isArray(workflow.steps) || workflow.steps.length === 0) {
      errors.push('steps must be a non-empty array');
    }

    if (workflow.steps && !this.validateSteps(workflow.steps)) {
      errors.push('steps validation failed');
    }

    return errors;
  }

  /**
   * Validate workflow steps
   * @private
   * @param {Array} steps - Steps array
   * @returns {boolean}
   */
  validateSteps(steps) {
    if (!Array.isArray(steps)) {
      return false;
    }

    for (const step of steps) {
      if (!step.id || !step.type) {
        return false;
      }
    }

    return true;
  }

  /**
   * Clear all workflows
   * @returns {Promise<void>}
   */
  async clear() {
    this.workflows.clear();
    this.byId.clear();
    logger.debug('[WorkflowStore] Cleared all workflows');
  }
}

export default WorkflowStore;
