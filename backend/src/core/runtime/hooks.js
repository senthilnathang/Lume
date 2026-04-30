/**
 * HookExecutor Implementation
 * Executes entity lifecycle hooks (before/after operations)
 * Part of the Lume Unified Runtime - Task 6
 */

/**
 * @typedef {import('./types.ts').EntityDef} EntityDef
 * @typedef {import('./types.ts').ExecutionContext} ExecutionContext
 */

/**
 * HookExecutor class for managing entity lifecycle hooks
 * Handles before/after hooks for create, update, and delete operations
 */
export class HookExecutor {
  /**
   * Constructor - initializes the hook executor
   */
  constructor() {
    // No state needed - hooks are stateless
  }

  /**
   * Capitalize a string (helper for hook name generation)
   * @private
   * @param {string} str - The string to capitalize
   * @returns {string} The capitalized string
   */
  #capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Execute a before-hook for entity operations
   * Before-hooks are called BEFORE the mutation and can:
   * - Transform data (return modified data)
   * - Validate data (throw to reject)
   * - Set defaults (e.g., createdBy = userId)
   *
   * @async
   * @param {'create' | 'update' | 'delete'} action - The action type
   * @param {EntityDef} entity - The entity definition containing hooks
   * @param {Record<string, unknown>} data - The data being mutated
   * @param {ExecutionContext} context - The execution context
   * @param {string} [recordId] - The record ID (required for delete, optional for others)
   * @returns {Promise<Record<string, unknown>>} The (possibly transformed) data to use in the mutation
   * @throws {Error} If the hook throws
   *
   * @example
   * const transformedData = await executor.executeBeforeHook('create', entity, data, context);
   */
  async executeBeforeHook(action, entity, data, context, recordId) {
    // If entity has no hooks, return data unchanged
    if (!entity.hooks) {
      return data;
    }

    // Build hook name: beforeCreate, beforeUpdate, beforeDelete
    const hookName = `before${this.#capitalize(action)}`;

    // If hook doesn't exist, return data unchanged
    if (!entity.hooks[hookName]) {
      return data;
    }

    const hook = entity.hooks[hookName];

    try {
      let result;

      // Call hook with appropriate parameters based on action type
      // All hooks follow signature: (context, data, [oldRecord])
      if (action === 'delete') {
        // For delete: hook(context, record)
        result = await hook(context, data);
      } else {
        // For create: hook(context, data)
        // For update: hook(context, data, oldRecord)
        result = await hook(context, data);
      }

      // Return the hook result if it exists, otherwise return original data
      return result !== undefined ? result : data;
    } catch (error) {
      // Log the error and re-throw (before-hooks can block operations)
      console.error(`Hook error for ${entity.name}:${action}`, error);
      throw error;
    }
  }

  /**
   * Execute an after-hook for entity operations
   * After-hooks are called AFTER the mutation and:
   * - Log operations
   * - Trigger side effects (emails, webhooks)
   * - Update related entities
   * Never fail the operation if after-hook fails (catch and log)
   *
   * @async
   * @param {'create' | 'update' | 'delete'} action - The action type
   * @param {EntityDef} entity - The entity definition containing hooks
   * @param {Record<string, unknown>} record - The final record (created/updated/deleted)
   * @param {ExecutionContext} context - The execution context
   * @returns {Promise<void>} Always resolves (never rejects)
   *
   * @example
   * await executor.executeAfterHook('create', entity, record, context);
   */
  async executeAfterHook(action, entity, record, context) {
    // If entity has no hooks, return void
    if (!entity.hooks) {
      return;
    }

    // Build hook name: afterCreate, afterUpdate, afterDelete
    const hookName = `after${this.#capitalize(action)}`;

    // If hook doesn't exist, return void
    if (!entity.hooks[hookName]) {
      return;
    }

    const hook = entity.hooks[hookName];

    try {
      // Call hook with appropriate parameters based on action type
      // All hooks follow signature: (context, record, [oldRecord])
      if (action === 'delete') {
        // For delete: hook(context, record)
        await hook(context, record);
      } else {
        // For create/update: hook(context, record)
        await hook(context, record);
      }
    } catch (error) {
      // Log the error but DON'T re-throw
      // After-hooks should never fail the operation
      console.error(`Hook error for ${entity.name}:${action}`, error);
    }
  }
}
