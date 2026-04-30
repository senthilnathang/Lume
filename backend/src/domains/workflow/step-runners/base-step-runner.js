/**
 * @fileoverview BaseStepRunner - Base class for all workflow step runners
 */

/**
 * @typedef {Object} StepRunnerConfig
 * @property {Object} config - Step-specific configuration
 * @property {WorkflowExecutor} executor - Parent executor instance
 */

class BaseStepRunner {
  /**
   * @param {Object} config - Step configuration
   * @param {Object} executor - WorkflowExecutor instance
   */
  constructor(config, executor) {
    this.config = config || {};
    this.executor = executor;
  }

  /**
   * Execute the step
   * Override in subclasses
   * @param {StepExecutionContext} context - Execution context
   * @returns {Promise<Object>} { success, data, error }
   */
  async execute(context) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Resolve variable references in a value
   * Handles: user.field, data.field, step.stepId.field syntax
   * @protected
   * @param {*} value - Value to resolve
   * @param {Object} context - Execution context
   * @returns {*} Resolved value
   */
  resolveVariable(value, context) {
    if (typeof value !== 'string') {
      return value;
    }

    // user.field -> context.executionContext.field
    if (value.startsWith('user.')) {
      const field = value.substring(5);
      return context.executionContext?.[field] || null;
    }

    // data.field -> context.record.field
    if (value.startsWith('data.')) {
      const field = value.substring(5);
      return context.record?.[field] || null;
    }

    // step.stepId.field -> context.workflowData.stepId.field
    if (value.startsWith('step.')) {
      const parts = value.substring(5).split('.');
      const stepId = parts[0];
      const field = parts[1];
      return context.workflowData?.[stepId]?.[field] || null;
    }

    return value;
  }

  /**
   * Resolve configuration values (may contain variable references)
   * @protected
   * @param {Object} context - Execution context
   * @returns {Object} Resolved config
   */
  resolveConfig(context) {
    const resolved = {};

    for (const [key, value] of Object.entries(this.config)) {
      if (typeof value === 'string') {
        resolved[key] = this.resolveVariable(value, context);
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveObjectVariables(value, context);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Recursively resolve variables in an object
   * @protected
   * @param {Object} obj - Object to resolve
   * @param {Object} context - Execution context
   * @returns {Object} Resolved object
   */
  resolveObjectVariables(obj, context) {
    const resolved = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        resolved[key] = this.resolveVariable(value, context);
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveObjectVariables(value, context);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }
}

export default BaseStepRunner;
