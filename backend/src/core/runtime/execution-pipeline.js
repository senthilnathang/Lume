import { v4 as uuidv4 } from 'uuid';

/**
 * ExecutionPipeline orchestrates the 7-step execution flow for entity operations
 *
 * Pipeline steps:
 * 1. Permission check (policy engine validates operation)
 * 2. Before-hooks run (custom logic)
 * 3. Mutation executed (DB write)
 * 4. After-hooks & workflows triggered (event queue)
 * 5. Event emission (agents subscribe and react)
 * 6. View invalidation signals (grid refresh)
 * 7. Return result to caller
 *
 * @class
 */
export class ExecutionPipeline {
  /**
   * Creates an ExecutionPipeline instance
   * @param {Object} eventBus The event bus for emitting runtime events
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.permissionEngine = null;
    this.hookExecutor = null;
    this.dataStore = null;
  }

  /**
   * Injects optional dependencies for permission checking, hook execution, and data storage
   * @param {Object} deps Object containing optional permissionEngine, hookExecutor, and dataStore
   */
  injectDependencies(deps) {
    if (deps.permissionEngine) {
      this.permissionEngine = deps.permissionEngine;
    }
    if (deps.hookExecutor) {
      this.hookExecutor = deps.hookExecutor;
    }
    if (deps.dataStore) {
      this.dataStore = deps.dataStore;
    }
  }

  /**
   * Executes a create, update, or delete operation through the 7-step pipeline
   * @param {string} action The type of operation: 'create', 'update', or 'delete'
   * @param {Object} entity The entity definition
   * @param {Object} data The data being written (payload for create/update, empty for delete)
   * @param {Object} context The execution context with user and security info
   * @param {string} [recordId] The record ID (required for update/delete)
   * @param {Object} [previousData] The previous state of the record (for updates)
   * @returns {Promise<Object>} ExecutionResult with success status, data, and execution time
   */
  async execute(action, entity, data, context, recordId, previousData) {
    const startTime = Date.now();

    try {
      // Step 1: Permission Check
      const permissionCheck = await this.checkPermission(action, entity, context);
      if (!permissionCheck.allowed) {
        return this.errorResult('PERMISSION_DENIED', permissionCheck.reason, startTime);
      }

      let mutationData = data;
      let record;

      if (action === 'create') {
        // Step 2: Before-Create Hook
        mutationData = await this.executeBeforeHook(entity, 'beforeCreate', context, mutationData);

        // Step 3: Create Mutation
        record = await this.dataStore.create(entity, mutationData);

        // Step 4: After-Create Hook
        await this.executeAfterHook(entity, 'afterCreate', context, record).catch((err) => {
          console.error('After-create hook failed:', err);
        });
      } else if (action === 'update' && recordId && previousData) {
        return this.executeUpdate(recordId, entity, mutationData, previousData, context);
      } else if (action === 'delete' && recordId) {
        // Step 2: Before-Delete Hook
        const existingRecord = await this.dataStore.get?.(entity, recordId);
        if (existingRecord) {
          await this.executeBeforeHook(entity, 'beforeDelete', context, existingRecord).catch(
            (err) => {
              console.error('Before-delete hook failed:', err);
            },
          );
        }

        // Step 3: Delete Mutation
        record = await this.dataStore.delete(entity, recordId);

        // Step 4: After-Delete Hook
        if (record) {
          await this.executeAfterHook(entity, 'afterDelete', context, record).catch((err) => {
            console.error('After-delete hook failed:', err);
          });
        }
      } else {
        return this.errorResult(
          'INVALID_REQUEST',
          'Invalid action or missing required fields',
          startTime,
        );
      }

      // Step 5: Event Emission
      const runtimeEvent = this.createRuntimeEvent(action, entity, record);
      runtimeEvent.context = context;
      await this.eventBus.emit(runtimeEvent);

      // Step 6 & 7: Return Result
      return this.successResult(record, startTime);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const code = this.categorizeError(error);
      return this.errorResult(code, message, startTime);
    }
  }

  /**
   * Executes an update operation with before/after hooks and event emission
   * @param {string} recordId The ID of the record to update
   * @param {Object} entity The entity definition
   * @param {Object} data The update payload
   * @param {Object} previousData The previous state of the record
   * @param {Object} context The execution context
   * @returns {Promise<Object>} ExecutionResult with updated data and execution time
   */
  async executeUpdate(recordId, entity, data, previousData, context) {
    const startTime = Date.now();

    try {
      // Step 1: Permission Check
      const permissionCheck = await this.checkPermission('update', entity, context);
      if (!permissionCheck.allowed) {
        return this.errorResult('PERMISSION_DENIED', permissionCheck.reason, startTime);
      }

      let mutationData = data;

      // Step 2: Before-Update Hook
      mutationData = await this.executeBeforeHook(
        entity,
        'beforeUpdate',
        context,
        mutationData,
        previousData,
      );

      // Step 3: Update Mutation
      const record = await this.dataStore.update(entity, recordId, mutationData);

      // Step 4: After-Update Hook
      await this.executeAfterHook(
        entity,
        'afterUpdate',
        context,
        record,
        previousData,
      ).catch((err) => {
        console.error('After-update hook failed:', err);
      });

      // Step 5: Event Emission
      const runtimeEvent = this.createRuntimeEvent('update', entity, record, previousData);
      runtimeEvent.context = context;
      await this.eventBus.emit(runtimeEvent);

      // Step 6 & 7: Return Result
      return this.successResult(record, startTime);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const code = this.categorizeError(error);
      return this.errorResult(code, message, startTime);
    }
  }

  /**
   * Checks if the user has permission to perform the action
   * Auto-approves for admin and super_admin roles
   * @private
   * @param {string} action The action being performed
   * @param {Object} entity The entity definition
   * @param {Object} context The execution context
   * @returns {Promise<Object>} Permission result with allowed flag
   */
  async checkPermission(action, entity, context) {
    // Auto-approve for admin roles
    if (context.role === 'admin' || context.role === 'super_admin') {
      return { allowed: true, reason: 'Admin role auto-approved' };
    }

    // Check permission via engine
    if (this.permissionEngine) {
      const permissionKey = `${entity.name}:${action}`;
      const result = await this.permissionEngine.check(permissionKey, context);
      return {
        allowed: result.allowed,
        reason: result.reason,
      };
    }

    // Default: allow if no engine available
    return { allowed: true, reason: 'No permission engine configured' };
  }

  /**
   * Executes a before-hook for the specified operation type
   * @private
   * @param {Object} entity The entity definition
   * @param {string} hookType The type of before-hook ('beforeCreate', 'beforeUpdate', 'beforeDelete')
   * @param {Object} context The execution context
   * @param {Object} data The data being written
   * @param {Object} [previousData] Optional previous data for update operations
   * @returns {Promise<Object>} The data returned from the hook (or original data if no hook)
   */
  async executeBeforeHook(entity, hookType, context, data, previousData) {
    if (!entity.hooks || !entity.hooks[hookType]) {
      return data;
    }

    const hook = entity.hooks[hookType];
    if (hookType === 'beforeDelete') {
      await hook(context, data);
      return data;
    } else if (hookType === 'beforeUpdate' && previousData) {
      return await hook(context, data, previousData);
    } else {
      return await hook(context, data);
    }
  }

  /**
   * Executes an after-hook for the specified operation type
   * Failures in after-hooks do not fail the operation
   * @private
   * @param {Object} entity The entity definition
   * @param {string} hookType The type of after-hook ('afterCreate', 'afterUpdate', 'afterDelete')
   * @param {Object} context The execution context
   * @param {Object} record The resulting record data
   * @param {Object} [previousData] Optional previous data for update operations
   * @returns {Promise<void>}
   */
  async executeAfterHook(entity, hookType, context, record, previousData) {
    if (!entity.hooks || !entity.hooks[hookType]) {
      return;
    }

    const hook = entity.hooks[hookType];
    if (hookType === 'afterDelete') {
      await hook(context, record);
    } else if (hookType === 'afterUpdate' && previousData) {
      await hook(context, record, previousData);
    } else {
      await hook(context, record);
    }
  }

  /**
   * Creates a RuntimeEvent from the operation result
   * @private
   * @param {string} action The action performed
   * @param {Object} entity The entity definition
   * @param {Object} record The resulting record
   * @param {Object} [previousData] Optional previous data for updates
   * @returns {Object} A RuntimeEvent ready to emit
   */
  createRuntimeEvent(action, entity, record, previousData) {
    const typeMap = {
      create: 'entity:created',
      update: 'entity:updated',
      delete: 'entity:deleted',
    };

    return {
      id: uuidv4(),
      type: typeMap[action],
      entityName: entity.name,
      action,
      recordId: String(record.id),
      data: record,
      previousData: previousData || null,
      context: {},
      timestamp: new Date().toISOString(),
      correlationId: uuidv4(),
    };
  }

  /**
   * Creates a successful ExecutionResult
   * @private
   * @param {Object} record The resulting record
   * @param {number} startTime The pipeline start time
   * @returns {Object} ExecutionResult with success flag set
   */
  successResult(record, startTime) {
    return {
      success: true,
      recordId: String(record.id),
      data: record,
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Creates a failed ExecutionResult
   * @private
   * @param {string} code The error code
   * @param {string} message The error message
   * @param {number} startTime The pipeline start time
   * @returns {Object} ExecutionResult with error details
   */
  errorResult(code, message, startTime) {
    return {
      success: false,
      error: {
        code,
        message,
      },
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Categorizes an error to determine the appropriate error code
   * @private
   * @param {unknown} error The error thrown
   * @returns {string} The error code string
   */
  categorizeError(error) {
    if (error instanceof Error) {
      if (error.message.includes('permission') || error.message.includes('Permission')) {
        return 'PERMISSION_DENIED';
      }
      if (
        error.message.includes('validation') ||
        error.message.includes('Validation') ||
        error.message.includes('required')
      ) {
        return 'VALIDATION_ERROR';
      }
      if (
        error.message.includes('constraint') ||
        error.message.includes('Constraint') ||
        error.message.includes('Database') ||
        error.message.includes('database')
      ) {
        return 'DATABASE_ERROR';
      }
    }
    return 'INTERNAL_ERROR';
  }
}
