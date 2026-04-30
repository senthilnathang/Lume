/**
 * TriggerEvaluator - Evaluates workflow triggers against data
 * Supports event, time, manual, and conditional triggers with wildcard matching
 * and comprehensive condition evaluation with multiple operators
 */

export class TriggerEvaluator {
  /**
   * Main evaluation method that dispatches to specific trigger evaluators
   * @param {Object} trigger The trigger to evaluate
   * @param {Object} data The data to evaluate against
   * @returns {Object} TriggerResult indicating if trigger was activated
   */
  evaluate(trigger, data) {
    try {
      switch (trigger.type) {
        case 'event':
          return this.evaluateEventTrigger(trigger, data);
        case 'time':
          return this.evaluateTimeTrigger(trigger, data);
        case 'manual':
          return this.evaluateManualTrigger(trigger, data);
        case 'conditional':
          return this.evaluateConditionalTrigger(trigger, data);
        default:
          return {
            triggered: false,
            reason: `Unknown trigger type: ${trigger.type}`
          };
      }
    } catch (error) {
      // Rethrow cron validation errors
      if (error.message && error.message.includes('cron')) {
        throw error;
      }
      return {
        triggered: false,
        reason: `Error evaluating trigger: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Evaluates an event trigger by matching event pattern and conditions
   * @param {Object} trigger The event trigger
   * @param {Object} data The data containing the event name and context
   * @returns {Object} TriggerResult
   */
  evaluateEventTrigger(trigger, data) {
    const eventName = data?.event;

    if (!eventName) {
      return {
        triggered: false,
        reason: 'No event field in trigger data'
      };
    }

    // Check if event pattern matches
    if (!this.eventMatches(trigger.event, eventName)) {
      return {
        triggered: false,
        reason: `Event pattern '${trigger.event}' does not match event '${eventName}'`
      };
    }

    // If conditions exist, evaluate them
    if (trigger.conditions && trigger.conditions.length > 0) {
      const conditionsMet = this.evaluateConditions(trigger.conditions, data);

      if (!conditionsMet) {
        return {
          triggered: false,
          reason: `Event '${eventName}' matched but not all conditions were satisfied`
        };
      }

      return {
        triggered: true,
        reason: `Event '${eventName}' matched and all conditions satisfied`,
        matchedConditions: trigger.conditions.map(c => c.field),
        metadata: {
          event: eventName
        }
      };
    }

    return {
      triggered: true,
      reason: `Event '${eventName}' matched trigger pattern '${trigger.event}'`,
      metadata: {
        event: eventName
      }
    };
  }

  /**
   * Evaluates a time trigger by validating cron expression
   * Note: Actual scheduling is handled by the scheduler, not the evaluator
   * @param {Object} trigger The time trigger
   * @param {Object} data The data (not used for time triggers)
   * @returns {Object} TriggerResult (always false because scheduler handles execution)
   */
  evaluateTimeTrigger(trigger, data) {
    if (!this.isValidCron(trigger.cron)) {
      throw new Error(`Invalid cron expression: '${trigger.cron}'`);
    }

    return {
      triggered: false,
      reason: 'Time triggers are handled by the scheduler, not evaluated directly'
    };
  }

  /**
   * Evaluates a manual trigger - always returns true
   * Manual triggers are initiated by user action through the UI
   * @param {Object} trigger The manual trigger
   * @param {Object} data The data (not used for manual triggers)
   * @returns {Object} TriggerResult (always triggered=true)
   */
  evaluateManualTrigger(trigger, data) {
    return {
      triggered: true,
      reason: 'Manual trigger initiated by user',
      metadata: {
        label: trigger.label || 'Manual Trigger'
      }
    };
  }

  /**
   * Evaluates a conditional trigger by checking if all conditions are met
   * @param {Object} trigger The conditional trigger
   * @param {Object} data The data to evaluate conditions against
   * @returns {Object} TriggerResult
   */
  evaluateConditionalTrigger(trigger, data) {
    const conditionsMet = this.evaluateConditions(trigger.conditions, data);

    if (!conditionsMet) {
      return {
        triggered: false,
        reason: 'Not all conditions were satisfied'
      };
    }

    return {
      triggered: true,
      reason: 'All conditions satisfied',
      matchedConditions: trigger.conditions.map(c => c.field)
    };
  }

  /**
   * Public method to evaluate a set of conditions with AND logic
   * @param {Array} conditions The conditions to evaluate
   * @param {Object} data The data to evaluate against
   * @returns {boolean} true if all conditions pass, false otherwise
   */
  evaluateConditions(conditions, data) {
    // Empty conditions array passes (AND logic - no conditions means all pass)
    if (!conditions || conditions.length === 0) {
      return true;
    }

    // All conditions must pass (AND logic)
    return conditions.every(condition => {
      const dataValue = data?.[condition.field];
      return this.compareValues(dataValue, condition.operator, condition.value);
    });
  }

  /**
   * Compares a data value against a condition value using an operator
   * @param {*} dataValue The value from the data
   * @param {string} operator The comparison operator
   * @param {*} value The comparison value from the condition
   * @returns {boolean} true if condition passes, false otherwise
   */
  compareValues(dataValue, operator, value) {
    switch (operator) {
      case 'eq':
        return dataValue === value;

      case 'neq':
        return dataValue !== value;

      case 'gt':
        return dataValue > value;

      case 'lt':
        return dataValue < value;

      case 'gte':
        return dataValue >= value;

      case 'lte':
        return dataValue <= value;

      case 'in':
        // value should be an array for 'in' operator
        return Array.isArray(value) && value.includes(dataValue);

      case 'contains':
        // Check if dataValue (string) contains value (string)
        return typeof dataValue === 'string' && typeof value === 'string' && dataValue.includes(value);

      default:
        return false;
    }
  }

  /**
   * Public method to match an event pattern against an event name
   * Supports exact matches and wildcards:
   * - Exact: "order:created" == "order:created"
   * - Resource wildcard: "order:*" matches "order:created", "order:updated"
   * - Action wildcard: "*.created" matches "order:created", "user:created"
   * - Full wildcard: "*" matches any event
   * @param {string} pattern The event pattern (may contain wildcards)
   * @param {string} eventName The actual event name
   * @returns {boolean} true if pattern matches event name
   */
  eventMatches(pattern, eventName) {
    // Full wildcard matches everything
    if (pattern === '*') {
      return true;
    }

    // Exact match
    if (pattern === eventName) {
      return true;
    }

    // Wildcard matching with * in the pattern
    // Convert pattern to regex: "order:*" -> "order:.*", "*.created" -> ".*:created"
    const regexPattern = pattern
      .split('.')
      .map(part => part.split(':').map(segment => (segment === '*' ? '.*' : segment)).join(':'))
      .join('.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(eventName);
  }

  /**
   * Validates a cron expression (basic validation - 5 parts separated by spaces)
   * @param {string} cron The cron expression to validate
   * @returns {boolean} true if cron appears valid, false otherwise
   */
  isValidCron(cron) {
    if (!cron || typeof cron !== 'string') {
      return false;
    }

    const parts = cron.trim().split(/\s+/);
    // Cron should have exactly 5 parts: minute hour day month dayOfWeek
    return parts.length === 5;
  }
}
