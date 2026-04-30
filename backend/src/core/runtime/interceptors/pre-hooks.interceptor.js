/**
 * @fileoverview PreHooksInterceptor [Stage 40] - Execute before-action hooks
 * Bridges to existing HookRegistry
 */

import logger from '../../services/logger.js';

class PreHooksInterceptor {
  /**
   * @param {Object} hookRegistry - HookRegistry instance
   */
  constructor(hookRegistry) {
    this.hookRegistry = hookRegistry;
    this.process = this.process.bind(this);
  }

  /**
   * Execute pre-action hooks
   * @param {OperationRequest} request - Operation request
   * @param {InterceptorContext} context - Execution context
   * @returns {Promise<InterceptorResult>}
   */
  async process(request, context) {
    try {
      const entity = context.entity;
      const action = request.action;

      // Map action to hook type
      let hookType = null;
      if (action === 'create') {
        hookType = 'beforeCreate';
      } else if (action === 'update') {
        hookType = 'beforeUpdate';
      } else if (action === 'delete') {
        hookType = 'beforeDelete';
      }

      if (!hookType) {
        // No pre-hooks for this action
        return {};
      }

      // Execute hooks from entity definition
      if (entity.hooks && entity.hooks[hookType]) {
        logger.debug(`[PreHooksInterceptor] Executing ${hookType} hooks for ${entity.slug}`);

        for (const hookFn of entity.hooks[hookType]) {
          try {
            await hookFn(request.data || {}, {
              entity,
              action,
              user: context.executionContext,
              state: context.state,
            });
          } catch (hookError) {
            logger.error(`[PreHooksInterceptor] Hook error:`, hookError.message);
            throw hookError;
          }
        }
      }

      logger.debug(`[PreHooksInterceptor] Completed ${hookType} for ${entity.slug}`);
      return {
        stateUpdate: {
          preHooksExecuted: true,
        },
      };
    } catch (error) {
      logger.error('[PreHooksInterceptor] Error:', error.message);
      return {
        abort: true,
        abortReason: `Pre-hook error: ${error.message}`,
      };
    }
  }

  /**
   * Create a new PreHooksInterceptor
   * @static
   * @param {Object} hookRegistry - HookRegistry instance
   * @returns {PreHooksInterceptor}
   */
  static create(hookRegistry) {
    return new PreHooksInterceptor(hookRegistry);
  }
}

export default PreHooksInterceptor;
