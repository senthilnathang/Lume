/**
 * Unit Tests: AdvancedRoutingService for Wave 4
 * Tests conditional escalation chain selection based on task context
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { AdvancedRoutingService } from '../../src/modules/base_automation/services/advanced-routing.js';

describe('AdvancedRoutingService', () => {
  let service;
  let mockModels;
  let mockRuleEngine;

  beforeEach(() => {
    // Mock models with RoutingRule adapter
    mockModels = {
      RoutingRule: {
        findAll: async (options) => {
          const rules = [
            {
              id: 1,
              chainId: 10,
              name: 'High Priority Rule',
              conditions: {
                operator: 'AND',
                conditions: [
                  { field: 'priority', type: 'equals', value: 'high' }
                ]
              },
              priority: 100,
              enabled: true,
              metadata: {}
            },
            {
              id: 2,
              chainId: 20,
              name: 'Financial Domain Rule',
              conditions: {
                operator: 'AND',
                conditions: [
                  { field: 'domain', type: 'equals', value: 'financial' }
                ]
              },
              priority: 50,
              enabled: true,
              metadata: {}
            },
            {
              id: 3,
              chainId: 30,
              name: 'Multi-condition Rule',
              conditions: {
                operator: 'AND',
                conditions: [
                  { field: 'priority', type: 'equals', value: 'medium' },
                  { field: 'domain', type: 'equals', value: 'compliance' }
                ]
              },
              priority: 75,
              enabled: true,
              metadata: {}
            },
            {
              id: 4,
              chainId: 40,
              name: 'Disabled Rule',
              conditions: {
                operator: 'AND',
                conditions: [
                  { field: 'priority', type: 'equals', value: 'critical' }
                ]
              },
              priority: 110,
              enabled: false,
              metadata: {}
            }
          ];

          // Filter by where conditions if specified in options
          if (options && options.where) {
            let filtered = rules;
            for (const [field, op, value] of options.where) {
              if (field === 'chainId') {
                filtered = filtered.filter(r => r.chainId === value);
              } else if (field === 'enabled') {
                // op is typically '=' for enabled checks
                filtered = filtered.filter(r => r.enabled === value);
              }
            }
            // Sort by priority DESC
            filtered.sort((a, b) => b.priority - a.priority);
            return { rows: filtered };
          }

          // Default: return all enabled rules sorted by priority DESC
          const enabled = rules.filter(r => r.enabled);
          enabled.sort((a, b) => b.priority - a.priority);
          return { rows: enabled };
        },
        create: async (data) => {
          return {
            id: Math.floor(Math.random() * 10000),
            ...data
          };
        }
      }
    };

    // Mock RuleEngine with _evaluateCondition method
    mockRuleEngine = {
      _evaluateCondition: (conditions, context) => {
        if (!conditions) return false;

        if (conditions.operator === 'AND' && Array.isArray(conditions.conditions)) {
          return conditions.conditions.every(c => mockRuleEngine._evaluateCondition(c, context));
        }
        if (conditions.operator === 'OR' && Array.isArray(conditions.conditions)) {
          return conditions.conditions.some(c => mockRuleEngine._evaluateCondition(c, context));
        }

        const { field, type, value } = conditions;
        if (!field || !type) return false;

        const contextValue = context[field];

        switch (type) {
          case 'equals':
            return contextValue == value;
          case 'not_equals':
            return contextValue != value;
          case 'greater_than':
            return Number(contextValue) > Number(value);
          case 'less_than':
            return Number(contextValue) < Number(value);
          case 'contains':
            return String(contextValue || '').toLowerCase().includes(String(value).toLowerCase());
          case 'in':
            return Array.isArray(value) ? value.includes(contextValue) : false;
          case 'is_empty':
            return contextValue === null || contextValue === undefined || contextValue === '';
          case 'is_not_empty':
            return contextValue !== null && contextValue !== undefined && contextValue !== '';
          default:
            return false;
        }
      }
    };

    service = new AdvancedRoutingService(mockModels, mockRuleEngine);
  });

  describe('selectChain(context, defaultChainId)', () => {
    it('should return the chain ID of the highest priority matching rule', async () => {
      const context = { priority: 'high', domain: 'general' };
      const result = await service.selectChain(context, 999);

      // Rule 1 (High Priority Rule) with priority 100 should match
      expect(result).toBe(10);
    });

    it('should evaluate rules in priority order and return first match', async () => {
      const context = { priority: 'medium', domain: 'compliance' };
      const result = await service.selectChain(context, 999);

      // Rule 3 (Multi-condition Rule) with priority 75 should match before Rule 2 (priority 50)
      expect(result).toBe(30);
    });

    it('should skip disabled rules during evaluation', async () => {
      const context = { priority: 'critical', domain: 'general' };
      const result = await service.selectChain(context, 999);

      // Rule 4 is disabled, so should fall back to default
      expect(result).toBe(999);
    });

    it('should return default chain ID if no rules match', async () => {
      const context = { priority: 'low', domain: 'unknown' };
      const result = await service.selectChain(context, 555);

      expect(result).toBe(555);
    });

    it('should return default chain ID if context is empty', async () => {
      const context = {};
      const result = await service.selectChain(context, 777);

      expect(result).toBe(777);
    });

    it('should handle multiple matching rules and return highest priority', async () => {
      const context = { priority: 'medium', domain: 'compliance' };
      const result = await service.selectChain(context, 999);

      // Both Rule 2 and Rule 3 could match context, but Rule 3 has higher priority (75 vs 50)
      expect(result).toBe(30);
    });
  });

  describe('getRulesForChain(chainId)', () => {
    it('should return all rules for a chain sorted by priority DESC', async () => {
      // First create some rules for testing
      // Note: In real scenario, we'd have multiple rules per chainId
      // For now, our mock has one rule per chainId

      const rules = await service.getRulesForChain(10);

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0].chainId).toBe(10);
    });

    it('should return rules sorted by priority in descending order', async () => {
      const rules = await service.getRulesForChain(10);

      // Verify rules are sorted by priority DESC
      for (let i = 0; i < rules.length - 1; i++) {
        expect(rules[i].priority).toBeGreaterThanOrEqual(rules[i + 1].priority);
      }
    });

    it('should return empty array if no rules exist for chain', async () => {
      const rules = await service.getRulesForChain(9999);

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBe(0);
    });
  });

  describe('createRule(chainId, name, conditions, priority)', () => {
    it('should create a new routing rule', async () => {
      const conditions = {
        operator: 'AND',
        conditions: [
          { field: 'priority', type: 'equals', value: 'urgent' }
        ]
      };

      const rule = await service.createRule(50, 'Urgent Rule', conditions, 200);

      expect(rule).toBeDefined();
      expect(rule.chainId).toBe(50);
      expect(rule.name).toBe('Urgent Rule');
      expect(rule.priority).toBe(200);
      expect(rule.enabled).toBe(true);
      expect(rule.conditions).toEqual(conditions);
    });

    it('should set enabled to true by default', async () => {
      const conditions = {
        operator: 'AND',
        conditions: [
          { field: 'domain', type: 'equals', value: 'hr' }
        ]
      };

      const rule = await service.createRule(60, 'HR Rule', conditions, 80);

      expect(rule.enabled).toBe(true);
    });

    it('should set metadata to empty object by default', async () => {
      const conditions = {
        operator: 'AND',
        conditions: [
          { field: 'status', type: 'equals', value: 'active' }
        ]
      };

      const rule = await service.createRule(70, 'Status Rule', conditions, 90);

      expect(rule.metadata).toBeDefined();
      expect(typeof rule.metadata).toBe('object');
    });

    it('should allow complex condition structures', async () => {
      const conditions = {
        operator: 'AND',
        conditions: [
          { field: 'priority', type: 'in', value: ['high', 'critical'] },
          {
            operator: 'OR',
            conditions: [
              { field: 'domain', type: 'equals', value: 'financial' },
              { field: 'domain', type: 'equals', value: 'compliance' }
            ]
          }
        ]
      };

      const rule = await service.createRule(80, 'Complex Rule', conditions, 150);

      expect(rule.conditions).toEqual(conditions);
    });
  });

  describe('Edge cases and integration scenarios', () => {
    it('should handle context with missing fields gracefully', async () => {
      const context = { priority: 'high' }; // Missing 'domain'
      const result = await service.selectChain(context, 999);

      // Should still match Rule 1 which only checks priority
      expect(result).toBe(10);
    });

    it('should respect enabled flag when selecting chains', async () => {
      // All tests above already verify this, but being explicit
      const context = { priority: 'critical' };
      const result = await service.selectChain(context, 888);

      // Rule 4 (critical) is disabled, so fall back to default
      expect(result).toBe(888);
    });

    it('should handle numeric priority comparisons', async () => {
      const mockModelsWithNumeric = {
        RoutingRule: {
          findAll: async () => {
            return {
              rows: [
                {
                  id: 5,
                  chainId: 100,
                  name: 'Amount > 10000',
                  conditions: {
                    operator: 'AND',
                    conditions: [
                      { field: 'amount', type: 'greater_than', value: 10000 }
                    ]
                  },
                  priority: 100,
                  enabled: true,
                  metadata: {}
                }
              ]
            };
          },
          create: async (data) => ({ id: 999, ...data })
        }
      };

      const serviceWithNumeric = new AdvancedRoutingService(mockModelsWithNumeric, mockRuleEngine);
      const result = await serviceWithNumeric.selectChain({ amount: 15000 }, 999);

      expect(result).toBe(100);
    });
  });
});
