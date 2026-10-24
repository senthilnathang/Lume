/**
 * @fileoverview InterceptorPipeline - Orchestrates ordered execution of 8 interceptor stages
 * Each interceptor can abort, transform request, or pass through
 */

import logger from '../services/logger.js';

class InterceptorPipeline {
  constructor() {
    // Map of order number -> Interceptor
    this.interceptors = new Map();
    this.interceptorsByName = new Map();
  }

  /**
   * Register an interceptor with an execution order
   * @param {string} name - Interceptor name
   * @param {number} order - Execution order (10, 20, 30, 40, 50, 55, 60, 70, 80, etc.)
   * @param {Function} processFn - async processFn(request, context) -> { abort?, abortReason?, result?, stateUpdate?, permissionChecks? }
   * @param {boolean} [enabled=true] - Whether interceptor is enabled
   */
  register(name, order, processFn, enabled = true) {
    if (order < 10 || !Number.isInteger(order)) {
      throw new Error(`Order must be integer >= 10, got ${order}`);
    }

    const interceptor = {
      name,
      order,
      processFn,
      enabled,
    };

    this.interceptors.set(order, interceptor);
    this.interceptorsByName.set(name, interceptor);

    logger.debug(`[InterceptorPipeline] Registered interceptor: ${name} (order: ${order})`);
  }

  /**
   * Enable/disable an interceptor by name
   * @param {string} name - Interceptor name
   * @param {boolean} enabled - Whether to enable
   */
  setEnabled(name, enabled) {
    const interceptor = this.interceptorsByName.get(name);
    if (interceptor) {
      interceptor.enabled = enabled;
    }
  }

  /**
   * Execute the full pipeline
   * @param {OperationRequest} request - The operation request
   * @param {EntityDefinition} entity - The entity definition
   * @param {ExecutionContext} executionContext - User context
   * @returns {Promise<InterceptorContext>} Final execution context after all stages
   */
  async execute(request, entity, executionContext) {
    const startTime = Date.now();

    // Build context that flows through pipeline
    const context = {
      request,
      entity,
      executionContext,
      state: {},
      interceptorsRun: [],
      permissionChecks: [],
      result: null,
      errors: [],
    };

    // Get sorted interceptors by order
    const sortedInterceptors = Array.from(this.interceptors.values())
      .sort((a, b) => a.order - b.order);

    // Execute each interceptor in sequence
    for (const interceptor of sortedInterceptors) {
      if (!interceptor.enabled) {
        logger.debug(`[InterceptorPipeline] Skipped disabled interceptor: ${interceptor.name}`);
        continue;
      }

      try {
        logger.debug(`[InterceptorPipeline] Executing [${interceptor.order}] ${interceptor.name}`);

        const result = await interceptor.processFn(request, context);

        // Track this interceptor ran
        context.interceptorsRun.push(interceptor.name);

        // Check if should abort
        if (result && result.abort) {
          logger.info(
            `[InterceptorPipeline] Aborted at [${interceptor.order}] ${interceptor.name}: ${result.abortReason || 'no reason'}`
          );
          context.aborted = true;
          context.abortReason = result.abortReason;
          context.abortAt = interceptor.order;
          break;
        }

        // Merge state updates
        if (result && result.stateUpdate) {
          context.state = { ...context.state, ...result.stateUpdate };
        }

        // Track permission checks
        if (result && result.permissionChecks && Array.isArray(result.permissionChecks)) {
          context.permissionChecks.push(...result.permissionChecks);
        }

        // Update result if provided
        if (result && result.result !== undefined) {
          context.result = result.result;
        }
      } catch (error) {
        logger.error(
          `[InterceptorPipeline] Error in [${interceptor.order}] ${interceptor.name}:`,
          error.message
        );
        context.errors.push({
          interceptor: interceptor.name,
          message: error.message,
          code: error.code || 'INTERCEPTOR_ERROR',
        });
        context.aborted = true;
        context.abortReason = `Error in ${interceptor.name}: ${error.message}`;
        break;
      }
    }

    // Calculate execution time
    context.duration = Date.now() - startTime;

    logger.debug(`[InterceptorPipeline] Pipeline completed in ${context.duration}ms`);

    return context;
  }

  /**
   * Get interceptor by name
   * @param {string} name - Interceptor name
   * @returns {Object|null} Interceptor or null if not found
   */
  getInterceptor(name) {
    return this.interceptorsByName.get(name) || null;
  }

  /**
   * Get all registered interceptors sorted by order
   * @returns {Object[]} Sorted interceptors
   */
  getInterceptors() {
    return Array.from(this.interceptors.values())
      .sort((a, b) => a.order - b.order);
  }

  /**
   * List interceptor names in order
   * @returns {string[]} Interceptor names
   */
  listInterceptors() {
    return this.getInterceptors().map(i => `[${i.order}] ${i.name}`);
  }
}

export default InterceptorPipeline;
