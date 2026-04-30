/**
 * @fileoverview PermissionInterceptor [Stage 20] - RBAC + ABAC policy evaluation
 */

import logger from '../../services/logger.js';

class PermissionInterceptor {
  /**
   * @param {Object} policyEngine - PolicyEngine instance
   */
  constructor(policyEngine) {
    this.policyEngine = policyEngine;
    this.process = this.process.bind(this);
  }

  /**
   * Process permission stage
   * @param {OperationRequest} request - Operation request
   * @param {InterceptorContext} context - Execution context
   * @returns {Promise<InterceptorResult>}
   */
  async process(request, context) {
    try {
      // Skip permission checks if explicitly requested
      if (request.options?.skipPermissions) {
        logger.debug('[PermissionInterceptor] Skipped by request');
        return {
          permissionChecks: [
            { check: `${context.entity.slug}:${request.action}`, allowed: true, reason: 'Skipped by request' },
          ],
        };
      }

      // Evaluate permission policy
      const result = await this.policyEngine.evaluate({
        resource: context.entity.slug,
        action: request.action,
        user: context.executionContext,
        data: request.data,
      });

      if (!result.allowed) {
        logger.warn(
          `[PermissionInterceptor] Access denied for ${context.executionContext.userId}: ${context.entity.slug}#${request.action} - ${result.reason || 'no reason'}`
        );
        return {
          abort: true,
          abortReason: result.reason || 'Permission denied',
          permissionChecks: [
            { check: `${context.entity.slug}:${request.action}`, allowed: false, reason: result.reason },
          ],
        };
      }

      logger.debug(
        `[PermissionInterceptor] Access allowed for ${context.executionContext.userId}: ${context.entity.slug}#${request.action}`
      );

      // Store permission result for later stages (query filtering, field filtering)
      return {
        stateUpdate: {
          permissionResult: result,
        },
        permissionChecks: [
          { check: `${context.entity.slug}:${request.action}`, allowed: true },
        ],
      };
    } catch (error) {
      logger.error('[PermissionInterceptor] Error:', error.message);
      return {
        abort: true,
        abortReason: `Permission check error: ${error.message}`,
      };
    }
  }

  /**
   * Create a new PermissionInterceptor
   * @static
   * @param {Object} policyEngine - PolicyEngine instance
   * @returns {PermissionInterceptor}
   */
  static create(policyEngine) {
    return new PermissionInterceptor(policyEngine);
  }
}

export default PermissionInterceptor;
