/**
 * ConditionEvaluator
 * Evaluates ABAC (Attribute-Based Access Control) permission conditions.
 * Supports role, ownership, time, attribute, and expression-based conditions.
 */

import { SafeExpressionEvaluator } from './safe-evaluator.js';

export class ConditionEvaluator {
  constructor() {
    this.expressionEvaluator = new SafeExpressionEvaluator();
  }

  /**
   * Evaluate a single condition
   * @param {PermissionContext} context - The permission context
   * @param {PermissionCondition} condition - The condition to evaluate
   * @returns {Promise<EvaluationResult>} - Evaluation result with allowed, reason, and ttl
   */
  async evaluate(context, condition) {
    if (!condition || !condition.type) {
      throw new Error('Condition must have a type property');
    }

    switch (condition.type) {
      case 'role':
        return this.evaluateRoleCondition(context, condition);
      case 'ownership':
        return this.evaluateOwnershipCondition(context, condition);
      case 'time':
        return this.evaluateTimeCondition(context, condition);
      case 'attribute':
        return this.evaluateAttributeCondition(context, condition);
      case 'expression':
        return this.evaluateExpressionCondition(context, condition);
      default:
        throw new Error(`Unknown condition type: ${condition.type}`);
    }
  }

  /**
   * Evaluate all conditions with AND logic
   * @param {PermissionContext} context - The permission context
   * @param {PermissionCondition[]} conditions - Array of conditions to evaluate
   * @returns {Promise<EvaluationResult>} - Combined evaluation result
   */
  async evaluateAll(context, conditions) {
    if (!conditions || conditions.length === 0) {
      return {
        allowed: true,
        reason: 'No conditions to evaluate',
        ttl: 3600
      };
    }

    let minTtl = Infinity;
    const reasons = [];

    for (const condition of conditions) {
      const result = await this.evaluate(context, condition);

      if (!result.allowed) {
        return {
          allowed: false,
          reason: `Condition ${condition.type} failed: ${result.reason}`,
          ttl: result.ttl || 0
        };
      }

      reasons.push(result.reason);
      minTtl = Math.min(minTtl, result.ttl || 3600);
    }

    return {
      allowed: true,
      reason: `All conditions passed: ${reasons.join('; ')}`,
      ttl: minTtl === Infinity ? 3600 : minTtl
    };
  }

  /**
   * Evaluate role condition
   * Checks if user.userRole is in condition.roles array
   * @private
   */
  evaluateRoleCondition(context, condition) {
    if (!condition.roles || !Array.isArray(condition.roles)) {
      return {
        allowed: false,
        reason: 'Role condition must specify roles array',
        ttl: 3600
      };
    }

    const allowed = condition.roles.includes(context.userRole);

    return {
      allowed,
      reason: allowed
        ? `User role '${context.userRole}' is in allowed roles: ${condition.roles.join(', ')}`
        : `User role '${context.userRole}' is not in allowed roles: ${condition.roles.join(', ')}`,
      ttl: 3600
    };
  }

  /**
   * Evaluate ownership condition
   * Checks if context.userId matches resource owner field
   * @private
   */
  evaluateOwnershipCondition(context, condition) {
    if (!condition.ownerField) {
      return {
        allowed: false,
        reason: 'Ownership condition must specify ownerField',
        ttl: 600
      };
    }

    if (!context.resourceData) {
      return {
        allowed: false,
        reason: 'No resource data available for ownership check',
        ttl: 600
      };
    }

    const ownerValue = context.resourceData[condition.ownerField];
    const allowed = ownerValue === context.userId;

    return {
      allowed,
      reason: allowed
        ? `User ${context.userId} is the owner (${condition.ownerField})`
        : `User ${context.userId} is not the owner (${condition.ownerField}=${ownerValue})`,
      ttl: 600
    };
  }

  /**
   * Evaluate time condition
   * Checks if current time is within startTime/endTime and falls on allowed daysOfWeek
   * @private
   */
  evaluateTimeCondition(context, condition) {
    if (!condition.startTime || !condition.endTime || !condition.daysOfWeek) {
      return {
        allowed: false,
        reason: 'Time condition must specify startTime, endTime, and daysOfWeek',
        ttl: 60
      };
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay();

    // Parse start and end times
    const [startHour, startMin] = condition.startTime.split(':').map(Number);
    const [endHour, endMin] = condition.endTime.split(':').map(Number);

    // Check if current day is in allowed days
    const dayAllowed = condition.daysOfWeek.includes(currentDay);

    // Check if current time is within range (as minutes since midnight)
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const startTimeInMinutes = startHour * 60 + startMin;
    const endTimeInMinutes = endHour * 60 + endMin;

    const timeAllowed = currentTimeInMinutes >= startTimeInMinutes &&
                        currentTimeInMinutes <= endTimeInMinutes;

    const allowed = dayAllowed && timeAllowed;

    return {
      allowed,
      reason: allowed
        ? `Current time ${currentHour}:${String(currentMinute).padStart(2, '0')} on day ${currentDay} is within allowed hours and days`
        : `Current time/day not allowed (day ${currentDay} in [${condition.daysOfWeek.join(', ')}]? ${dayAllowed}; ${currentHour}:${String(currentMinute).padStart(2, '0')} in ${condition.startTime}-${condition.endTime}? ${timeAllowed})`,
      ttl: 60
    };
  }

  /**
   * Evaluate attribute condition
   * Compares user attribute against value using specified operator
   * @private
   */
  evaluateAttributeCondition(context, condition) {
    if (!condition.field || !condition.operator) {
      return {
        allowed: false,
        reason: 'Attribute condition must specify field and operator',
        ttl: 600
      };
    }

    if (!context.userAttributes) {
      return {
        allowed: false,
        reason: 'No user attributes available',
        ttl: 600
      };
    }

    const userValue = context.userAttributes[condition.field];

    if (userValue === undefined) {
      return {
        allowed: false,
        reason: `User attribute '${condition.field}' is not defined`,
        ttl: 600
      };
    }

    const allowed = this.compareValues(userValue, condition.operator, condition.value);

    return {
      allowed,
      reason: allowed
        ? `Attribute '${condition.field}' (${userValue}) matches condition (${condition.operator} ${JSON.stringify(condition.value)})`
        : `Attribute '${condition.field}' (${userValue}) does not match condition (${condition.operator} ${JSON.stringify(condition.value)})`,
      ttl: 600
    };
  }

  /**
   * Evaluate expression condition
   * Uses SafeExpressionEvaluator to safely evaluate an expression
   * @private
   */
  evaluateExpressionCondition(context, condition) {
    if (!condition.expression) {
      return {
        allowed: false,
        reason: 'Expression condition must specify expression',
        ttl: 300
      };
    }

    try {
      const result = this.expressionEvaluator.evaluate(
        context.userAttributes || {},
        condition.expression
      );

      return {
        allowed: !!result,
        reason: result
          ? `Expression '${condition.expression}' evaluated to true`
          : `Expression '${condition.expression}' evaluated to false`,
        ttl: 300
      };
    } catch (error) {
      throw new Error(`Failed to evaluate expression: ${error.message}`);
    }
  }

  /**
   * Compare two values using the specified operator
   * @private
   */
  compareValues(userValue, operator, conditionValue) {
    switch (operator) {
      case 'eq':
        return userValue === conditionValue;

      case 'neq':
        return userValue !== conditionValue;

      case 'gt':
        return userValue > conditionValue;

      case 'gte':
        return userValue >= conditionValue;

      case 'lt':
        return userValue < conditionValue;

      case 'lte':
        return userValue <= conditionValue;

      case 'in':
        // conditionValue should be array
        if (!Array.isArray(conditionValue)) {
          return false;
        }
        return conditionValue.includes(userValue);

      case 'nin':
        // not in - conditionValue should be array
        if (!Array.isArray(conditionValue)) {
          return false;
        }
        return !conditionValue.includes(userValue);

      case 'contains':
        // userValue should be array or string
        if (Array.isArray(userValue)) {
          return userValue.includes(conditionValue);
        }
        if (typeof userValue === 'string') {
          return userValue.includes(conditionValue);
        }
        return false;

      case 'startsWith':
        if (typeof userValue !== 'string') {
          return false;
        }
        return userValue.startsWith(conditionValue);

      case 'endsWith':
        if (typeof userValue !== 'string') {
          return false;
        }
        return userValue.endsWith(conditionValue);

      default:
        return false;
    }
  }
}
