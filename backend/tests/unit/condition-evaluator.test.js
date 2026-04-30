/**
 * @fileoverview Unit tests for ConditionEvaluator (ABAC)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ConditionEvaluator } from '../../src/core/permissions/condition-evaluator.js';

describe('ConditionEvaluator', () => {
  let evaluator;

  beforeEach(() => {
    evaluator = new ConditionEvaluator();
  });

  describe('Role Conditions', () => {
    it('should allow when user role matches allowed roles', async () => {
      const context = {
        userId: 'user1',
        userRole: 'manager',
        userAttributes: {},
        resource: 'ticket',
        action: 'approve',
        resourceData: {}
      };

      const condition = {
        type: 'role',
        roles: ['manager', 'admin']
      };

      const result = await evaluator.evaluate(context, condition);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeDefined();
      expect(result.ttl).toBe(3600);
    });

    it('should deny when user role does not match', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {},
        resource: 'ticket',
        action: 'approve',
        resourceData: {}
      };

      const condition = {
        type: 'role',
        roles: ['manager', 'admin']
      };

      const result = await evaluator.evaluate(context, condition);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe('Ownership Conditions', () => {
    it('should allow when user is the owner', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {},
        resource: 'ticket',
        action: 'edit',
        resourceData: {
          createdById: 'user1'
        }
      };

      const condition = {
        type: 'ownership',
        ownerField: 'createdById'
      };

      const result = await evaluator.evaluate(context, condition);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeDefined();
      expect(result.ttl).toBe(600);
    });

    it('should deny when user is not the owner', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {},
        resource: 'ticket',
        action: 'edit',
        resourceData: {
          createdById: 'user2'
        }
      };

      const condition = {
        type: 'ownership',
        ownerField: 'createdById'
      };

      const result = await evaluator.evaluate(context, condition);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe('Time Conditions', () => {
    it('should allow when current time is within business hours', async () => {
      const now = new Date();
      const currentHour = now.getHours();

      const startHour = Math.max(0, currentHour - 1);
      const endHour = Math.min(23, currentHour + 1);

      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {},
        resource: 'ticket',
        action: 'comment',
        resourceData: {}
      };

      const condition = {
        type: 'time',
        startTime: `${String(startHour).padStart(2, '0')}:00`,
        endTime: `${String(endHour).padStart(2, '0')}:59`,
        daysOfWeek: [1, 2, 3, 4, 5]
      };

      const result = await evaluator.evaluate(context, condition);
      expect(result.allowed).toBeDefined();
      expect(result.reason).toBeDefined();
      expect(result.ttl).toBe(60);
    });

    it('should deny when current time is outside business hours', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {},
        resource: 'ticket',
        action: 'comment',
        resourceData: {}
      };

      const condition = {
        type: 'time',
        startTime: '09:00',
        endTime: '10:00',
        daysOfWeek: [0]
      };

      const result = await evaluator.evaluate(context, condition);
      expect(result.allowed).toBeDefined();
      expect(result.reason).toBeDefined();
      expect(result.ttl).toBe(60);
    });

    it('should respect daysOfWeek restrictions', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {},
        resource: 'ticket',
        action: 'comment',
        resourceData: {}
      };

      const now = new Date();
      const currentDay = now.getDay();
      const otherDay = (currentDay + 1) % 7;

      const condition = {
        type: 'time',
        startTime: '00:00',
        endTime: '23:59',
        daysOfWeek: [otherDay]
      };

      const result = await evaluator.evaluate(context, condition);
      expect(result.allowed).toBeFalsy();
    });
  });

  describe('Attribute Conditions', () => {
    it('should allow equality comparison (eq)', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {
          department: 'engineering'
        },
        resource: 'document',
        action: 'read',
        resourceData: {}
      };

      const condition = {
        type: 'attribute',
        field: 'department',
        operator: 'eq',
        value: 'engineering'
      };

      const result = await evaluator.evaluate(context, condition);
      expect(result.allowed).toBe(true);
      expect(result.ttl).toBe(600);
    });

    it('should allow inequality comparison (neq)', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {
          status: 'active'
        },
        resource: 'document',
        action: 'read',
        resourceData: {}
      };

      const condition = {
        type: 'attribute',
        field: 'status',
        operator: 'neq',
        value: 'inactive'
      };

      const result = await evaluator.evaluate(context, condition);
      expect(result.allowed).toBe(true);
    });

    it('should allow greater than comparison (gt)', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {
          level: 5
        },
        resource: 'document',
        action: 'read',
        resourceData: {}
      };

      const condition = {
        type: 'attribute',
        field: 'level',
        operator: 'gt',
        value: 3
      };

      const result = await evaluator.evaluate(context, condition);
      expect(result.allowed).toBe(true);
    });

    it('should allow less than comparison (lt)', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {
          level: 2
        },
        resource: 'document',
        action: 'read',
        resourceData: {}
      };

      const condition = {
        type: 'attribute',
        field: 'level',
        operator: 'lt',
        value: 5
      };

      const result = await evaluator.evaluate(context, condition);
      expect(result.allowed).toBe(true);
    });

    it('should allow greater than or equal comparison (gte)', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {
          level: 5
        },
        resource: 'document',
        action: 'read',
        resourceData: {}
      };

      const condition = {
        type: 'attribute',
        field: 'level',
        operator: 'gte',
        value: 5
      };

      const result = await evaluator.evaluate(context, condition);
      expect(result.allowed).toBe(true);
    });

    it('should allow less than or equal comparison (lte)', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {
          level: 3
        },
        resource: 'document',
        action: 'read',
        resourceData: {}
      };

      const condition = {
        type: 'attribute',
        field: 'level',
        operator: 'lte',
        value: 5
      };

      const result = await evaluator.evaluate(context, condition);
      expect(result.allowed).toBe(true);
    });

    it('should allow in list comparison (in)', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {
          region: 'us-west'
        },
        resource: 'document',
        action: 'read',
        resourceData: {}
      };

      const condition = {
        type: 'attribute',
        field: 'region',
        operator: 'in',
        value: ['us-east', 'us-west', 'eu']
      };

      const result = await evaluator.evaluate(context, condition);
      expect(result.allowed).toBe(true);
    });

    it('should allow not in list comparison (nin)', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {
          region: 'us-west'
        },
        resource: 'document',
        action: 'read',
        resourceData: {}
      };

      const condition = {
        type: 'attribute',
        field: 'region',
        operator: 'nin',
        value: ['us-east', 'eu']
      };

      const result = await evaluator.evaluate(context, condition);
      expect(result.allowed).toBe(true);
    });

    it('should allow contains comparison (contains)', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {
          skills: ['javascript', 'typescript', 'react']
        },
        resource: 'document',
        action: 'read',
        resourceData: {}
      };

      const condition = {
        type: 'attribute',
        field: 'skills',
        operator: 'contains',
        value: 'javascript'
      };

      const result = await evaluator.evaluate(context, condition);
      expect(result.allowed).toBe(true);
    });

    it('should allow startsWith comparison (startsWith)', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {
          email: 'user@company.com'
        },
        resource: 'document',
        action: 'read',
        resourceData: {}
      };

      const condition = {
        type: 'attribute',
        field: 'email',
        operator: 'startsWith',
        value: 'user@'
      };

      const result = await evaluator.evaluate(context, condition);
      expect(result.allowed).toBe(true);
    });

    it('should allow endsWith comparison (endsWith)', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {
          email: 'user@company.com'
        },
        resource: 'document',
        action: 'read',
        resourceData: {}
      };

      const condition = {
        type: 'attribute',
        field: 'email',
        operator: 'endsWith',
        value: '@company.com'
      };

      const result = await evaluator.evaluate(context, condition);
      expect(result.allowed).toBe(true);
    });

    it('should deny when attribute condition fails', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {
          department: 'sales'
        },
        resource: 'document',
        action: 'read',
        resourceData: {}
      };

      const condition = {
        type: 'attribute',
        field: 'department',
        operator: 'eq',
        value: 'engineering'
      };

      const result = await evaluator.evaluate(context, condition);
      expect(result.allowed).toBe(false);
    });
  });

  describe('Expression Conditions', () => {
    it('should allow when safe expression evaluates to true', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {
          level: 5,
          department: 'engineering'
        },
        resource: 'document',
        action: 'read',
        resourceData: {}
      };

      const condition = {
        type: 'expression',
        expression: "level > 3 && department === 'engineering'"
      };

      const result = await evaluator.evaluate(context, condition);
      expect(result.allowed).toBe(true);
      expect(result.ttl).toBe(300);
    });

    it('should deny when safe expression evaluates to false', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {
          level: 2,
          department: 'sales'
        },
        resource: 'document',
        action: 'read',
        resourceData: {}
      };

      const condition = {
        type: 'expression',
        expression: "level > 5 && department === 'engineering'"
      };

      const result = await evaluator.evaluate(context, condition);
      expect(result.allowed).toBe(false);
    });

    it('should throw error for unsafe expressions', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: { level: 5 },
        resource: 'document',
        action: 'read',
        resourceData: {}
      };

      const condition = {
        type: 'expression',
        expression: "eval('malicious code')"
      };

      await expect(evaluator.evaluate(context, condition)).rejects.toThrow();
    });
  });

  describe('evaluateAll', () => {
    it('should allow when all conditions pass (AND logic)', async () => {
      const context = {
        userId: 'user1',
        userRole: 'manager',
        userAttributes: {
          department: 'engineering'
        },
        resource: 'ticket',
        action: 'approve',
        resourceData: {
          createdById: 'user1'
        }
      };

      const conditions = [
        {
          type: 'role',
          roles: ['manager', 'admin']
        },
        {
          type: 'attribute',
          field: 'department',
          operator: 'eq',
          value: 'engineering'
        },
        {
          type: 'ownership',
          ownerField: 'createdById'
        }
      ];

      const result = await evaluator.evaluateAll(context, conditions);
      expect(result.allowed).toBe(true);
    });

    it('should deny when any condition fails', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {
          department: 'engineering'
        },
        resource: 'ticket',
        action: 'approve',
        resourceData: {
          createdById: 'user1'
        }
      };

      const conditions = [
        {
          type: 'role',
          roles: ['manager', 'admin']
        },
        {
          type: 'attribute',
          field: 'department',
          operator: 'eq',
          value: 'engineering'
        }
      ];

      const result = await evaluator.evaluateAll(context, conditions);
      expect(result.allowed).toBe(false);
    });

    it('should return minimum TTL when all pass', async () => {
      const context = {
        userId: 'user1',
        userRole: 'manager',
        userAttributes: {},
        resource: 'ticket',
        action: 'approve',
        resourceData: {
          createdById: 'user1'
        }
      };

      const conditions = [
        {
          type: 'role',
          roles: ['manager']
        },
        {
          type: 'ownership',
          ownerField: 'createdById'
        },
        {
          type: 'time',
          startTime: '00:00',
          endTime: '23:59',
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
        }
      ];

      const result = await evaluator.evaluateAll(context, conditions);
      expect(result.ttl).toBeLessThanOrEqual(60);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required field in condition', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {},
        resource: 'ticket',
        action: 'read',
        resourceData: {}
      };

      const condition = {
        type: 'attribute',
        field: 'missingField',
        operator: 'eq',
        value: 'test'
      };

      const result = await evaluator.evaluate(context, condition);
      expect(result.allowed).toBe(false);
    });

    it('should handle invalid condition type gracefully', async () => {
      const context = {
        userId: 'user1',
        userRole: 'user',
        userAttributes: {},
        resource: 'ticket',
        action: 'read',
        resourceData: {}
      };

      const condition = {
        type: 'unknown_type',
        some: 'data'
      };

      await expect(evaluator.evaluate(context, condition)).rejects.toThrow();
    });
  });
});
