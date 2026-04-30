import { jest } from '@jest/globals';
import { SafeExpressionEvaluator } from '../../src/core/permissions/safe-evaluator.js';

describe('SafeExpressionEvaluator', () => {
  let evaluator;

  beforeEach(() => {
    evaluator = new SafeExpressionEvaluator();
  });

  describe('evaluate', () => {
    it('should evaluate simple equality', () => {
      const context = { department: 'sales' };
      const result = evaluator.evaluate(context, 'department === "sales"');
      expect(result).toBe(true);
    });

    it('should evaluate comparison operators', () => {
      const context = { level: 5 };
      expect(evaluator.evaluate(context, 'level > 3')).toBe(true);
      expect(evaluator.evaluate(context, 'level <= 5')).toBe(true);
      expect(evaluator.evaluate(context, 'level < 5')).toBe(false);
    });

    it('should evaluate logical operators', () => {
      const context = { department: 'sales', level: 3 };
      expect(evaluator.evaluate(context, 'department === "sales" && level >= 3')).toBe(true);
      expect(evaluator.evaluate(context, 'department === "eng" || level >= 3')).toBe(true);
      expect(evaluator.evaluate(context, '!false')).toBe(true);
    });

    it('should evaluate array includes', () => {
      const context = { status: 'active' };
      expect(evaluator.evaluate(context, 'status === "active" || status === "pending"')).toBe(true);
    });

    it('should throw on undefined variables', () => {
      const context = { department: 'sales' };
      expect(() => evaluator.evaluate(context, 'undefinedVar === "test"')).toThrow();
    });

    it('should throw on function calls', () => {
      const context = { code: '123' };
      expect(() => evaluator.evaluate(context, 'eval("dangerous")')).toThrow();
    });

    it('should throw on property access beyond context', () => {
      const context = { data: { value: 5 } };
      expect(() => evaluator.evaluate(context, 'require("fs")')).toThrow();
    });

    it('should support nested property access', () => {
      const context = { user: { department: 'sales' } };
      expect(evaluator.evaluate(context, 'user.department === "sales"')).toBe(true);
    });

    it('should throw on unsafe property access', () => {
      const context = { data: 'test' };
      expect(() => evaluator.evaluate(context, 'data.constructor.name')).toThrow();
    });

    it('should evaluate with multiple conditions', () => {
      const context = { role: 'admin', level: 5, department: 'it' };
      expect(evaluator.evaluate(context, 'role === "admin" && level >= 5 && department === "it"')).toBe(true);
    });

    it('should handle whitespace and parentheses', () => {
      const context = { a: 5, b: 3 };
      expect(evaluator.evaluate(context, '(a > b) && (b < a)')).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate safe expressions', () => {
      expect(evaluator.validate('department === "sales"')).toBe(true);
      expect(evaluator.validate('level > 3 && status === "active"')).toBe(true);
    });

    it('should reject function calls', () => {
      expect(evaluator.validate('eval("code")')).toBe(false);
      expect(evaluator.validate('require("fs")')).toBe(false);
      expect(evaluator.validate('process.exit()')).toBe(false);
    });

    it('should reject unsafe property access', () => {
      expect(evaluator.validate('__proto__.polluted')).toBe(false);
      expect(evaluator.validate('constructor.prototype')).toBe(false);
    });

    it('should reject keywords', () => {
      expect(evaluator.validate('import something from "x"')).toBe(false);
      expect(evaluator.validate('async function test() {}')).toBe(false);
    });
  });

  describe('CRITICAL SECURITY TESTS', () => {
    it('should throw on IIFE expressions', () => {
      expect(() => evaluator.evaluate({}, '(function() { return 1; })()')).toThrow(/Unsafe expression detected/);
    });

    it('should throw on arrow functions', () => {
      expect(() => evaluator.evaluate({}, '() => 1')).toThrow(/Unsafe expression detected/);
    });

    it('should throw if context contains functions', () => {
      const context = { dangerous: () => 'execute' };
      expect(() => evaluator.evaluate(context, 'dangerous()')).toThrow(/functions not allowed/);
    });

    it('should reject template literals with expressions', () => {
      expect(evaluator.validate('`value: ${x}`')).toBe(false);
    });

    it('should handle escaped quotes in strings correctly', () => {
      const context = { text: 'te"st' };
      expect(evaluator.evaluate(context, 'text === "te\\"st"')).toBe(true);
    });
  });
});
