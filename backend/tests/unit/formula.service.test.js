import { evaluateFormula, computeFormulaFields } from '../../src/core/services/formula.service.js';

describe('formula.service', () => {
  describe('evaluateFormula', () => {
    test('evaluates arithmetic with field refs', () => {
      expect(evaluateFormula('{price} * {qty}', { price: 10, qty: 3 })).toBe(30);
      expect(evaluateFormula('({a} + {b}) / 2', { a: 4, b: 6 })).toBe(5);
    });

    test('concatenates strings with + and CONCAT', () => {
      expect(evaluateFormula('{first} + " " + {last}', { first: 'Ada', last: 'Lovelace' })).toBe('Ada Lovelace');
      expect(evaluateFormula('CONCAT({a}, "-", {b})', { a: 'x', b: 'y' })).toBe('x-y');
    });

    test('supports comparisons and IF', () => {
      expect(evaluateFormula('IF({total} >= 100, "big", "small")', { total: 150 })).toBe('big');
      expect(evaluateFormula('IF({total} >= 100, "big", "small")', { total: 20 })).toBe('small');
    });

    test('supports math helpers', () => {
      expect(evaluateFormula('ROUND({v}, 2)', { v: 3.14159 })).toBe(3.14);
      expect(evaluateFormula('UPPER({s})', { s: 'lume' })).toBe('LUME');
    });

    test('returns null for division by zero and missing refs', () => {
      expect(evaluateFormula('{a} / {b}', { a: 1, b: 0 })).toBeNull();
      expect(evaluateFormula('{missing} + 1', {})).toBeNull();
    });

    test('rejects code injection and unknown functions', () => {
      expect(() => evaluateFormula('process.exit()', {})).toThrow();
      expect(() => evaluateFormula('EVIL({x})', { x: 1 })).toThrow();
      expect(() => evaluateFormula('{a}; DROP TABLE x', { a: 1 })).toThrow();
    });

    test('rejects empty and oversized expressions', () => {
      expect(() => evaluateFormula('', {})).toThrow();
      expect(() => evaluateFormula('1+'.padEnd(2001, '1'), {})).toThrow();
    });
  });

  describe('computeFormulaFields', () => {
    test('materializes formula fields and overwrites client values', () => {
      const fields = [
        { name: 'price', type: 'number' },
        { name: 'qty', type: 'number' },
        { name: 'total', type: 'number', formulaExpression: '{price} * {qty}' },
      ];
      const out = computeFormulaFields(fields, { price: 5, qty: 4, total: 999 });
      expect(out.total).toBe(20);
    });

    test('sets null when expression fails', () => {
      const fields = [{ name: 'bad', type: 'text', formulaExpression: 'NOPE(' }];
      expect(computeFormulaFields(fields, {}).bad).toBeNull();
    });

    test('leaves non-formula data untouched', () => {
      const out = computeFormulaFields([{ name: 'a', type: 'text' }], { a: 'hi' });
      expect(out).toEqual({ a: 'hi' });
    });
  });
});
