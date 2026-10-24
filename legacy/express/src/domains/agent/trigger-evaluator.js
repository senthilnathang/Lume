/**
 * @fileoverview TriggerEvaluator - Evaluate agent trigger expressions
 * Uses ABAC expression evaluator to safely evaluate conditions without dynamic code
 */

import ExpressionEvaluator from '../../core/permissions/evaluator.js';
import logger from '../../core/services/logger.js';

class TriggerEvaluator {
  /**
   * Evaluate agent trigger expression
   * @static
   * @param {string} trigger - ABAC trigger expression
   * @param {Object} record - Entity record to evaluate against
   * @param {Object} executionContext - User/auth context
   * @returns {Promise<boolean>} Whether trigger condition is met
   */
  static async evaluate(trigger, record, executionContext) {
    if (!trigger) {
      return true; // No trigger = always execute
    }

    try {
      const evaluator = new ExpressionEvaluator();
      const context = {
        user: executionContext,
        data: record,
        now: new Date(),
      };

      logger.debug(`[TriggerEvaluator] Evaluating trigger: ${trigger}`);

      const result = await evaluator.evaluate(trigger, context);

      logger.debug(`[TriggerEvaluator] Trigger result: ${result}`);

      return result;
    } catch (error) {
      logger.error('[TriggerEvaluator] Error evaluating trigger:', error.message);
      return false;
    }
  }

  /**
   * Evaluate trigger for multiple records (e.g., batch agents)
   * @static
   * @param {string} trigger - ABAC trigger expression
   * @param {Object[]} records - Records to evaluate
   * @param {Object} executionContext - User/auth context
   * @returns {Promise<Object[]>} Records that match trigger
   */
  static async evaluateMany(trigger, records, executionContext) {
    if (!trigger) {
      return records;
    }

    const matching = [];

    for (const record of records) {
      try {
        const isMatch = await this.evaluate(trigger, record, executionContext);
        if (isMatch) {
          matching.push(record);
        }
      } catch (error) {
        logger.warn(`[TriggerEvaluator] Error evaluating record:`, error.message);
      }
    }

    return matching;
  }

  /**
   * Build a human-readable description of trigger expression
   * @static
   * @param {string} trigger - Trigger expression
   * @returns {string} Description
   */
  static describe(trigger) {
    if (!trigger) {
      return 'Always execute';
    }

    // Simple pattern matching for common cases
    if (trigger.includes('status') && trigger.includes('!=') && trigger.includes('closed')) {
      return 'When status is not closed';
    }

    if (trigger.includes('daysOpen') && trigger.includes('>')) {
      const match = trigger.match(/daysOpen\s*>\s*(\d+)/);
      if (match) {
        return `When open for more than ${match[1]} days`;
      }
    }

    if (trigger.includes('priority') && trigger.includes('urgent')) {
      return 'When priority is urgent';
    }

    // Fallback to expression
    return `When: ${trigger}`;
  }

  /**
   * Validate trigger expression syntax
   * @static
   * @param {string} trigger - Trigger expression
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  static validate(trigger) {
    const errors = [];

    if (!trigger) {
      return { valid: true, errors: [] };
    }

    // Check for balanced parentheses
    const openParen = (trigger.match(/\(/g) || []).length;
    const closeParen = (trigger.match(/\)/g) || []).length;
    if (openParen !== closeParen) {
      errors.push('Unbalanced parentheses');
    }

    // Check for valid operators
    const validOps = ['==', '!=', '>', '<', '>=', '<=', 'AND', 'OR', 'and', 'or'];
    const tokens = trigger.split(/\s+/);
    for (const token of tokens) {
      // Check if token is an operator or valid field reference
      if (validOps.includes(token)) {
        continue;
      }
      // Check if it looks like a field (contains . or is a word)
      if (/^[\w.]+$/.test(token)) {
        continue;
      }
      // Check if it's a quoted string or number
      if (/^["'].*["']$/.test(token) || /^\d+$/.test(token)) {
        continue;
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

export default TriggerEvaluator;
