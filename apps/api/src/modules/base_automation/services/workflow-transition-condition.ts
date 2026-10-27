/** Bounded, data-only AND predicates. No expressions or executable code. */
const scalar = (value: unknown) => value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value));
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const operators = new Set(['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin']);

export function transitionConditionError(condition: unknown): string | undefined {
  if (condition === undefined) return;
  if (!object(condition) || Object.keys(condition).length > 100) return 'Condition must be an object with at most 100 fields';
  for (const [field, predicate] of Object.entries(condition)) {
    if (!field.trim() || field.length > 100 || ['__proto__', 'constructor', 'prototype'].includes(field)) return 'Invalid condition field';
    if (scalar(predicate)) continue;
    if (!object(predicate) || !Object.keys(predicate).length) return 'Invalid condition predicate';
    for (const [operator, operand] of Object.entries(predicate)) {
      if (!operators.has(operator)) return 'Unsupported condition operator';
      if (operator === '$in' || operator === '$nin') {
        if (!Array.isArray(operand) || operand.length > 1000 || !operand.every(scalar)) return 'Membership conditions require scalar arrays';
      } else if (!scalar(operand)) return 'Condition requires a scalar operand';
      if (['$gt', '$gte', '$lt', '$lte'].includes(operator) && !(typeof operand === 'number' && Number.isFinite(operand))) return 'Ordered conditions require finite numbers';
    }
  }
}

export function matchesTransitionCondition(condition: Record<string, unknown>, data: Record<string, unknown>): boolean {
  return Object.entries(condition).every(([field, predicate]) => {
    // Missing fields never satisfy a predicate, including inequality.
    if (!Object.prototype.hasOwnProperty.call(data, field)) return false;
    const value = data[field];
    if (!scalar(value)) return false;
    if (!object(predicate)) return value === predicate;
    return Object.entries(predicate).every(([operator, operand]) => {
      switch (operator) {
        case '$eq': return value === operand;
        case '$ne': return value !== operand;
        case '$in': return (operand as unknown[]).includes(value);
        case '$nin': return !(operand as unknown[]).includes(value);
        case '$gt': return typeof value === 'number' && value > (operand as number);
        case '$gte': return typeof value === 'number' && value >= (operand as number);
        case '$lt': return typeof value === 'number' && value < (operand as number);
        case '$lte': return typeof value === 'number' && value <= (operand as number);
        default: return false;
      }
    });
  });
}
