import { AbstractWorkflowNode } from './base.node.js';

export class LoopNode extends AbstractWorkflowNode {
  constructor() {
    super('loop', {});
  }

  async validate(nodeConfig) {
    const errors = [];
    if (!nodeConfig.itemsPath) errors.push('itemsPath is required');
    if (nodeConfig.maxIterations && Number(nodeConfig.maxIterations) <= 0) {
      errors.push('maxIterations must be positive');
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
    return Array.isArray(value) ? value : [value];
  }

  async execute(nodeConfig, context) {
    const { itemsPath, maxIterations = 100 } = nodeConfig;

    const items = this.resolveValue(itemsPath, context);
    const iterations = Math.min(items.length, maxIterations);

    return {
      items,
      count: items.length,
      iterations,
      results: items.slice(0, iterations)
    };
  }

  getMetadata() {
    return {
      ...super.getMetadata(),
      category: 'control',
      description: 'Iterate over array items'
    };
  }
}
