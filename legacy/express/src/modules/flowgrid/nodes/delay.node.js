import { AbstractWorkflowNode } from './base.node.js';

export class DelayNode extends AbstractWorkflowNode {
  constructor() {
    super('delay', {});
  }

  async validate(nodeConfig) {
    const errors = [];
    if (nodeConfig.duration === undefined || nodeConfig.duration === null) {
      errors.push('duration is required');
    } else if (Number(nodeConfig.duration) <= 0) {
      errors.push('duration must be positive');
    }
    if (nodeConfig.unit && !['ms', 's', 'm', 'h'].includes(nodeConfig.unit)) {
      errors.push('unit must be ms, s, m, or h');
    }
    return errors;
  }

  async execute(nodeConfig, context) {
    const { duration = 1000, unit = 's' } = nodeConfig;

    let delayMs = Number(duration);
    if (unit === 's') delayMs *= 1000;
    else if (unit === 'm') delayMs *= 60 * 1000;
    else if (unit === 'h') delayMs *= 60 * 60 * 1000;

    await Promise.race([
      new Promise(resolve => setTimeout(resolve, delayMs)),
      new Promise((_, reject) => {
        if (context.abortSignal) {
          context.abortSignal.addEventListener('abort', () => reject(new Error('Execution cancelled')));
        }
      })
    ]);

    return { waitedMs: delayMs };
  }

  getMetadata() {
    return {
      ...super.getMetadata(),
      category: 'utility',
      description: 'Delay execution for a specified duration'
    };
  }
}
