/**
 * Advanced Routing Service
 * Implements conditional escalation chain selection based on task context.
 * When approvals are requested, routing rules determine which escalation chain to use.
 */

export class AdvancedRoutingService {
  /**
   * @param {Object} models - Models object containing RoutingRule adapter
   * @param {Object} ruleEngine - RuleEngineService instance with _evaluateCondition method
   */
  constructor(models, ruleEngine) {
    this.models = models;
    this.ruleEngine = ruleEngine;
  }

  /**
   * Select an escalation chain based on context and routing rules.
   * Evaluates all enabled rules in priority order (highest first).
   * Returns the chainId of the first matching rule, or the default if none match.
   *
   * @param {Object} context - Task context (priority, domain, custom conditions, etc.)
   * @param {number} defaultChainId - Chain ID to use if no rules match
   * @returns {Promise<number>} The selected chain ID
   */
  async selectChain(context, defaultChainId) {
    // Fetch all enabled routing rules
    const result = await this.models.RoutingRule.findAll({
      where: [['enabled', '=', true]]
    });

    const rules = (result && result.rows) ? result.rows : [];

    // Sort by priority DESC (highest first)
    rules.sort((a, b) => b.priority - a.priority);

    // Evaluate rules in order, return first match
    for (const rule of rules) {
      let conditions;
      try {
        conditions = typeof rule.conditions === 'string'
          ? JSON.parse(rule.conditions)
          : rule.conditions;
      } catch (e) {
        console.error(`Invalid JSON in routing rule ${rule.id}:`, e.message);
        continue; // Skip invalid rule
      }

      if (this.ruleEngine._evaluateCondition(conditions, context, context)) {
        return rule.chainId;
      }
    }

    // No rules matched, return default
    return defaultChainId;
  }

  /**
   * Get all routing rules for a specific escalation chain.
   * Returns rules sorted by priority in descending order.
   *
   * @param {number} chainId - The escalation chain ID
   * @returns {Promise<Array>} Array of routing rules for this chain, sorted by priority DESC
   */
  async getRulesForChain(chainId) {
    const result = await this.models.RoutingRule.findAll({
      where: [['chainId', '=', chainId]]
    });

    const rules = (result && result.rows) ? result.rows : [];

    // Sort by priority DESC
    rules.sort((a, b) => b.priority - a.priority);

    return rules;
  }

  /**
   * Create a new routing rule.
   *
   * @param {number} chainId - The escalation chain ID this rule routes to
   * @param {string} name - Name of the rule
   * @param {Object} conditions - Condition object: { operator: 'AND'|'OR', conditions: [...] }
   * @param {number} priority - Priority for rule evaluation (higher = evaluated first)
   * @param {Object} [metadata] - Optional metadata
   * @returns {Promise<Object>} The created routing rule
   */
  async createRule(chainId, name, conditions, priority, metadata = {}) {
    let parsedConditions;
    try {
      parsedConditions = typeof conditions === 'string'
        ? JSON.parse(conditions)
        : conditions;
    } catch (e) {
      throw new Error(`Invalid conditions JSON: ${e.message}`);
    }

    const rule = await this.models.RoutingRule.create({
      chainId,
      name,
      conditions: parsedConditions,
      priority,
      enabled: true,
      metadata
    });

    return rule;
  }
}

export default AdvancedRoutingService;
