/**
 * Core ActionExecutor for the Lume Workflow System
 * Handles execution of workflow actions with timeout, retry, and dependency management
 */

/**
 * Result of executing a single action
 * Indicates success/failure and contains execution metadata
 * @typedef {Object} ActionResult
 * @property {boolean} success - Whether the action executed successfully
 * @property {string} actionId - ID of the action that was executed
 * @property {unknown} [data] - Result data from successful action execution (optional)
 * @property {string} [error] - Error message if action failed (optional)
 */

/**
 * Executes workflow actions with support for timeout, retry, and dependency handling
 * Manages action execution sequencing and result tracking
 */
export class ActionExecutor {
  /**
   * Create a new ActionExecutor instance
   * @param {any} entityStore - Service for entity CRUD operations
   */
  constructor(entityStore) {
    this.entityStore = entityStore;
  }

  /**
   * Execute a single action with timeout and error handling
   *
   * @param {Object} action - The action to execute
   * @param {string} action.id - Unique identifier for this action
   * @param {string} action.type - Type of action (create-entity, update-entity, etc.)
   * @param {string} [action.target] - Target entity or service
   * @param {Object} action.payload - Action configuration and parameters
   * @param {number} [action.timeout] - Timeout in seconds (default 30)
   * @param {string[]} [action.dependsOn] - IDs of actions that must complete first
   * @param {string} [action.onError] - Error handling strategy ('continue' or 'stop')
   * @param {number} [action.retryCount] - Maximum number of retries
   * @param {Object} instance - The workflow instance context
   * @param {string} instance.id - Instance ID
   * @param {Map} instance.actionResults - Map of action ID to result data
   * @param {Record<string, unknown>} contextData - Additional context data
   * @returns {Promise<ActionResult>} Promise resolving to ActionResult
   */
  async execute(action, instance, contextData) {
    try {
      // Get timeout in milliseconds (default 30 seconds if not specified)
      const timeoutMs = (action.timeout || 30) * 1000;

      // Execute action with timeout using Promise.race()
      const data = await Promise.race([
        this.executeAction(action, instance, contextData),
        this.createTimeout(timeoutMs)
      ]);

      // Update instance action results
      instance.actionResults.set(action.id, data);

      return {
        success: true,
        actionId: action.id,
        data
      };
    } catch (error) {
      // Extract error message
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        actionId: action.id,
        error: errorMessage
      };
    }
  }

  /**
   * Execute multiple actions sequentially with dependency and error handling
   *
   * @param {Object[]} actions - Array of actions to execute in order
   * @param {Object} instance - The workflow instance context
   * @param {Map} instance.actionResults - Map of action ID to result data
   * @param {Record<string, unknown>} contextData - Additional context data
   * @returns {Promise<ActionResult[]>} Promise resolving to array of ActionResults
   */
  async executeAll(actions, instance, contextData) {
    const results = [];
    const executedIds = new Set();
    let shouldStop = false;

    for (const action of actions) {
      // If we stopped on a previous action, add remaining actions as skipped
      if (shouldStop) {
        results.push({
          success: false,
          actionId: action.id,
          error: 'Workflow stopped due to previous action failure'
        });
        continue;
      }

      // Check if dependencies are met
      if (action.dependsOn && action.dependsOn.length > 0) {
        const allDependenciesMet = action.dependsOn.every(depId => executedIds.has(depId));

        if (!allDependenciesMet) {
          const missingDeps = action.dependsOn.filter(depId => !executedIds.has(depId));
          const result = {
            success: false,
            actionId: action.id,
            error: `Action depends on ${missingDeps.join(', ')} which have not been executed`
          };
          results.push(result);
          continue;
        }
      }

      // Execute the action
      const result = await this.execute(action, instance, contextData);
      results.push(result);

      // Track executed action
      if (result.success) {
        executedIds.add(action.id);
      }

      // Check if we should stop on error
      if (!result.success && action.onError === 'stop') {
        shouldStop = true;
      }
    }

    return results;
  }

  /**
   * Internal method to dispatch action to specific handler based on action type
   *
   * @param {Object} action - The action to execute
   * @param {string} action.type - Type of action
   * @param {string} action.target - Target entity
   * @param {Object} action.payload - Action payload
   * @param {Object} instance - The workflow instance context
   * @param {Record<string, unknown>} contextData - Additional context data
   * @returns {Promise<unknown>} Promise resolving to action result data
   */
  async executeAction(action, instance, contextData) {
    switch (action.type) {
      case 'create-entity':
        return this.entityStore.create(action.target, action.payload);

      case 'update-entity': {
        // Extract id from payload
        const { id, ...updatePayload } = action.payload;
        return this.entityStore.update(action.target, { id }, updatePayload);
      }

      case 'delete-entity':
        return this.entityStore.delete(action.target, action.payload);

      case 'send-notification':
        return this.sendNotification(action.payload);

      case 'webhook':
        return this.callWebhook(action.payload);

      case 'custom':
        return this.executeCustomAction(action.payload);

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Send a notification
   * Placeholder implementation for notification service integration
   *
   * @param {Record<string, unknown>} payload - Notification payload
   * @returns {Promise<unknown>} Promise resolving to notification result
   */
  async sendNotification(payload) {
    // Placeholder: actual implementation would call notification service
    return Promise.resolve({ sent: true });
  }

  /**
   * Call a webhook
   * Placeholder implementation for HTTP webhook calls
   *
   * @param {Record<string, unknown>} payload - Webhook payload
   * @returns {Promise<unknown>} Promise resolving to webhook result
   */
  async callWebhook(payload) {
    // Placeholder: actual implementation would make HTTP request
    return Promise.resolve({ success: true });
  }

  /**
   * Execute custom action
   * Placeholder implementation for custom business logic
   *
   * @param {Record<string, unknown>} payload - Custom action payload
   * @returns {Promise<unknown>} Promise resolving to custom action result
   */
  async executeCustomAction(payload) {
    // Placeholder: actual implementation would execute custom logic
    return Promise.resolve({ executed: true });
  }

  /**
   * Create a timeout promise that rejects after specified milliseconds
   * Used with Promise.race() to implement action timeouts
   *
   * @param {number} ms - Timeout duration in milliseconds
   * @returns {Promise<never>} Promise that rejects after timeout
   */
  createTimeout(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Action execution timeout after ${ms}ms`));
      }, ms);
    });
  }
}
