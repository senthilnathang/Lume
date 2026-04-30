/**
 * @fileoverview Unit tests for TriggerEvaluator
 * Tests event, time, manual, and conditional trigger evaluation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { TriggerEvaluator } from '../../src/core/workflows/trigger-evaluator.js';

describe('TriggerEvaluator', () => {
  let evaluator;

  beforeEach(() => {
    evaluator = new TriggerEvaluator();
  });

  // ============================================================================
  // EVENT TRIGGER TESTS
  // ============================================================================

  describe('Event Triggers', () => {
    it('should match exact event name', () => {
      const trigger = {
        type: 'event',
        event: 'order:created'
      };

      const data = {
        event: 'order:created',
        orderId: '123'
      };

      const result = evaluator.evaluate(trigger, data);
      expect(result.triggered).toBe(true);
      expect(result.reason).toBeDefined();
    });

    it('should match resource wildcard event pattern (order:*)', () => {
      const trigger = {
        type: 'event',
        event: 'order:*'
      };

      const data = {
        event: 'order:created',
        orderId: '123'
      };

      const result = evaluator.evaluate(trigger, data);
      expect(result.triggered).toBe(true);
    });

    it('should match action wildcard event pattern (*.created)', () => {
      const trigger = {
        type: 'event',
        event: '*.created'
      };

      const data = {
        event: 'user:created',
        userId: '456'
      };

      const result = evaluator.evaluate(trigger, data);
      expect(result.triggered).toBe(true);
    });

    it('should match full wildcard event pattern (*)', () => {
      const trigger = {
        type: 'event',
        event: '*'
      };

      const data = {
        event: 'any:event:name',
        data: 'something'
      };

      const result = evaluator.evaluate(trigger, data);
      expect(result.triggered).toBe(true);
    });

    it('should not match different event', () => {
      const trigger = {
        type: 'event',
        event: 'order:created'
      };

      const data = {
        event: 'order:updated',
        orderId: '123'
      };

      const result = evaluator.evaluate(trigger, data);
      expect(result.triggered).toBe(false);
    });

    it('should evaluate event conditions and trigger if all pass', () => {
      const trigger = {
        type: 'event',
        event: 'order:created',
        conditions: [
          { field: 'amount', operator: 'gt', value: 100 },
          { field: 'status', operator: 'eq', value: 'pending' }
        ]
      };

      const data = {
        event: 'order:created',
        amount: 150,
        status: 'pending'
      };

      const result = evaluator.evaluate(trigger, data);
      expect(result.triggered).toBe(true);
      expect(result.matchedConditions).toBeDefined();
    });

    it('should not trigger event if any condition fails', () => {
      const trigger = {
        type: 'event',
        event: 'order:created',
        conditions: [
          { field: 'amount', operator: 'gt', value: 100 },
          { field: 'status', operator: 'eq', value: 'pending' }
        ]
      };

      const data = {
        event: 'order:created',
        amount: 50,
        status: 'pending'
      };

      const result = evaluator.evaluate(trigger, data);
      expect(result.triggered).toBe(false);
    });
  });

  // ============================================================================
  // TIME TRIGGER TESTS
  // ============================================================================

  describe('Time Triggers', () => {
    it('should validate cron expression with 5 parts', () => {
      const trigger = {
        type: 'time',
        cron: '0 9 * * 1-5'
      };

      const data = {};

      const result = evaluator.evaluate(trigger, data);
      expect(result.triggered).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should throw error for invalid cron expression', () => {
      const trigger = {
        type: 'time',
        cron: 'invalid cron'
      };

      const data = {};

      expect(() => {
        evaluator.evaluate(trigger, data);
      }).toThrow();
    });

    it('should throw error for cron expression with wrong number of parts', () => {
      const trigger = {
        type: 'time',
        cron: '0 9 *'
      };

      const data = {};

      expect(() => {
        evaluator.evaluate(trigger, data);
      }).toThrow();
    });
  });

  // ============================================================================
  // MANUAL TRIGGER TESTS
  // ============================================================================

  describe('Manual Triggers', () => {
    it('should always trigger manual trigger', () => {
      const trigger = {
        type: 'manual',
        label: 'Process Now'
      };

      const data = {};

      const result = evaluator.evaluate(trigger, data);
      expect(result.triggered).toBe(true);
      expect(result.reason).toBeDefined();
    });

    it('should trigger manual trigger regardless of data', () => {
      const trigger = {
        type: 'manual'
      };

      const data = {
        random: 'data',
        nested: { value: 123 }
      };

      const result = evaluator.evaluate(trigger, data);
      expect(result.triggered).toBe(true);
    });
  });

  // ============================================================================
  // CONDITIONAL TRIGGER TESTS
  // ============================================================================

  describe('Conditional Triggers', () => {
    it('should trigger when all conditions are met', () => {
      const trigger = {
        type: 'conditional',
        conditions: [
          { field: 'inventory', operator: 'lt', value: 10 },
          { field: 'reorderStatus', operator: 'eq', value: 'enabled' }
        ]
      };

      const data = {
        inventory: 5,
        reorderStatus: 'enabled'
      };

      const result = evaluator.evaluate(trigger, data);
      expect(result.triggered).toBe(true);
      expect(result.matchedConditions).toBeDefined();
    });

    it('should not trigger if any condition fails', () => {
      const trigger = {
        type: 'conditional',
        conditions: [
          { field: 'inventory', operator: 'lt', value: 10 },
          { field: 'reorderStatus', operator: 'eq', value: 'enabled' }
        ]
      };

      const data = {
        inventory: 5,
        reorderStatus: 'disabled'
      };

      const result = evaluator.evaluate(trigger, data);
      expect(result.triggered).toBe(false);
    });
  });

  // ============================================================================
  // eventMatches TESTS
  // ============================================================================

  describe('eventMatches method', () => {
    it('should match exact event names', () => {
      expect(evaluator.eventMatches('order:created', 'order:created')).toBe(true);
      expect(evaluator.eventMatches('user:deleted', 'user:deleted')).toBe(true);
    });

    it('should not match different event names', () => {
      expect(evaluator.eventMatches('order:created', 'order:updated')).toBe(false);
      expect(evaluator.eventMatches('order:created', 'user:created')).toBe(false);
    });

    it('should match resource wildcard pattern (order:*)', () => {
      expect(evaluator.eventMatches('order:*', 'order:created')).toBe(true);
      expect(evaluator.eventMatches('order:*', 'order:updated')).toBe(true);
      expect(evaluator.eventMatches('order:*', 'order:deleted')).toBe(true);
      expect(evaluator.eventMatches('order:*', 'user:created')).toBe(false);
    });

    it('should match action wildcard pattern (*.created)', () => {
      expect(evaluator.eventMatches('*.created', 'order:created')).toBe(true);
      expect(evaluator.eventMatches('*.created', 'user:created')).toBe(true);
      expect(evaluator.eventMatches('*.created', 'order:updated')).toBe(false);
    });

    it('should match full wildcard pattern (*)', () => {
      expect(evaluator.eventMatches('*', 'order:created')).toBe(true);
      expect(evaluator.eventMatches('*', 'user:deleted')).toBe(true);
      expect(evaluator.eventMatches('*', 'any:event:here')).toBe(true);
    });
  });

  // ============================================================================
  // evaluateConditions TESTS
  // ============================================================================

  describe('evaluateConditions method', () => {
    it('should return true when all conditions pass (AND logic)', () => {
      const conditions = [
        { field: 'amount', operator: 'gt', value: 100 },
        { field: 'status', operator: 'eq', value: 'active' }
      ];

      const data = {
        amount: 150,
        status: 'active'
      };

      const result = evaluator.evaluateConditions(conditions, data);
      expect(result).toBe(true);
    });

    it('should return false when any condition fails (AND logic)', () => {
      const conditions = [
        { field: 'amount', operator: 'gt', value: 100 },
        { field: 'status', operator: 'eq', value: 'active' }
      ];

      const data = {
        amount: 50,
        status: 'active'
      };

      const result = evaluator.evaluateConditions(conditions, data);
      expect(result).toBe(false);
    });

    it('should handle empty conditions array', () => {
      const conditions = [];
      const data = { any: 'data' };

      const result = evaluator.evaluateConditions(conditions, data);
      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // CONDITION OPERATORS TESTS
  // ============================================================================

  describe('Condition Operators', () => {
    describe('eq operator', () => {
      it('should match equal values', () => {
        const trigger = {
          type: 'conditional',
          conditions: [{ field: 'status', operator: 'eq', value: 'active' }]
        };

        const result = evaluator.evaluate(trigger, { status: 'active' });
        expect(result.triggered).toBe(true);
      });

      it('should not match unequal values', () => {
        const trigger = {
          type: 'conditional',
          conditions: [{ field: 'status', operator: 'eq', value: 'active' }]
        };

        const result = evaluator.evaluate(trigger, { status: 'inactive' });
        expect(result.triggered).toBe(false);
      });
    });

    describe('neq operator', () => {
      it('should match unequal values', () => {
        const trigger = {
          type: 'conditional',
          conditions: [{ field: 'status', operator: 'neq', value: 'inactive' }]
        };

        const result = evaluator.evaluate(trigger, { status: 'active' });
        expect(result.triggered).toBe(true);
      });

      it('should not match equal values', () => {
        const trigger = {
          type: 'conditional',
          conditions: [{ field: 'status', operator: 'neq', value: 'active' }]
        };

        const result = evaluator.evaluate(trigger, { status: 'active' });
        expect(result.triggered).toBe(false);
      });
    });

    describe('gt operator', () => {
      it('should match greater than', () => {
        const trigger = {
          type: 'conditional',
          conditions: [{ field: 'amount', operator: 'gt', value: 100 }]
        };

        const result = evaluator.evaluate(trigger, { amount: 150 });
        expect(result.triggered).toBe(true);
      });

      it('should not match less than or equal', () => {
        const trigger = {
          type: 'conditional',
          conditions: [{ field: 'amount', operator: 'gt', value: 100 }]
        };

        const result = evaluator.evaluate(trigger, { amount: 50 });
        expect(result.triggered).toBe(false);
      });
    });

    describe('lt operator', () => {
      it('should match less than', () => {
        const trigger = {
          type: 'conditional',
          conditions: [{ field: 'amount', operator: 'lt', value: 100 }]
        };

        const result = evaluator.evaluate(trigger, { amount: 50 });
        expect(result.triggered).toBe(true);
      });

      it('should not match greater than or equal', () => {
        const trigger = {
          type: 'conditional',
          conditions: [{ field: 'amount', operator: 'lt', value: 100 }]
        };

        const result = evaluator.evaluate(trigger, { amount: 150 });
        expect(result.triggered).toBe(false);
      });
    });

    describe('gte operator', () => {
      it('should match greater than or equal', () => {
        const trigger = {
          type: 'conditional',
          conditions: [{ field: 'amount', operator: 'gte', value: 100 }]
        };

        const result = evaluator.evaluate(trigger, { amount: 100 });
        expect(result.triggered).toBe(true);
      });

      it('should not match less than', () => {
        const trigger = {
          type: 'conditional',
          conditions: [{ field: 'amount', operator: 'gte', value: 100 }]
        };

        const result = evaluator.evaluate(trigger, { amount: 50 });
        expect(result.triggered).toBe(false);
      });
    });

    describe('lte operator', () => {
      it('should match less than or equal', () => {
        const trigger = {
          type: 'conditional',
          conditions: [{ field: 'amount', operator: 'lte', value: 100 }]
        };

        const result = evaluator.evaluate(trigger, { amount: 100 });
        expect(result.triggered).toBe(true);
      });

      it('should not match greater than', () => {
        const trigger = {
          type: 'conditional',
          conditions: [{ field: 'amount', operator: 'lte', value: 100 }]
        };

        const result = evaluator.evaluate(trigger, { amount: 150 });
        expect(result.triggered).toBe(false);
      });
    });

    describe('in operator', () => {
      it('should match value in array', () => {
        const trigger = {
          type: 'conditional',
          conditions: [{ field: 'status', operator: 'in', value: ['active', 'pending'] }]
        };

        const result = evaluator.evaluate(trigger, { status: 'active' });
        expect(result.triggered).toBe(true);
      });

      it('should not match value not in array', () => {
        const trigger = {
          type: 'conditional',
          conditions: [{ field: 'status', operator: 'in', value: ['active', 'pending'] }]
        };

        const result = evaluator.evaluate(trigger, { status: 'inactive' });
        expect(result.triggered).toBe(false);
      });
    });

    describe('contains operator', () => {
      it('should match string containment', () => {
        const trigger = {
          type: 'conditional',
          conditions: [{ field: 'description', operator: 'contains', value: 'urgent' }]
        };

        const result = evaluator.evaluate(trigger, { description: 'This is urgent matter' });
        expect(result.triggered).toBe(true);
      });

      it('should not match if string does not contain value', () => {
        const trigger = {
          type: 'conditional',
          conditions: [{ field: 'description', operator: 'contains', value: 'urgent' }]
        };

        const result = evaluator.evaluate(trigger, { description: 'This is a normal matter' });
        expect(result.triggered).toBe(false);
      });

      it('should be case sensitive for contains', () => {
        const trigger = {
          type: 'conditional',
          conditions: [{ field: 'description', operator: 'contains', value: 'Urgent' }]
        };

        const result = evaluator.evaluate(trigger, { description: 'This is urgent matter' });
        expect(result.triggered).toBe(false);
      });
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle missing event field in data', () => {
      const trigger = {
        type: 'event',
        event: 'order:created'
      };

      const data = {
        orderId: '123'
      };

      const result = evaluator.evaluate(trigger, data);
      expect(result.triggered).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should handle missing condition field in data', () => {
      const trigger = {
        type: 'conditional',
        conditions: [{ field: 'nonexistent', operator: 'eq', value: 'value' }]
      };

      const data = {
        other: 'data'
      };

      const result = evaluator.evaluate(trigger, data);
      expect(result.triggered).toBe(false);
    });

    it('should handle invalid trigger type gracefully', () => {
      const trigger = {
        type: 'unknown'
      };

      const data = {};

      const result = evaluator.evaluate(trigger, data);
      expect(result.triggered).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should handle null or undefined data', () => {
      const trigger = {
        type: 'manual'
      };

      const result = evaluator.evaluate(trigger, null);
      expect(result.triggered).toBe(true);
    });
  });
});
