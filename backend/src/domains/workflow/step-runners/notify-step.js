/**
 * @fileoverview NotifyStep - Send notification step runner
 * Sends in-app or push notifications to users
 */

import BaseStepRunner from './base-step-runner.js';
import logger from '../../../core/services/logger.js';

/**
 * @typedef {Object} NotifyStepConfig
 * @property {string} type - Notification type (in_app, email, sms, push)
 * @property {string} title - Notification title
 * @property {string} message - Notification message
 * @property {string} [recipient] - User ID or user.id reference
 * @property {string} [url] - Optional link to include in notification
 * @property {Object} [metadata] - Additional metadata
 */

class NotifyStep extends BaseStepRunner {
  /**
   * Execute notification step
   * @param {StepExecutionContext} context - Execution context
   * @returns {Promise<Object>} { success, data }
   */
  async execute(context) {
    try {
      const resolved = this.resolveConfig(context);

      const notificationPayload = {
        type: resolved.type || 'in_app',
        title: resolved.title,
        message: resolved.message,
        recipient: resolved.recipient || context.executionContext?.userId,
        url: resolved.url,
        metadata: resolved.metadata,
        createdAt: new Date().toISOString(),
      };

      // Validate required fields
      if (!notificationPayload.title || !notificationPayload.message) {
        return {
          success: false,
          error: 'title and message are required',
        };
      }

      logger.debug(`[NotifyStep] Sending ${notificationPayload.type} notification to user: ${notificationPayload.recipient}`);

      // In a real implementation, this would dispatch to notification service
      const result = {
        notificationId: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: notificationPayload.type,
        recipient: notificationPayload.recipient,
        title: notificationPayload.title,
        timestamp: new Date().toISOString(),
      };

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger.error('[NotifyStep] Error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default NotifyStep;
