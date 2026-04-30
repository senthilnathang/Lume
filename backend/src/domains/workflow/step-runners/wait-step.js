/**
 * @fileoverview WaitStep - Delay step runner
 * Pauses workflow execution for specified duration
 */

import BaseStepRunner from './base-step-runner.js';
import logger from '../../../core/services/logger.js';

/**
 * @typedef {Object} WaitStepConfig
 * @property {number} seconds - Number of seconds to wait
 * @property {string} [duration] - Alternative: duration string (e.g., "5s", "2m", "1h")
 */

class WaitStep extends BaseStepRunner {
  /**
   * Parse duration string to seconds
   * @private
   * @param {string} duration - Duration string (5s, 2m, 1h)
   * @returns {number} Duration in seconds
   */
  parseDuration(duration) {
    const match = duration.match(/^(\d+)([smh])$/);
    if (!match) {
      return 0;
    }

    const [, value, unit] = match;
    const seconds = {
      s: 1,
      m: 60,
      h: 3600,
    };

    return parseInt(value, 10) * (seconds[unit] || 1);
  }

  /**
   * Execute wait step
   * @param {StepExecutionContext} context - Execution context
   * @returns {Promise<Object>} { success, data }
   */
  async execute(context) {
    try {
      let waitSeconds = this.config.seconds || 0;

      if (this.config.duration && !waitSeconds) {
        waitSeconds = this.parseDuration(this.config.duration);
      }

      if (waitSeconds < 0) {
        return {
          success: false,
          error: 'wait duration must be positive',
        };
      }

      if (waitSeconds === 0) {
        return {
          success: true,
          data: { waited: 0, unit: 'seconds' },
        };
      }

      logger.debug(`[WaitStep] Waiting ${waitSeconds} seconds`);

      // Sleep for specified duration
      await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));

      return {
        success: true,
        data: {
          waited: waitSeconds,
          unit: 'seconds',
        },
      };
    } catch (error) {
      logger.error('[WaitStep] Error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default WaitStep;
