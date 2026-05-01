import { runInNewContext } from 'vm';
import { AbstractWorkflowNode } from './base.node.js';

export class ScriptNode extends AbstractWorkflowNode {
  constructor() {
    super('script', {});
  }

  async validate(nodeConfig) {
    const errors = [];
    if (!nodeConfig.code) errors.push('code is required');
    if (nodeConfig.timeout && Number(nodeConfig.timeout) <= 0) {
      errors.push('timeout must be positive');
    }
    return errors;
  }

  async execute(nodeConfig, context) {
    const { code, timeout = 5000 } = nodeConfig;

    const logs = [];
    const consoleMock = {
      log: (...args) => logs.push(args.map(a => String(a)).join(' ')),
      error: (...args) => logs.push('ERROR: ' + args.map(a => String(a)).join(' ')),
      warn: (...args) => logs.push('WARN: ' + args.map(a => String(a)).join(' ')),
      info: (...args) => logs.push('INFO: ' + args.map(a => String(a)).join(' '))
    };

    const sandbox = {
      Math,
      JSON,
      Date,
      console: consoleMock,
      variables: context.variables,
      nodeOutputs: context.nodeOutputs,
      result: null
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Script execution timeout after ${timeout}ms`));
      }, timeout);

      try {
        const wrappedCode = `
          (async function() {
            ${code}
            return result;
          })()
        `;

        const asyncResult = runInNewContext(wrappedCode, sandbox, { timeout });

        if (asyncResult && typeof asyncResult.then === 'function') {
          asyncResult.then(finalResult => {
            clearTimeout(timer);
            resolve({
              result: finalResult,
              logs
            });
          }).catch(error => {
            clearTimeout(timer);
            reject(error);
          });
        } else {
          clearTimeout(timer);
          resolve({
            result: asyncResult,
            logs
          });
        }
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  getMetadata() {
    return {
      ...super.getMetadata(),
      category: 'utility',
      description: 'Execute custom JavaScript code in a sandboxed environment'
    };
  }
}
