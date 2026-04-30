/**
 * @fileoverview ConditionStep - Conditional branching step runner
 * Evaluates conditions and determines next step path
 */

import BaseStepRunner from './base-step-runner.js';
import ExpressionEvaluator from '../../../core/permissions/evaluator.js';
import logger from '../../../core/services/logger.js';

/**
 * @typedef {Object} ConditionStepConfig
 * @property {string} expression - ABAC expression to evaluate
 * @property {string} ifTrue - Next step ID if condition is true
 * @property {string} ifFalse - Next step ID if condition is false
 */

class ConditionStep extends BaseStepRunner {
  /**
   * Execute condition step
   * @param {StepExecutionContext} context - Execution context
   * @returns {Promise<Object>} { success, data, nextStep }
   */
  async execute(context) {
    try {
      const expression = this.config.expression;

      if (!expression) {
        return {
          success: false,
          error: 'expression is required',
        };
      }

      logger.debug(`[ConditionStep] Evaluating: ${expression}`);

      const evaluator = new ExpressionEvaluator();
      const evalContext = {
        user: context.executionContext,
        data: context.record,
        now: new Date(),
      };

      const result = await evaluator.evaluate(expression, evalContext);

      const nextStep = result ? this.config.ifTrue : this.config.ifFalse;

      return {
        success: true,
        data: {
          conditionResult: result,
          nextStep,
        },
      };
    } catch (error) {
      logger.error('[ConditionStep] Error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default ConditionStep;
