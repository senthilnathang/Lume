/**
 * @fileoverview PolicyEngine - RBAC + ABAC policy evaluation
 * Evaluates whether a user can perform an action on a resource
 */

import ExpressionEvaluator from './evaluator.js';
import logger from '../services/logger.js';

class PolicyEngine {
  /**
   * @param {MetadataRegistry} registry - Metadata registry for permission policies
   */
  constructor(registry) {
    this.registry = registry;
    this.evaluator = new ExpressionEvaluator();
  }

  /**
   * Evaluate if a user can perform an action on a resource
   * @param {PermissionRequest} request - Permission request
   * @returns {Promise<PermissionResult>}
   */
  async evaluate(request) {
    try {
      const { resource, action, user, data, scope } = request;

      logger.debug(
        `[PolicyEngine] Evaluating ${user.userId} ${resource}#${action} [scope=${scope}]`
      );

      // Get policies for this resource+action
      const policies = await this.registry.getPermissions(resource, action);

      if (!policies || policies.length === 0) {
        // No policy = allow (open by default)
        logger.debug(`[PolicyEngine] No policies found for ${resource}#${action}, allowing`);
        return { allowed: true };
      }

      // Evaluate each policy
      for (const policy of policies) {
        const result = await this.evaluatePolicy(policy, user, data);
        if (!result.allowed) {
          logger.warn(
            `[PolicyEngine] Policy denied: ${resource}#${action} - ${result.reason}`
          );
          return result;
        }
      }

      // All policies passed
      logger.debug(`[PolicyEngine] All policies allowed for ${resource}#${action}`);
      return { allowed: true };
    } catch (error) {
      logger.error('[PolicyEngine] Error:', error.message);
      return {
        allowed: false,
        reason: `Permission evaluation error: ${error.message}`,
      };
    }
  }

  /**
   * Evaluate a single policy
   * @private
   * @param {PermissionPolicy} policy - Permission policy
   * @param {ExecutionContext} user - User context
   * @param {Object} data - Record data for ABAC
   * @returns {Promise<PermissionResult>}
   */
  async evaluatePolicy(policy, user, data) {
    // RBAC check: must have required role
    if (policy.allowedRoles && Array.isArray(policy.allowedRoles)) {
      const hasRole = user.roles.some(role => policy.allowedRoles.includes(role));
      if (!hasRole) {
        return {
          allowed: false,
          reason: `User does not have required role. Required: ${policy.allowedRoles.join(', ')}, Got: ${user.roles.join(', ')}`,
        };
      }
    }

    // ABAC check: evaluate condition expression
    if (policy.rule) {
      try {
        const context = {
          user,
          data: data || {},
          now: new Date(),
        };

        const allowed = await this.evaluator.evaluate(policy.rule, context);
        if (!allowed) {
          return {
            allowed: false,
            reason: `Condition not met: ${policy.rule}`,
          };
        }
      } catch (error) {
        return {
          allowed: false,
          reason: `Condition evaluation error: ${error.message}`,
        };
      }
    }

    // Field-level permissions
    const fieldFilters = {};
    if (policy.fieldLevel && typeof policy.fieldLevel === 'object') {
      for (const [field, rule] of Object.entries(policy.fieldLevel)) {
        try {
          const context = {
            user,
            data: data || {},
            now: new Date(),
          };

          const allowed = await this.evaluator.evaluate(rule, context);
          fieldFilters[field] = allowed;
        } catch (error) {
          logger.warn(`[PolicyEngine] Field-level rule error for ${field}:`, error.message);
          fieldFilters[field] = false;
        }
      }
    }

    // Query filters for ABAC scope
    const filters = [];
    if (policy.scope === 'query' && policy.rule) {
      filters.push({
        condition: policy.rule,
        operator: 'AND',
      });
    }

    return {
      allowed: true,
      filters,
      fieldFilters,
    };
  }

  /**
   * Check if user has permission for a resource+action (simple boolean check)
   * @param {string} resource - Resource name
   * @param {string} action - Action name
   * @param {ExecutionContext} user - User context
   * @param {Object} [data] - Record data for ABAC
   * @returns {Promise<boolean>}
   */
  async hasPermission(resource, action, user, data = null) {
    const result = await this.evaluate({
      resource,
      action,
      user,
      data,
    });

    return result.allowed === true;
  }
}

export default PolicyEngine;
