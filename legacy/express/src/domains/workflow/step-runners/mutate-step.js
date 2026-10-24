/**
 * @fileoverview MutateStep - Update entity records step runner
 * Modifies entity data based on computed or static values
 */

import BaseStepRunner from './base-step-runner.js';
import logger from '../../../core/services/logger.js';

/**
 * @typedef {Object} MutateStepConfig
 * @property {string} entity - Entity slug to update
 * @property {string} recordId - Record ID to update (or data.id for context reference)
 * @property {Object} updates - Field updates
 * @property {boolean} [mergeArrays] - Whether to merge array fields
 */

class MutateStep extends BaseStepRunner {
  /**
   * Execute mutate step
   * @param {StepExecutionContext} context - Execution context
   * @returns {Promise<Object>} { success, data }
   */
  async execute(context) {
    try {
      const resolved = this.resolveConfig(context);

      const recordId = this.resolveVariable(resolved.recordId, context);
      const entity = resolved.entity;
      const updates = resolved.updates || {};

      if (!entity) {
        return {
          success: false,
          error: 'entity is required',
        };
      }

      if (!recordId) {
        return {
          success: false,
          error: 'recordId is required or unable to resolve',
        };
      }

      logger.debug(`[MutateStep] Updating ${entity} record: ${recordId}`);

      // In a real implementation, this would call runtime.execute() with update action
      // For now, we simulate the mutation
      const result = {
        entity,
        recordId,
        updates,
        updatedAt: new Date().toISOString(),
      };

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger.error('[MutateStep] Error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default MutateStep;
