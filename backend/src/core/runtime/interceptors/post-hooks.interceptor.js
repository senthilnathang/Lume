/**
 * @fileoverview PostHooksInterceptor [Stage 70] - Execute after-action hooks
 * Bridges to existing HookRegistry
 */

import logger from '../../services/logger.js';

class PostHooksInterceptor {
  /**
   * @param {Object} hookRegistry - HookRegistry instance
   */
  constructor(hookRegistry) {
    this.hookRegistry = hookRegistry;
    this.process = this.process.bind(this);
  }

  /**
   * Execute post-action hooks
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
        hookType = 'afterCreate';
      } else if (action === 'update') {
        hookType = 'afterUpdate';
      } else if (action === 'delete') {
        hookType = 'afterDelete';
      }

      if (!hookType) {
        // No post-hooks for this action
        return {};
      }

      // Execute hooks from entity definition
      if (entity.hooks && entity.hooks[hookType]) {
        logger.debug(`[PostHooksInterceptor] Executing ${hookType} hooks for ${entity.slug}`);

        // Pass the result from query execution to hooks
        for (const hookFn of entity.hooks[hookType]) {
          try {
            await hookFn(context.result || {}, {
              entity,
              action,
              user: context.executionContext,
              state: context.state,
            });
          } catch (hookError) {
            logger.error(`[PostHooksInterceptor] Hook error:`, hookError.message);
            // Log but don't abort on post-hook errors
            logger.warn(`[PostHooksInterceptor] Continuing despite hook error: ${hookError.message}`);
          }
        }
      }

      logger.debug(`[PostHooksInterceptor] Completed ${hookType} for ${entity.slug}`);
      return {
        stateUpdate: {
          postHooksExecuted: true,
        },
      };
    } catch (error) {
      logger.error('[PostHooksInterceptor] Error:', error.message);
      // Don't abort on post-hook errors - operation already succeeded
      logger.warn(`[PostHooksInterceptor] Post-hook error (non-fatal): ${error.message}`);
      return {};
    }
  }

  /**
   * Create a new PostHooksInterceptor
   * @static
   * @param {Object} hookRegistry - HookRegistry instance
   * @returns {PostHooksInterceptor}
   */
  static create(hookRegistry) {
    return new PostHooksInterceptor(hookRegistry);
  }
}

export default PostHooksInterceptor;
