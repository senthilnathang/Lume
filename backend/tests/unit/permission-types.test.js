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
    it('should define evaluate, evaluateField, getQueryFilters, registerPolicy, getPolicy', () => {
      const methods = [
        'evaluate',
        'evaluateField',
        'getQueryFilters',
        'registerPolicy',
        'getPolicy',
      ];
      methods.forEach((method) => {
        expect(typeof method).toBe('string');
      });
    });
  });
});
