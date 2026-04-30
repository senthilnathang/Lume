/**
 * @fileoverview Unit tests for TriggerEvaluator
 */

import { describe, it, expect } from '@jest/globals';
import TriggerEvaluator from '../../src/domains/agent/trigger-evaluator.js';

describe('TriggerEvaluator', () => {
  const userContext = {
    userId: 1,
    orgId: 1,
    roles: ['support_agent'],
  };

  describe('Simple Expressions', () => {
    it('should evaluate equality condition', async () => {
      const trigger = 'data.status == "open"';
      const record = { id: 1, status: 'open' };

      const result = await TriggerEvaluator.evaluate(trigger, record, userContext);

      expect(result).toBe(true);
    });

    it('should evaluate inequality condition', async () => {
      const trigger = 'data.status != "closed"';
      const record = { id: 1, status: 'open' };

      const result = await TriggerEvaluator.evaluate(trigger, record, userContext);

      expect(result).toBe(true);
    });

    it('should evaluate greater than condition', async () => {
      const trigger = 'data.daysOpen > 2';
      const record = { id: 1, daysOpen: 5 };

      const result = await TriggerEvaluator.evaluate(trigger, record, userContext);

      expect(result).toBe(true);
    });

    it('should evaluate less than condition', async () => {
      const trigger = 'data.priority < 3';
      const record = { id: 1, priority: 2 };

      const result = await TriggerEvaluator.evaluate(trigger, record, userContext);

      expect(result).toBe(true);
    });
  });

  describe('Complex Expressions', () => {
    it('should evaluate AND expression', async () => {
      const trigger = 'data.status != "closed" AND data.priority == "high"';
      const record = { id: 1, status: 'open', priority: 'high' };

      const result = await TriggerEvaluator.evaluate(trigger, record, userContext);

      expect(result).toBe(true);
    });

    it('should evaluate OR expression', async () => {
      const trigger = 'data.status == "urgent" OR data.priority == "high"';
      const record = { id: 1, status: 'open', priority: 'high' };

      const result = await TriggerEvaluator.evaluate(trigger, record, userContext);

      expect(result).toBe(true);
    });

    it('should evaluate mixed AND/OR', async () => {
      const trigger = 'data.status != "closed" AND (data.priority == "high" OR data.priority == "urgent")';
      const record = { id: 1, status: 'open', priority: 'urgent' };

      const result = await TriggerEvaluator.evaluate(trigger, record, userContext);

      expect(result).toBe(true);
    });

    it('should return false when condition not met', async () => {
      const trigger = 'data.status == "closed"';
      const record = { id: 1, status: 'open' };

      const result = await TriggerEvaluator.evaluate(trigger, record, userContext);

      expect(result).toBe(false);
    });
  });

  describe('User Context References', () => {
    it('should reference user fields', async () => {
      const trigger = 'data.assignedTo == user.userId';
      const record = { id: 1, assignedTo: 1 };

      const result = await TriggerEvaluator.evaluate(trigger, record, userContext);

      expect(result).toBe(true);
    });

    it('should check user roles', async () => {
      const trigger = 'user.roles == "admin"';
      const record = { id: 1 };
      const managerContext = { userId: 1, roles: ['manager'] };

      const result = await TriggerEvaluator.evaluate(trigger, record, managerContext);

      expect(result).toBe(false);
    });
  });

  describe('No Trigger', () => {
    it('should execute if no trigger specified', async () => {
      const result = await TriggerEvaluator.evaluate(null, { id: 1 }, userContext);

      expect(result).toBe(true);
    });

    it('should execute if empty trigger', async () => {
      const result = await TriggerEvaluator.evaluate('', { id: 1 }, userContext);

      expect(result).toBe(true);
    });
  });

  describe('Evaluate Many', () => {
    it('should filter records matching trigger', async () => {
      const trigger = 'data.status != "closed"';
      const records = [
        { id: 1, status: 'open' },
        { id: 2, status: 'closed' },
        { id: 3, status: 'in_progress' },
        { id: 4, status: 'closed' },
      ];

      const matching = await TriggerEvaluator.evaluateMany(trigger, records, userContext);

      expect(matching).toHaveLength(2);
      expect(matching.map(r => r.id)).toContain(1);
      expect(matching.map(r => r.id)).toContain(3);
    });

    it('should return all records if no trigger', async () => {
      const records = [
        { id: 1, status: 'open' },
        { id: 2, status: 'closed' },
      ];

      const matching = await TriggerEvaluator.evaluateMany(null, records, userContext);

      expect(matching).toHaveLength(2);
    });
  });

  describe('Describe Trigger', () => {
    it('should describe status not closed trigger', () => {
      const desc = TriggerEvaluator.describe('status != "closed" AND daysOpen > 2');

      expect(desc).toContain('not closed');
    });

    it('should describe daysOpen trigger', () => {
      const desc = TriggerEvaluator.describe('daysOpen > 5');

      expect(desc).toContain('5');
      expect(desc).toContain('days');
    });

    it('should describe urgent priority trigger', () => {
      const desc = TriggerEvaluator.describe('priority == "urgent"');

      expect(desc).toContain('urgent');
    });

    it('should describe empty trigger', () => {
      const desc = TriggerEvaluator.describe(null);

      expect(desc).toBe('Always execute');
    });

    it('should provide fallback description', () => {
      const desc = TriggerEvaluator.describe('customField > 100');

      expect(desc).toContain('When');
    });
  });

  describe('Validate Trigger', () => {
    it('should validate correct expression', () => {
      const result = TriggerEvaluator.validate('data.status == "open"');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unbalanced parentheses', () => {
      const result = TriggerEvaluator.validate('(data.status == "open"');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unbalanced parentheses');
    });

    it('should reject mismatched closing parentheses', () => {
      const result = TriggerEvaluator.validate('data.status == "open"))');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unbalanced parentheses');
    });

    it('should accept null trigger', () => {
      const result = TriggerEvaluator.validate(null);

      expect(result.valid).toBe(true);
    });

    it('should accept valid AND/OR expressions', () => {
      const result = TriggerEvaluator.validate('data.status != "closed" AND data.priority > 2');

      expect(result.valid).toBe(true);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should evaluate ticket escalation trigger', async () => {
      const trigger = 'data.status != "closed" AND data.daysOpen > 2';
      const records = [
        { id: 1, status: 'open', daysOpen: 1 }, // Won't escalate
        { id: 2, status: 'open', daysOpen: 5 }, // Will escalate
        { id: 3, status: 'closed', daysOpen: 10 }, // Won't escalate
        { id: 4, status: 'in_progress', daysOpen: 3 }, // Will escalate
      ];

      const escalating = await TriggerEvaluator.evaluateMany(trigger, records, userContext);

      expect(escalating).toHaveLength(2);
      expect(escalating.map(r => r.id)).toEqual([2, 4]);
    });

    it('should evaluate critical issue trigger', async () => {
      const trigger = 'data.priority == "critical" OR (data.status == "open" AND data.severity > 8)';
      const records = [
        { id: 1, priority: 'critical', status: 'open', severity: 5 }, // Critical
        { id: 2, priority: 'high', status: 'open', severity: 9 }, // High severity open
        { id: 3, priority: 'medium', status: 'closed', severity: 10 }, // Closed (ignored)
      ];

      const critical = await TriggerEvaluator.evaluateMany(trigger, records, userContext);

      expect(critical).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid expression gracefully', async () => {
      const trigger = 'invalid syntax here!@#$';
      const record = { id: 1 };

      const result = await TriggerEvaluator.evaluate(trigger, record, userContext);

      expect(result).toBe(false);
    });

    it('should continue evaluating even if record missing field', async () => {
      const trigger = 'data.status == "open"';
      const record = { id: 1 }; // Missing status field

      const result = await TriggerEvaluator.evaluate(trigger, record, userContext);

      expect(result).toBe(false);
    });

    it('should handle null record', async () => {
      const trigger = 'data.status == "open"';
      const record = null;

      const result = await TriggerEvaluator.evaluate(trigger, record, userContext);

      expect(typeof result).toBe('boolean');
    });
  });
});
