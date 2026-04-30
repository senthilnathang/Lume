/**
 * @fileoverview PermissionEngine - Policy aggregation with "deny wins" principle
 * Evaluates permissions across multiple policies with centralized decision logic.
 */

import { ConditionEvaluator } from './condition-evaluator.js';

export class PermissionEngine {
  constructor() {
    // Store policies in a Map for O(1) lookup
    this.policies = new Map();

    // Cache for evaluation results
    this.cache = new Map();

    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0
    };

    // Condition evaluator for checking rule conditions
    this.conditionEvaluator = new ConditionEvaluator();
  }

  /**
   * Register a permission policy
   * @param {PermissionPolicy} policy - The policy to register
   */
  registerPolicy(policy) {
    if (!policy || !policy.id) {
      throw new Error('Policy must have an id');
    }
    this.policies.set(policy.id, policy);
  }

  /**
   * Get a registered policy by ID
   * @param {string} policyId - The policy ID
   * @returns {PermissionPolicy|undefined}
   */
  getPolicy(policyId) {
    return this.policies.get(policyId);
  }

  /**
   * Evaluate permission for a context, resource, and action
   * Implements "deny wins" principle - if ANY rule denies, access is denied
   * @param {PermissionContext} context - The permission context
   * @param {string} resource - The resource being accessed
   * @param {string} action - The action being performed
   * @returns {Promise<PermissionResult>}
   */
  async evaluate(context, resource, action) {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(context.userId, resource, action);
      if (this.cache.has(cacheKey)) {
        this.stats.hits++;
        return this.cache.get(cacheKey);
      }

      this.stats.misses++;

      // Collect all matching rules from all policies
      const allRules = [];
      for (const policy of this.policies.values()) {
        if (policy.rules && Array.isArray(policy.rules)) {
          for (const rule of policy.rules) {
            if (this.ruleMatches(rule, resource, action)) {
              allRules.push(rule);
            }
          }
        }
      }

      // If no rules match, deny by default
      if (allRules.length === 0) {
        const result = {
          allowed: false,
          reason: 'No matching rules found',
          fieldPermissions: {},
          queryFilters: []
        };
        this.cache.set(cacheKey, result);
        return result;
      }

      // Sort rules by priority (highest first)
      allRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));

      // First pass: check for deny rules
      for (const rule of allRules) {
        if (rule.effect === 'deny') {
          const conditionsPass = await this.evaluateConditions(context, rule.conditions);
          if (conditionsPass) {
            const result = {
              allowed: false,
              reason: `Deny rule matched: ${rule.id}`,
              fieldPermissions: {},
              queryFilters: []
            };
            this.cache.set(cacheKey, result);
            return result;
          }
        }
      }

      // Second pass: check for allow rules
      let allowFound = false;
      let allowRuleId = null;

      for (const rule of allRules) {
        if (rule.effect === 'allow') {
          const conditionsPass = await this.evaluateConditions(context, rule.conditions);
          if (conditionsPass) {
            allowFound = true;
            allowRuleId = rule.id;
            break;
          }
        }
      }

      if (!allowFound) {
        const result = {
          allowed: false,
          reason: 'No allow rules matched',
          fieldPermissions: {},
          queryFilters: []
        };
        this.cache.set(cacheKey, result);
        return result;
      }

      // Build field permissions and query filters from allow rules
      const fieldPermissions = {};
      const queryFilters = [];

      for (const rule of allRules) {
        if (rule.effect === 'allow') {
          const conditionsPass = await this.evaluateConditions(context, rule.conditions);
          if (!conditionsPass) continue;

          // Collect field permissions
          if (rule.fieldPermissions && typeof rule.fieldPermissions === 'object') {
            Object.assign(fieldPermissions, rule.fieldPermissions);
          }

          // Collect query filters
          if (rule.queryFilters && Array.isArray(rule.queryFilters)) {
            queryFilters.push(...rule.queryFilters);
          }
        }
      }

      const result = {
        allowed: true,
        reason: `Allow rule matched: ${allowRuleId}`,
        fieldPermissions,
        queryFilters
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      return {
        allowed: false,
        reason: `Error during evaluation: ${error.message}`,
        fieldPermissions: {},
        queryFilters: []
      };
    }
  }

  /**
   * Evaluate field permission for a specific field
   * @param {PermissionContext} context
   * @param {string} resource
   * @param {string} action
   * @param {string} field - The field to check
   * @returns {Promise<FieldPermission>}
   */
  async evaluateField(context, resource, action, field) {
    try {
      const result = await this.evaluate(context, resource, action);

      if (!result.allowed) {
        return { allowed: false, reason: 'Resource access denied' };
      }

      // Check field permissions from matched rules
      const fieldPerms = result.fieldPermissions[field];

      if (fieldPerms) {
        return {
          allowed: fieldPerms.allowed !== false,
          reason: fieldPerms.reason
        };
      }

      // Default: allow field access if resource access is allowed
      return { allowed: true };
    } catch (error) {
      return {
        allowed: false,
        reason: `Error evaluating field: ${error.message}`
      };
    }
  }

  /**
   * Get query filters for data-level access control
   * @param {PermissionContext} context
   * @param {string} resource
   * @param {string} action
   * @returns {Promise<QueryFilter[]>}
   */
  async getQueryFilters(context, resource, action) {
    try {
      const result = await this.evaluate(context, resource, action);
      return result.queryFilters || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Clear all cached evaluation results
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} { hits, misses, size }
   */
  cacheStats() {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size
    };
  }

  /**
   * Check if a rule matches the given resource and action
   * @private
   * @param {PermissionRule} rule
   * @param {string} resource
   * @param {string} action
   * @returns {boolean}
   */
  ruleMatches(rule, resource, action) {
    return this.resourceMatches(rule.resource, resource) &&
           this.actionMatches(rule.action, action);
  }

  /**
   * Check if resource pattern matches actual resource
   * Supports wildcards: "ticket:*" matches "ticket:read", "*" matches any
   * @private
   */
  resourceMatches(pattern, resource) {
    if (pattern === '*') return true;
    if (pattern === resource) return true;

    // Handle wildcard patterns like "ticket:*"
    if (pattern.endsWith(':*')) {
      const prefix = pattern.slice(0, -2); // Remove ":*"
      return resource.startsWith(prefix + ':');
    }

    return false;
  }

  /**
   * Check if action pattern matches actual action
   * Supports wildcards: "*" matches any action
   * @private
   */
  actionMatches(pattern, action) {
    if (pattern === '*') return true;
    if (pattern === action) return true;
    return false;
  }

  /**
   * Evaluate all conditions in a rule (AND logic)
   * @private
   * @param {PermissionContext} context
   * @param {PermissionCondition[]} conditions
   * @returns {Promise<boolean>}
   */
  async evaluateConditions(context, conditions) {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    for (const condition of conditions) {
      const result = await this.conditionEvaluator.evaluate(context, condition);
      if (!result.allowed) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate a cache key for evaluation results
   * @private
   */
  getCacheKey(userId, resource, action) {
    return `${userId}:${resource}:${action}`;
  }
}

export default PermissionEngine;
