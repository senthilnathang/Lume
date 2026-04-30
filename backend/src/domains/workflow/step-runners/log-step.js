/**
 * @fileoverview LogStep - Logging step runner
 * Logs messages for workflow debugging and audit trails
 */

import BaseStepRunner from './base-step-runner.js';
import logger from '../../../core/services/logger.js';

/**
 * @typedef {Object} LogStepConfig
 * @property {string} level - Log level (debug, info, warn, error)
 * @property {string} message - Log message
 * @property {Object} [context] - Additional context to log
 */

class LogStep extends BaseStepRunner {
  /**
   * Execute log step
   * @param {StepExecutionContext} context - Execution context
   * @returns {Promise<Object>} { success, data }
   */
  async execute(context) {
    try {
      const resolved = this.resolveConfig(context);
      const level = resolved.level || 'info';
      const message = resolved.message || '';
      const logContext = resolved.context || {};

      const logEntry = {
        level,
        message,
        context: logContext,
        workflow: context.record?.id,
        timestamp: new Date().toISOString(),
      };

      // Log using appropriate level
      const logMethod = logger[level] || logger.info;
      logMethod(`[WorkflowLog] ${message}`, logContext);

      return {
        success: true,
        data: logEntry,
      };
    } catch (error) {
      logger.error('[LogStep] Error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default LogStep;
