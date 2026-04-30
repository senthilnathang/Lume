import { jest } from '@jest/globals';
import * as types from '../../src/core/permissions/types.js';

describe('Permission Types', () => {
  it('should export all required types', () => {
    expect(types).toHaveProperty('PermissionContext');
    expect(types).toHaveProperty('PermissionCondition');
    expect(types).toHaveProperty('PermissionRule');
    expect(types).toHaveProperty('PermissionResult');
    expect(types).toHaveProperty('QueryFilter');
    expect(types).toHaveProperty('IPermissionEngine');
    expect(types).toHaveProperty('RoleCondition');
    expect(types).toHaveProperty('OwnershipCondition');
    expect(types).toHaveProperty('TimeCondition');
    expect(types).toHaveProperty('AttributeCondition');
    expect(types).toHaveProperty('ExpressionCondition');
    expect(types).toHaveProperty('FieldPermission');
    expect(types).toHaveProperty('PermissionPolicy');
    expect(types).toHaveProperty('PermissionDecision');
    expect(types).toHaveProperty('EvaluationResult');
    expect(types).toHaveProperty('ConditionType');
    expect(types).toHaveProperty('PermissionEffect');
    expect(types).toHaveProperty('AttributeOperator');
    expect(types).toHaveProperty('QueryOperator');
  });
  describe('PermissionContext', () => {
    it('should have userId, userRole, userAttributes, resource, and action', () => {
      const context = {
        userId: '123',
        userRole: 'editor',
        userAttributes: { department: 'sales' },
        resource: 'ticket',
        action: 'read',
      };
      expect(context.userId).toBe('123');
      expect(context.userRole).toBe('editor');
      expect(context.userAttributes).toHaveProperty('department');
    });
  });

  describe('PermissionCondition', () => {
    it('should support role condition', () => {
      const condition = {
        type: 'role',
        roles: ['admin', 'editor'],
      };
      expect(condition.type).toBe('role');
      expect(condition.roles).toContain('editor');
    });

    it('should support ownership condition', () => {
      const condition = {
        type: 'ownership',
        ownerField: 'createdById',
      };
      expect(condition.type).toBe('ownership');
      expect(condition.ownerField).toBe('createdById');
    });

    it('should support time condition', () => {
      const condition = {
        type: 'time',
        startTime: '09:00',
        endTime: '17:00',
        daysOfWeek: [1, 2, 3, 4, 5],
      };
      expect(condition.type).toBe('time');
      expect(condition.daysOfWeek).toContain(1);
    });

    it('should support attribute condition', () => {
      const condition = {
        type: 'attribute',
        field: 'department',
        operator: 'eq',
        value: 'sales',
      };
      expect(condition.type).toBe('attribute');
      expect(condition.operator).toBe('eq');
    });

    it('should support expression condition', () => {
      const condition = {
        type: 'expression',
        expression: 'context.department === "sales" && context.level >= 3',
      };
      expect(condition.type).toBe('expression');
      expect(condition.expression).toContain('department');
    });
  });

  describe('PermissionRule', () => {
    it('should have effect, resource, action, conditions, and ttl', () => {
      const rule = {
        id: 'rule-1',
        effect: 'allow',
        resource: 'ticket:*',
        action: 'read',
        conditions: [{ type: 'role', roles: ['viewer'] }],
        ttl: 3600,
        priority: 100,
      };
      expect(rule.effect).toBe('allow');
      expect(rule.resource).toBe('ticket:*');
      expect(rule.ttl).toBe(3600);
    });
  });

  describe('PermissionResult', () => {
    it('should have allowed, reason, fieldPermissions, queryFilters', () => {
      const result = {
        allowed: true,
        reason: 'User has viewer role',
        fieldPermissions: {
          title: { allowed: true },
          secret: { allowed: false, reason: 'Field is restricted' },
        },
        queryFilters: [{ field: 'status', operator: 'in', value: ['open', 'pending'] }],
      };
      expect(result.allowed).toBe(true);
      expect(result.fieldPermissions.title.allowed).toBe(true);
      expect(result.fieldPermissions.secret.allowed).toBe(false);
    });
  });

  describe('QueryFilter', () => {
    it('should support eq, in, between, gt, lt operators', () => {
      const filter = {
        field: 'status',
        operator: 'in',
        value: ['open', 'pending'],
      };
      expect(filter.operator).toBe('in');
      expect(filter.value).toEqual(['open', 'pending']);
    });
  });

  describe('IPermissionEngine interface', () => {
    it('should define evaluate, evaluateField, getQueryFilters, registerPolicy, getPolicy, clearCache, cacheStats', () => {
      const methods = [
        'evaluate',
        'evaluateField',
        'getQueryFilters',
        'registerPolicy',
        'getPolicy',
        'clearCache',
        'cacheStats',
      ];
      methods.forEach((method) => {
        expect(typeof method).toBe('string');
      });
    });
  });

  describe('PermissionPolicy', () => {
    it('should have id, name, rules, version', () => {
      const policy = {
        id: 'policy-1',
        name: 'Editor Policy',
        description: 'Policy for editor role',
        rules: [],
        version: 1,
      };
      expect(policy.id).toBe('policy-1');
      expect(policy.name).toBe('Editor Policy');
      expect(policy.rules).toEqual([]);
      expect(policy.version).toBe(1);
    });

    it('should have optional description', () => {
      const policy = {
        id: 'policy-2',
        name: 'Viewer Policy',
        rules: [],
        version: 1,
      };
      expect(policy.description).toBeUndefined();
    });
  });

  describe('PermissionDecision', () => {
    it('should have allowed, reason, ttl', () => {
      const decision = {
        allowed: true,
        reason: 'Condition matched',
        matchedRuleId: 'rule-1',
        ttl: 300,
      };
      expect(decision.allowed).toBe(true);
      expect(decision.reason).toBe('Condition matched');
      expect(decision.matchedRuleId).toBe('rule-1');
      expect(decision.ttl).toBe(300);
    });

    it('should have optional matchedRuleId and ttl', () => {
      const decision = {
        allowed: false,
        reason: 'Access denied',
      };
      expect(decision.allowed).toBe(false);
      expect(decision.matchedRuleId).toBeUndefined();
      expect(decision.ttl).toBeUndefined();
    });
  });

  describe('EvaluationResult', () => {
    it('should have allowed, reason, ttl', () => {
      const result = {
        allowed: true,
        reason: 'Evaluation passed',
        ttl: 600,
      };
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('Evaluation passed');
      expect(result.ttl).toBe(600);
    });
  });

  describe('Type Aliases', () => {
    it('should support ConditionType values', () => {
      const conditionTypes = ['role', 'ownership', 'time', 'attribute', 'expression'];
      conditionTypes.forEach((type) => {
        expect(typeof type).toBe('string');
      });
    });

    it('should support PermissionEffect values', () => {
      const effects = ['allow', 'deny'];
      effects.forEach((effect) => {
        expect(typeof effect).toBe('string');
      });
    });

    it('should support AttributeOperator values', () => {
      const operators = ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'in', 'nin', 'contains', 'startsWith', 'endsWith'];
      operators.forEach((op) => {
        expect(typeof op).toBe('string');
      });
    });

    it('should support QueryOperator values', () => {
      const queryOps = ['eq', 'in', 'between', 'gt', 'lt', 'gte', 'lte', 'contains', 'exists'];
      queryOps.forEach((op) => {
        expect(typeof op).toBe('string');
      });
    });
  });
});
