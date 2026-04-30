/**
 * @fileoverview QueryFilter - Compile ABAC conditions to SQL WHERE clauses
 * Converts permission policy conditions into ORM-specific filter expressions
 */

import ExpressionEvaluator from './evaluator.js';
import logger from '../core/services/logger.js';

class QueryFilter {
  /**
   * Build Drizzle filter conditions from ABAC rule
   * @param {string} rule - ABAC rule expression
   * @param {ExecutionContext} userContext - User execution context
   * @returns {Object[]} Array of filter conditions for Drizzle
   */
  static buildDrizzleFilters(rule, userContext) {
    if (!rule) {
      return [];
    }

    try {
      const filters = [];
      const conditions = this.parseConditions(rule, userContext);

      for (const condition of conditions) {
        filters.push(condition);
      }

      logger.debug(`[QueryFilter] Built ${filters.length} Drizzle filters from rule`);
      return filters;
    } catch (error) {
      logger.error('[QueryFilter] Error building Drizzle filters:', error.message);
      return [];
    }
  }

  /**
   * Parse ABAC rule into individual filter conditions
   * @private
   * @param {string} rule - ABAC rule
   * @param {ExecutionContext} userContext - User context
   * @returns {Object[]} Filter conditions
   */
  static parseConditions(rule, userContext) {
    const conditions = [];

    // Extract field == value patterns
    const parts = rule.split(/\s+(AND|OR|and|or)\s+/);

    for (const part of parts) {
      if (part.match(/^(AND|OR|and|or)$/)) {
        continue;
      }

      const condition = this.parseCondition(part.trim(), userContext);
      if (condition) {
        conditions.push(condition);
      }
    }

    return conditions;
  }

  /**
   * Parse a single condition expression
   * @private
   * @param {string} expr - Condition expression (e.g., "assignedTo == user.id")
   * @param {ExecutionContext} userContext - User context
   * @returns {Object|null}
   */
  static parseCondition(expr, userContext) {
    if (!expr) {
      return null;
    }

    // Try == operator
    if (expr.includes('==')) {
      const [field, valueStr] = expr.split('==').map(s => s.trim());

      const value = this.parseValue(valueStr, userContext);
      if (value !== null) {
        return { field, operator: 'eq', value };
      }
    }

    // Try != operator
    if (expr.includes('!=')) {
      const [field, valueStr] = expr.split('!=').map(s => s.trim());

      const value = this.parseValue(valueStr, userContext);
      if (value !== null) {
        return { field, operator: 'ne', value };
      }
    }

    // Try > operator
    if (expr.includes('>=')) {
      const [field, valueStr] = expr.split('>=').map(s => s.trim());
      const value = parseInt(valueStr, 10);
      if (!isNaN(value)) {
        return { field, operator: 'gte', value };
      }
    }

    if (expr.includes('>')) {
      const [field, valueStr] = expr.split('>').map(s => s.trim());
      const value = parseInt(valueStr, 10);
      if (!isNaN(value)) {
        return { field, operator: 'gt', value };
      }
    }

    // Try < operator
    if (expr.includes('<=')) {
      const [field, valueStr] = expr.split('<=').map(s => s.trim());
      const value = parseInt(valueStr, 10);
      if (!isNaN(value)) {
        return { field, operator: 'lte', value };
      }
    }

    if (expr.includes('<')) {
      const [field, valueStr] = expr.split('<').map(s => s.trim());
      const value = parseInt(valueStr, 10);
      if (!isNaN(value)) {
        return { field, operator: 'lt', value };
      }
    }

    return null;
  }

  /**
   * Parse a value from expression
   * @private
   * @param {string} valueStr - Value string
   * @param {ExecutionContext} userContext - User context
   * @returns {*}
   */
  static parseValue(valueStr, userContext) {
    // String literal
    if ((valueStr.startsWith("'") && valueStr.endsWith("'")) ||
        (valueStr.startsWith('"') && valueStr.endsWith('"'))) {
      return valueStr.slice(1, -1);
    }

    // User context field
    if (valueStr.startsWith('user.')) {
      const field = valueStr.substring(5);
      return this.resolveUserField(field, userContext);
    }

    // Number
    const num = parseInt(valueStr, 10);
    if (!isNaN(num)) {
      return num;
    }

    // Boolean
    if (valueStr === 'true') return true;
    if (valueStr === 'false') return false;

    return null;
  }

  /**
   * Resolve user context field
   * @private
   * @param {string} field - Field name
   * @param {ExecutionContext} userContext - User context
   * @returns {*}
   */
  static resolveUserField(field, userContext) {
    if (!userContext) {
      return null;
    }

    if (field === 'id') {
      return userContext.userId;
    } else if (field === 'orgId') {
      return userContext.orgId;
    }

    return userContext[field] || null;
  }

  /**
   * Evaluate ABAC rule against a record
   * @param {string} rule - ABAC rule
   * @param {Object} record - Record to check
   * @param {ExecutionContext} userContext - User context
   * @returns {Promise<boolean>}
   */
  static async evaluateRule(rule, record, userContext) {
    if (!rule) {
      return true;
    }

    try {
      const evaluator = new ExpressionEvaluator();
      const context = {
        user: userContext,
        data: record,
        now: new Date(),
      };

      return await evaluator.evaluate(rule, context);
    } catch (error) {
      logger.error('[QueryFilter] Error evaluating rule:', error.message);
      return false;
    }
  }

  /**
   * Filter records based on ownership rule
   * @param {string} rule - Rule expression
   * @param {Object[]} records - Records to filter
   * @param {ExecutionContext} userContext - User context
   * @returns {Promise<string[]>} Allowed record IDs
   */
  static async filterRecordsByOwnership(rule, records, userContext) {
    if (!rule || !records || !Array.isArray(records)) {
      return records?.map(r => r.id || r.ID) || [];
    }

    const allowed = [];

    for (const record of records) {
      const isAllowed = await this.evaluateRule(rule, record, userContext);
      if (isAllowed) {
        allowed.push(record.id || record.ID);
      }
    }

    return allowed;
  }

  /**
   * Get SQL WHERE fragment for logging
   * @param {string} rule - ABAC rule
   * @returns {string} WHERE clause
   */
  static toSQL(rule) {
    if (!rule) {
      return '1=1';
    }

    let sql = rule;
    sql = sql.replace(/user\.id/g, 'assigned_to');
    sql = sql.replace(/user\.orgId/g, 'org_id');
    sql = sql.replace(/AND/g, 'AND');
    sql = sql.replace(/OR/g, 'OR');

    return `(${sql})`;
  }
}

export default QueryFilter;
