/**
 * @fileoverview EmailStep - Send email step runner
 * Sends transactional emails with variable interpolation
 */

import BaseStepRunner from './base-step-runner.js';
import logger from '../../../core/services/logger.js';

/**
 * @typedef {Object} EmailStepConfig
 * @property {string} to - Email recipient (or user.email for context reference)
 * @property {string} subject - Email subject
 * @property {string} template - Email template name or inline HTML
 * @property {Object} [variables] - Template variables
 * @property {string} [from] - Sender email (defaults to system)
 * @property {string[]} [cc] - CC recipients
 * @property {string[]} [bcc] - BCC recipients
 */

class EmailStep extends BaseStepRunner {
  /**
   * Execute email step
   * @param {StepExecutionContext} context - Execution context
   * @returns {Promise<Object>} { success, data }
   */
  async execute(context) {
    try {
      const resolved = this.resolveConfig(context);

      const emailPayload = {
        to: resolved.to,
        subject: resolved.subject,
        template: resolved.template,
        variables: resolved.variables || {},
        from: resolved.from,
        cc: resolved.cc,
        bcc: resolved.bcc,
      };

      logger.debug(`[EmailStep] Sending email to: ${emailPayload.to}`);

      // In a real implementation, this would call an email service
      // For now, we simulate successful send
      const result = {
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        to: emailPayload.to,
        subject: emailPayload.subject,
        timestamp: new Date().toISOString(),
      };

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger.error('[EmailStep] Error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default EmailStep;
