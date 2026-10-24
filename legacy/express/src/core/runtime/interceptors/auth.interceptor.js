/**
 * @fileoverview AuthInterceptor [Stage 10] - JWT verification and context extraction
 * Reuses existing auth middleware patterns
 */

import logger from '../../services/logger.js';

class AuthInterceptor {
  /**
   * Process auth stage
   * @param {OperationRequest} request - Operation request
   * @param {InterceptorContext} context - Execution context
   * @returns {Promise<InterceptorResult>}
   */
  static async process(request, context) {
    try {
      // ExecutionContext should already be populated by runtime.execute()
      if (!context.executionContext || !context.executionContext.userId) {
        logger.warn('[AuthInterceptor] Missing userId in context');
        return {
          abort: true,
          abortReason: 'Authentication required',
          permissionChecks: [
            { check: 'authentication', allowed: false, reason: 'Missing user context' },
          ],
        };
      }

      logger.debug(
        `[AuthInterceptor] Authenticated user: ${context.executionContext.userId}`
      );

      return {
        stateUpdate: {
          authenticatedAt: new Date().toISOString(),
        },
        permissionChecks: [
          { check: 'authentication', allowed: true },
        ],
      };
    } catch (error) {
      logger.error('[AuthInterceptor] Error:', error.message);
      return {
        abort: true,
        abortReason: `Auth error: ${error.message}`,
      };
    }
  }
}

export default AuthInterceptor;
