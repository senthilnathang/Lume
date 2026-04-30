/**
 * Central RuntimeRegistry - Single source of truth for all runtime components
 * Coordinates registration and retrieval of entities, workflows, views, policies, and modules
 *
 * @fileoverview RuntimeRegistry implementation using the RuntimeRegistry interface from types.ts
 */

/**
 * RuntimeRegistry class - Central registry for all runtime definitions
 * Manages registration, storage, and retrieval of entities, workflows, views, policies, and modules
 *
 * @class RuntimeRegistry
 * @implements {RuntimeRegistry}
 */
export class RuntimeRegistry {
  /**
   * Map of entity name to entity definition
   * @type {Map<string, Object>}
   */
  entities = new Map();

  /**
   * Map of workflow name to workflow definition
   * @type {Map<string, Object>}
   */
  workflows = new Map();

  /**
   * Map of view name to view definition
   * @type {Map<string, Object>}
   */
  views = new Map();

  /**
   * Map of policy ID to policy definition
   * @type {Map<string, Object>}
   */
  policies = new Map();

  /**
   * Map of module name to module manifest
   * @type {Map<string, Object>}
   */
  modules = new Map();

  /**
   * Event bus for emitting and handling runtime events
   * @type {Object}
   * @private
   */
  #eventBus;

  /**
   * Constructor initializes the registry with an event bus
   *
   * @param {Object} eventBus - Event bus for event-driven execution
   */
  constructor(eventBus) {
    this.#eventBus = eventBus;
  }

  /**
   * Register an entity definition
   * Validates the entity, throws if already registered
   *
   * @param {Object} def - Entity definition to register
   * @param {string} def.name - Unique entity identifier
   * @param {string} def.displayName - Human-readable entity name
   * @param {string} def.tableName - Database table name
   * @param {Array} def.fields - Array of field definitions
   * @param {Array} def.permissions - Array of permission identifiers
   * @throws {Error} If entity is invalid or already registered
   * @example
   * registry.registerEntity({
   *   name: 'ticket',
   *   displayName: 'Ticket',
   *   tableName: 'tickets',
   *   fields: [...],
   *   permissions: []
   * });
   */
  registerEntity(def) {
    this.validateEntity(def);

    if (this.entities.has(def.name)) {
      throw new Error(`Entity ${def.name} already registered`);
    }

    this.entities.set(def.name, def);
  }

  /**
   * Get an entity definition by name
   *
   * @param {string} name - Entity name
   * @returns {Object | undefined} Entity definition or undefined if not found
   * @example
   * const entity = registry.getEntity('ticket');
   */
  getEntity(name) {
    return this.entities.get(name);
  }

  /**
   * Check if an entity is registered
   *
   * @param {string} name - Entity name
   * @returns {boolean} True if entity is registered
   */
  hasEntity(name) {
    return this.entities.has(name);
  }

  /**
   * Get all registered entities as array
   *
   * @returns {Array<Object>} Array of all entity definitions
   */
  listEntities() {
    return Array.from(this.entities.values());
  }

  /**
   * Get all registered entities as object keyed by name
   *
   * @returns {Object} Object with entity names as keys
   * @example
   * const all = registry.getAllEntities();
   * // { ticket: {...}, user: {...} }
   */
  getAllEntities() {
    const result = {};
    for (const [name, def] of this.entities) {
      result[name] = def;
    }
    return result;
  }

  /**
   * Register a workflow definition
   * Validates the workflow, throws if already registered
   *
   * @param {Object} def - Workflow definition to register
   * @param {string} def.name - Unique workflow identifier
   * @param {Array<string>} def.triggers - Array of event types that trigger this workflow
   * @param {Function} def.handler - Async handler function
   * @param {boolean} def.active - Whether the workflow is active
   * @throws {Error} If workflow is invalid or already registered
   * @example
   * registry.registerWorkflow({
   *   name: 'on-ticket-create',
   *   triggers: ['entity.created'],
   *   handler: async (event, context) => ({ success: true }),
   *   active: true
   * });
   */
  registerWorkflow(def) {
    this.validateWorkflow(def);

    if (this.workflows.has(def.name)) {
      throw new Error(`Workflow ${def.name} already registered`);
    }

    this.workflows.set(def.name, def);
  }

  /**
   * Get a workflow definition by name
   *
   * @param {string} name - Workflow name
   * @returns {Object | undefined} Workflow definition or undefined if not found
   */
  getWorkflow(name) {
    return this.workflows.get(name);
  }

  /**
   * Check if a workflow is registered
   *
   * @param {string} name - Workflow name
   * @returns {boolean} True if workflow is registered
   */
  hasWorkflow(name) {
    return this.workflows.has(name);
  }

  /**
   * Get all registered workflows as array
   *
   * @returns {Array<Object>} Array of all workflow definitions
   */
  listWorkflows() {
    return Array.from(this.workflows.values());
  }

  /**
   * Get all registered workflows as object keyed by name
   *
   * @returns {Object} Object with workflow names as keys
   */
  getAllWorkflows() {
    const result = {};
    for (const [name, def] of this.workflows) {
      result[name] = def;
    }
    return result;
  }

  /**
   * Register a view definition
   * Validates the view, throws if already registered
   *
   * @param {Object} def - View definition to register
   * @param {string} def.name - Unique view identifier
   * @param {string} def.entityName - Entity this view displays
   * @param {string} def.type - View type (form, table, detail, custom)
   * @param {string} def.template - Template name for rendering
   * @param {Object} def.config - View-specific configuration
   * @throws {Error} If view is invalid or already registered
   */
  registerView(def) {
    this.validateView(def);

    if (this.views.has(def.name)) {
      throw new Error(`View ${def.name} already registered`);
    }

    this.views.set(def.name, def);
  }

  /**
   * Get a view definition by name
   *
   * @param {string} name - View name
   * @returns {Object | undefined} View definition or undefined if not found
   */
  getView(name) {
    return this.views.get(name);
  }

  /**
   * Check if a view is registered
   *
   * @param {string} name - View name
   * @returns {boolean} True if view is registered
   */
  hasView(name) {
    return this.views.has(name);
  }

  /**
   * Get all registered views as array
   *
   * @returns {Array<Object>} Array of all view definitions
   */
  listViews() {
    return Array.from(this.views.values());
  }

  /**
   * Register a policy definition
   * Validates the policy, throws if already registered
   *
   * @param {Object} def - Policy definition to register
   * @param {string} def.id - Unique policy identifier
   * @param {string} def.name - Human-readable policy name
   * @param {string} def.description - Policy description
   * @param {Array} def.rules - Array of policy rules
   * @throws {Error} If policy is invalid or already registered
   */
  registerPolicy(def) {
    this.validatePolicy(def);

    if (this.policies.has(def.id)) {
      throw new Error(`Policy ${def.id} already registered`);
    }

    this.policies.set(def.id, def);
  }

  /**
   * Get a policy definition by ID
   *
   * @param {string} id - Policy ID
   * @returns {Object | undefined} Policy definition or undefined if not found
   */
  getPolicy(id) {
    return this.policies.get(id);
  }

  /**
   * Check if a policy is registered
   *
   * @param {string} id - Policy ID
   * @returns {boolean} True if policy is registered
   */
  hasPolicy(id) {
    return this.policies.has(id);
  }

  /**
   * Get all registered policies as array
   *
   * @returns {Array<Object>} Array of all policy definitions
   */
  listPolicies() {
    return Array.from(this.policies.values());
  }

  /**
   * Register a module and all its definitions
   * Automatically registers entities, workflows, views, and policies from the module
   *
   * @param {Object} def - Module manifest
   * @param {string} def.name - Unique module identifier
   * @param {string} def.version - Semantic version
   * @param {string} def.description - Module description
   * @param {Array<string>} def.depends - Module dependencies
   * @param {Array<Object>} def.entities - Entity definitions from module
   * @param {Array<Object>} def.workflows - Workflow definitions from module
   * @param {Array<Object>} def.views - View definitions from module
   * @param {Array<Object>} def.policies - Policy definitions from module
   * @throws {Error} If module is already registered
   */
  registerModule(def) {
    if (this.modules.has(def.name)) {
      throw new Error(`Module ${def.name} already registered`);
    }

    this.modules.set(def.name, def);

    // Register all entities from the module
    for (const entity of def.entities) {
      if (!this.entities.has(entity.name)) {
        this.registerEntity(entity);
      }
    }

    // Register all workflows from the module
    for (const workflow of def.workflows) {
      if (!this.workflows.has(workflow.name)) {
        this.registerWorkflow(workflow);
      }
    }

    // Register all views from the module
    for (const view of def.views) {
      if (!this.views.has(view.name)) {
        this.registerView(view);
      }
    }

    // Register all policies from the module
    for (const policy of def.policies) {
      if (!this.policies.has(policy.id)) {
        this.registerPolicy(policy);
      }
    }
  }

  /**
   * Get a registered module
   *
   * @param {string} name - Module name
   * @returns {Object | undefined} Module manifest or undefined if not found
   */
  getModule(name) {
    return this.modules.get(name);
  }

  /**
   * Execute an event and trigger matching workflows
   * Finds workflows that match the event type and filter conditions
   * Queues them asynchronously without blocking the caller
   *
   * @async
   * @param {Object} event - Event to execute
   * @param {string} event.id - Unique event identifier
   * @param {string} event.type - Event type
   * @param {string} event.entityName - Name of entity that triggered event
   * @param {string} event.action - Action that triggered event
   * @param {string} event.recordId - ID of affected record
   * @param {Object} event.data - Current data after event
   * @param {Object} event.previousData - Previous data before event
   * @param {Object} event.context - Execution context
   * @param {string} event.timestamp - ISO 8601 timestamp
   * @returns {Promise<Object>} ExecutionResult object
   * @example
   * const result = await registry.executeEvent({
   *   id: 'evt-1',
   *   type: 'entity.created',
   *   entityName: 'ticket',
   *   action: 'create',
   *   recordId: '123',
   *   data: { id: '123', title: 'New' },
   *   context: {...},
   *   timestamp: new Date().toISOString()
   * });
   */
  async executeEvent(event) {
    const startTime = Date.now();

    try {
      // Verify entity exists
      const entity = this.getEntity(event.entityName);
      if (!entity) {
        return {
          success: false,
          recordId: event.recordId,
          error: {
            code: 'ENTITY_NOT_FOUND',
            message: `Entity ${event.entityName} not registered`,
          },
          executionTime: Date.now() - startTime,
        };
      }

      // Find all workflows that match this event
      const matchingWorkflows = [];
      for (const workflow of this.workflows.values()) {
        if (workflow.triggers.includes(event.type) && workflow.active) {
          if (!workflow.filter || this.matchesFilter(event.data, workflow.filter)) {
            matchingWorkflows.push(workflow);
          }
        }
      }

      // Queue each workflow for async execution
      for (const workflow of matchingWorkflows) {
        this.queueWorkflow(workflow, event);
      }

      return {
        success: true,
        recordId: event.recordId,
        data: event,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        recordId: event.recordId,
        error: {
          code: 'EXECUTION_ERROR',
          message,
        },
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Validate entity definition
   * @private
   * @param {Object} def - Entity definition to validate
   * @throws {Error} If validation fails
   */
  validateEntity(def) {
    if (!def.name) {
      throw new Error('Entity must have a name');
    }
    if (!def.displayName) {
      throw new Error('Entity must have a displayName');
    }
    if (!Array.isArray(def.fields)) {
      throw new Error('Entity must have a fields array');
    }
  }

  /**
   * Validate workflow definition
   * @private
   * @param {Object} def - Workflow definition to validate
   * @throws {Error} If validation fails
   */
  validateWorkflow(def) {
    if (!def.name) {
      throw new Error('Workflow must have a name');
    }
    if (!Array.isArray(def.triggers)) {
      throw new Error('Workflow must have a triggers array');
    }
    if (typeof def.handler !== 'function') {
      throw new Error('Workflow must have a handler function');
    }
  }

  /**
   * Validate view definition
   * @private
   * @param {Object} def - View definition to validate
   * @throws {Error} If validation fails
   */
  validateView(def) {
    if (!def.name) {
      throw new Error('View must have a name');
    }
    if (!def.entityName) {
      throw new Error('View must have an entityName');
    }
    if (!def.type) {
      throw new Error('View must have a type');
    }

    const validTypes = ['form', 'table', 'detail', 'custom'];
    if (!validTypes.includes(def.type)) {
      throw new Error(`View type must be one of: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Validate policy definition
   * @private
   * @param {Object} def - Policy definition to validate
   * @throws {Error} If validation fails
   */
  validatePolicy(def) {
    if (!def.id) {
      throw new Error('Policy must have an id');
    }
    if (!def.name) {
      throw new Error('Policy must have a name');
    }
    if (!Array.isArray(def.rules)) {
      throw new Error('Policy must have a rules array');
    }
  }

  /**
   * Check if event data matches filter conditions
   * @private
   * @param {Object} data - Event data
   * @param {Object} filter - Filter conditions
   * @returns {boolean} True if data matches all filter conditions
   */
  matchesFilter(data, filter) {
    for (const [key, value] of Object.entries(filter)) {
      if (data[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Queue a workflow for async execution
   * Executes the workflow handler without blocking and catches errors
   * @private
   * @param {Object} workflow - Workflow to execute
   * @param {Object} event - Event that triggered the workflow
   */
  queueWorkflow(workflow, event) {
    // Execute asynchronously without blocking
    setImmediate(async () => {
      try {
        await workflow.handler(event, event.context);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(
          `[RuntimeRegistry] Workflow ${workflow.name} failed for event ${event.id}: ${message}`,
        );
      }
    });
  }
}
