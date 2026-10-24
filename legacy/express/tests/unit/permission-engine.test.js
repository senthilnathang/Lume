/**
 * @fileoverview Unit tests for PermissionEngine
 * Tests policy aggregation with "deny wins" principle
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PermissionEngine } from '../../src/core/permissions/permission-engine.js';

describe('PermissionEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new PermissionEngine();
  });

  describe('Policy Registration and Retrieval', () => {
    it('should register and retrieve a policy', () => {
      const policy = {
        id: 'policy-1',
        name: 'Admin Policy',
        description: 'Full access for admins',
        rules: [],
        version: 1
      };

      engine.registerPolicy(policy);
      const retrieved = engine.getPolicy('policy-1');

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe('policy-1');
      expect(retrieved.name).toBe('Admin Policy');
    });

    it('should return undefined for non-existent policy', () => {
      const retrieved = engine.getPolicy('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Allow Rule Matching', () => {
    it('should allow when allow rule matches', async () => {
      const policy = {
        id: 'policy-1',
        name: 'Allow Read',
        rules: [
          {
            id: 'rule-1',
            effect: 'allow',
            resource: 'ticket',
            action: 'read',
            conditions: [],
            priority: 10
          }
        ],
        version: 1
      };

      engine.registerPolicy(policy);

      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {}
      };

      const result = await engine.evaluate(context, 'ticket', 'read');

      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('Allow rule');
    });
  });

  describe('Deny Wins Principle', () => {
    it('should deny when both allow and deny rules match (deny wins)', async () => {
      const policy = {
        id: 'policy-1',
        name: 'Mixed Policy',
        rules: [
          {
            id: 'allow-rule',
            effect: 'allow',
            resource: 'ticket',
            action: 'read',
            conditions: [],
            priority: 10
          },
          {
            id: 'deny-rule',
            effect: 'deny',
            resource: 'ticket',
            action: 'read',
            conditions: [],
            priority: 5
          }
        ],
        version: 1
      };

      engine.registerPolicy(policy);

      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {}
      };

      const result = await engine.evaluate(context, 'ticket', 'read');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Deny rule');
    });

    it('should deny when only deny rule matches', async () => {
      const policy = {
        id: 'policy-1',
        name: 'Deny Policy',
        rules: [
          {
            id: 'deny-rule',
            effect: 'deny',
            resource: 'ticket',
            action: 'delete',
            conditions: [],
            priority: 10
          }
        ],
        version: 1
      };

      engine.registerPolicy(policy);

      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {}
      };

      const result = await engine.evaluate(context, 'ticket', 'delete');

      expect(result.allowed).toBe(false);
    });
  });

  describe('Wildcard Resource Matching', () => {
    it('should match "ticket:*" resource pattern against "ticket:read"', async () => {
      const policy = {
        id: 'policy-1',
        name: 'Wildcard Resource',
        rules: [
          {
            id: 'rule-1',
            effect: 'allow',
            resource: 'ticket:*',
            action: 'read',
            conditions: [],
            priority: 10
          }
        ],
        version: 1
      };

      engine.registerPolicy(policy);

      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {}
      };

      const result = await engine.evaluate(context, 'ticket:read', 'read');

      expect(result.allowed).toBe(true);
    });

    it('should match "*" resource pattern against any resource', async () => {
      const policy = {
        id: 'policy-1',
        name: 'Match All',
        rules: [
          {
            id: 'rule-1',
            effect: 'allow',
            resource: '*',
            action: 'read',
            conditions: [],
            priority: 10
          }
        ],
        version: 1
      };

      engine.registerPolicy(policy);

      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {}
      };

      const result = await engine.evaluate(context, 'anything', 'read');

      expect(result.allowed).toBe(true);
    });
  });

  describe('Wildcard Action Matching', () => {
    it('should match "*" action pattern against any action', async () => {
      const policy = {
        id: 'policy-1',
        name: 'All Actions',
        rules: [
          {
            id: 'rule-1',
            effect: 'allow',
            resource: 'ticket',
            action: '*',
            conditions: [],
            priority: 10
          }
        ],
        version: 1
      };

      engine.registerPolicy(policy);

      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {}
      };

      const result = await engine.evaluate(context, 'ticket', 'delete');

      expect(result.allowed).toBe(true);
    });
  });

  describe('Rule Priority Ordering', () => {
    it('should check rules by priority (highest first)', async () => {
      const policy = {
        id: 'policy-1',
        name: 'Priority Policy',
        rules: [
          {
            id: 'low-priority-allow',
            effect: 'allow',
            resource: 'ticket',
            action: 'read',
            conditions: [],
            priority: 5
          },
          {
            id: 'high-priority-deny',
            effect: 'deny',
            resource: 'ticket',
            action: 'read',
            conditions: [],
            priority: 10
          }
        ],
        version: 1
      };

      engine.registerPolicy(policy);

      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {}
      };

      const result = await engine.evaluate(context, 'ticket', 'read');

      // High priority deny should win
      expect(result.allowed).toBe(false);
    });
  });

  describe('Field Permissions', () => {
    it('should evaluate field permissions', async () => {
      const policy = {
        id: 'policy-1',
        name: 'Field Policy',
        rules: [
          {
            id: 'rule-1',
            effect: 'allow',
            resource: 'ticket',
            action: 'read',
            conditions: [],
            priority: 10,
            fieldPermissions: {
              'description': { allowed: true },
              'internalNotes': { allowed: false, reason: 'Internal field' }
            }
          }
        ],
        version: 1
      };

      engine.registerPolicy(policy);

      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {}
      };

      const descField = await engine.evaluateField(context, 'ticket', 'read', 'description');
      const notesField = await engine.evaluateField(context, 'ticket', 'read', 'internalNotes');

      expect(descField.allowed).toBe(true);
      expect(notesField.allowed).toBe(false);
      expect(notesField.reason).toBe('Internal field');
    });
  });

  describe('Query Filters Retrieval', () => {
    it('should retrieve query filters from rules', async () => {
      const policy = {
        id: 'policy-1',
        name: 'Filter Policy',
        rules: [
          {
            id: 'rule-1',
            effect: 'allow',
            resource: 'ticket',
            action: 'read',
            conditions: [],
            priority: 10,
            queryFilters: [
              {
                field: 'status',
                operator: 'eq',
                value: 'open'
              },
              {
                field: 'assignedTo',
                operator: 'eq',
                value: 'user1'
              }
            ]
          }
        ],
        version: 1
      };

      engine.registerPolicy(policy);

      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {}
      };

      const filters = await engine.getQueryFilters(context, 'ticket', 'read');

      expect(filters).toBeDefined();
      expect(filters.length).toBeGreaterThan(0);
      expect(filters.some(f => f.field === 'status')).toBe(true);
    });
  });

  describe('Multiple Policies Aggregation', () => {
    it('should aggregate rules from multiple policies with deny wins', async () => {
      const policy1 = {
        id: 'policy-1',
        name: 'Allow Policy',
        rules: [
          {
            id: 'rule-1',
            effect: 'allow',
            resource: 'ticket',
            action: 'read',
            conditions: [],
            priority: 10
          }
        ],
        version: 1
      };

      const policy2 = {
        id: 'policy-2',
        name: 'Deny Policy',
        rules: [
          {
            id: 'rule-2',
            effect: 'deny',
            resource: 'ticket',
            action: 'read',
            conditions: [],
            priority: 8
          }
        ],
        version: 1
      };

      engine.registerPolicy(policy1);
      engine.registerPolicy(policy2);

      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {}
      };

      const result = await engine.evaluate(context, 'ticket', 'read');

      // Deny from policy2 should win over allow from policy1
      expect(result.allowed).toBe(false);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', async () => {
      const policy = {
        id: 'policy-1',
        name: 'Cache Policy',
        rules: [
          {
            id: 'rule-1',
            effect: 'allow',
            resource: 'ticket',
            action: 'read',
            conditions: [],
            priority: 10
          }
        ],
        version: 1
      };

      engine.registerPolicy(policy);

      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {}
      };

      await engine.evaluate(context, 'ticket', 'read');
      engine.clearCache();

      const stats = engine.cacheStats();
      expect(stats.size).toBe(0);
    });

    it('should return cache statistics', async () => {
      const stats = engine.cacheStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('size');
      expect(typeof stats.hits).toBe('number');
      expect(typeof stats.misses).toBe('number');
      expect(typeof stats.size).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing policies gracefully', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {}
      };

      const result = await engine.evaluate(context, 'nonexistent', 'read');

      expect(result).toBeDefined();
      expect(result.allowed).toBe(false);
    });

    it('should return false when no rule matches', async () => {
      const policy = {
        id: 'policy-1',
        name: 'Empty Policy',
        rules: [
          {
            id: 'rule-1',
            effect: 'allow',
            resource: 'document',
            action: 'write',
            conditions: [],
            priority: 10
          }
        ],
        version: 1
      };

      engine.registerPolicy(policy);

      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {}
      };

      const result = await engine.evaluate(context, 'ticket', 'read');

      expect(result.allowed).toBe(false);
    });
  });
});
