import { AbstractWorkflowNode } from './base.node.js';

export class ConditionNode extends AbstractWorkflowNode {
  constructor() {
    super('condition', {});
  }

  async validate(nodeConfig) {
    const errors = [];
    if (!Array.isArray(nodeConfig.conditions) || nodeConfig.conditions.length === 0) {
      errors.push('conditions array is required');
    }
    if (nodeConfig.logic && !['AND', 'OR'].includes(nodeConfig.logic)) {
      errors.push('logic must be AND or OR');
    }
    return errors;
  }

  resolveValue(path, context) {
    if (typeof path !== 'string') return path;
    const parts = path.split('.');
    let value = context.variables;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        value = context.nodeOutputs[path];
        break;
      }
    }
    return value;
  }

  evaluateCondition(condition, context) {
    const { field, operator, value: expectedValue } = condition;
    const actualValue = this.resolveValue(field, context);

    switch (operator) {
      case '=':
        return actualValue === expectedValue;
      case '!=':
        return actualValue !== expectedValue;
      case '>':
        return Number(actualValue) > Number(expectedValue);
      case '>=':
        return Number(actualValue) >= Number(expectedValue);
      case '<':
        return Number(actualValue) < Number(expectedValue);
      case '<=':
        return Number(actualValue) <= Number(expectedValue);
      case 'contains':
        return String(actualValue).includes(String(expectedValue));
      case 'startsWith':
        return String(actualValue).startsWith(String(expectedValue));
      case 'endsWith':
        return String(actualValue).endsWith(String(expectedValue));
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(actualValue);
      case 'isEmpty':
        return !actualValue || actualValue === '' || (Array.isArray(actualValue) && actualValue.length === 0);
      case 'isNotEmpty':
        return actualValue && actualValue !== '' && (!Array.isArray(actualValue) || actualValue.length > 0);
      default:
        return false;
    }
  }

  async execute(nodeConfig, context) {
    const { conditions = [], logic = 'AND' } = nodeConfig;

    const results = conditions.map(cond => this.evaluateCondition(cond, context));
    const result = logic === 'AND' ? results.every(r => r) : results.some(r => r);

    return {
      result,
      branch: result ? 'true' : 'false',
      conditions: conditions.map((cond, idx) => ({
        ...cond,
        evaluated: results[idx]
      }))
    };
  }

  getMetadata() {
    return {
      ...super.getMetadata(),
      category: 'control',
      description: 'Conditional branching based on variables'
    };
  }
}
