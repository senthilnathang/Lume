/**
 * RuleEngineService — Evaluates business rules against records.
 * Supports condition types: equals, not_equals, contains, greater_than, less_than,
 * in, not_in, is_empty, is_not_empty.
 * Supports action types: update_field, send_notification, trigger_webhook, assign_to.
 */

export class RuleEngineService {
  /**
   * @param {Object} businessRuleAdapter - DrizzleAdapter for business_rules table
   */
  constructor(businessRuleAdapter) {
    this.rules = businessRuleAdapter;
  }

  /**
   * Evaluate all active rules for a given model/event against a record.
   * @param {string} model - Model name e.g. 'activities'
   * @param {string} event - 'create' or 'update'
   * @param {Object} record - The record data
   * @param {Object} [context] - Additional context (userId, oldValues, etc.)
   * @returns {Array<{ruleId: number, actions: Array}>} Evaluated results
   */
  async evaluate(model, event, record, context = {}) {
    const result = await this.rules.findAll({
      where: [['model', '=', model], ['status', '=', 'active']],
      order: [['priority', 'ASC']],
      limit: 1000,
      offset: 0,
    });

    const matched = [];

    for (const rule of result.rows) {
      const condition = typeof rule.condition === 'string'
        ? JSON.parse(rule.condition)
        : (rule.condition || {});

      if (this._evaluateCondition(condition, record, context)) {
        const action = typeof rule.action === 'string'
          ? JSON.parse(rule.action)
          : (rule.action || {});

        matched.push({ ruleId: rule.id, ruleName: rule.name, action });
      }
    }

    return matched;
  }

  /**
   * Execute matched rule actions on a record.
   * Returns field updates that should be applied (caller handles the actual update).
   */
  executeActions(matchedRules) {
    const fieldUpdates = {};
    const sideEffects = [];

    for (const { ruleId, ruleName, action } of matchedRules) {
      if (!action || !action.type) continue;

      switch (action.type) {
        case 'update_field':
          if (action.field && action.value !== undefined) {
            fieldUpdates[action.field] = action.value;
          }
          break;

        case 'send_notification':
          sideEffects.push({
            type: 'notification',
            ruleId,
            data: {
              title: action.title || `Rule triggered: ${ruleName}`,
              message: action.message || `Business rule "${ruleName}" was triggered`,
              userId: action.userId,
              type: action.notificationType || 'info',
            },
          });
          break;

        case 'trigger_webhook':
          sideEffects.push({
            type: 'webhook',
            ruleId,
            data: { event: action.event || 'rule.triggered', model: action.model },
          });
          break;

        case 'assign_to':
          if (action.field && action.assigneeId) {
            fieldUpdates[action.field] = action.assigneeId;
          }
          break;

        default:
          break;
      }
    }

    return { fieldUpdates, sideEffects };
  }

  /**
   * Evaluate a condition object against a record.
   * Supports single conditions and AND/OR groups.
   */
  _evaluateCondition(condition, record, context) {
    if (!condition) return false;

    // Handle AND/OR groups
    if (condition.operator === 'AND' && Array.isArray(condition.conditions)) {
      return condition.conditions.every(c => this._evaluateCondition(c, record, context));
    }
    if (condition.operator === 'OR' && Array.isArray(condition.conditions)) {
      return condition.conditions.some(c => this._evaluateCondition(c, record, context));
    }

    // Single condition: { field, type, value }
    const { field, type, value } = condition;
    if (!field || !type) return false;

    const recordValue = record[field];

    switch (type) {
      case 'equals':
        return recordValue == value;  // loose equality for string/number comparison
      case 'not_equals':
        return recordValue != value;
      case 'greater_than':
        return Number(recordValue) > Number(value);
      case 'less_than':
        return Number(recordValue) < Number(value);
      case 'greater_than_or_equal':
        return Number(recordValue) >= Number(value);
      case 'less_than_or_equal':
        return Number(recordValue) <= Number(value);
      case 'contains':
        return String(recordValue || '').toLowerCase().includes(String(value).toLowerCase());
      case 'not_contains':
        return !String(recordValue || '').toLowerCase().includes(String(value).toLowerCase());
      case 'starts_with':
        return String(recordValue || '').toLowerCase().startsWith(String(value).toLowerCase());
      case 'ends_with':
        return String(recordValue || '').toLowerCase().endsWith(String(value).toLowerCase());
      case 'in':
        return Array.isArray(value) ? value.includes(recordValue) : false;
      case 'not_in':
        return Array.isArray(value) ? !value.includes(recordValue) : true;
      case 'is_empty':
        return recordValue === null || recordValue === undefined || recordValue === '';
      case 'is_not_empty':
        return recordValue !== null && recordValue !== undefined && recordValue !== '';
      case 'matches':
        try { return new RegExp(value).test(String(recordValue || '')); } catch { return false; }
      default:
        return false;
    }
  }
}

export default RuleEngineService;
