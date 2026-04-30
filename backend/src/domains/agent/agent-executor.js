/**
 * @fileoverview AgentExecutor - Execute agent actions on entity changes
 * Actions: escalate (update fields), workflow (trigger workflow), mutate (DB update)
 */

import logger from '../../core/services/logger.js';

/**
 * @typedef {Object} AgentDefinition
 * @property {string} id - Unique agent ID
 * @property {string} slug - Entity slug this agent belongs to
 * @property {string} [trigger] - ABAC expression (e.g., "status != 'closed' && daysOpen > 2")
 * @property {string} [schedule] - Cron expression for scheduled agents
 * @property {string} [triggerEvent] - Event type: onCreate, onUpdate, onDelete, scheduled, manual
 * @property {Object} action - Agent action configuration
 * @property {boolean} [enabled] - Whether agent is active
 * @property {string} [description] - Human-readable description
 */

/**
 * @typedef {Object} AgentAction
 * @property {string} type - Action type: escalate, workflow, mutate
 * @property {Object} config - Action-specific config
 */

class AgentExecutor {
  /**
   * @param {Object} config - Executor configuration
   * @param {Object} config.runtime - LumeRuntime instance
   * @param {Object} config.workflowExecutor - WorkflowExecutor instance
   * @param {Object} config.queueManager - BullMQ QueueManagerService
   */
  constructor({ runtime = null, workflowExecutor = null, queueManager = null }) {
    this.runtime = runtime;
    this.workflowExecutor = workflowExecutor;
    this.queueManager = queueManager;
  }

  /**
   * Execute agent synchronously
   * @param {AgentDefinition} agent - Agent definition
   * @param {Object} triggerData - Data triggering agent
   * @param {Object} executionContext - User/auth context
   * @returns {Promise<Object>} Execution result { success, data, error }
   */
  async executeSync(agent, triggerData, executionContext) {
    logger.debug(`[AgentExecutor] Executing agent: ${agent.id}`);

    if (!agent || !agent.action) {
      return {
        success: false,
        error: 'Agent or action not defined',
      };
    }

    const action = agent.action;

    try {
      switch (action.type) {
        case 'escalate':
          return await this.executeEscalate(action, triggerData, executionContext);

        case 'workflow':
          return await this.executeWorkflow(action, triggerData, executionContext);

        case 'mutate':
          return await this.executeMutate(action, triggerData, executionContext);

        default:
          return {
            success: false,
            error: `Unknown action type: ${action.type}`,
          };
      }
    } catch (error) {
      logger.error(`[AgentExecutor] Error executing agent ${agent.id}:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Queue agent for asynchronous execution
   * @param {string} agentId - Agent ID
   * @param {AgentDefinition} agent - Agent definition
   * @param {Object} triggerData - Data triggering agent
   * @param {Object} executionContext - User/auth context
   * @returns {Promise<Object>} Queue job info
   */
  async executeAsync(agentId, agent, triggerData, executionContext) {
    logger.debug(`[AgentExecutor] Queuing agent: ${agentId}`);

    if (!this.queueManager) {
      logger.warn('[AgentExecutor] QueueManager not configured, executing sync');
      return this.executeSync(agent, triggerData, executionContext);
    }

    try {
      const job = await this.queueManager.enqueueJob('agents', {
        agentId,
        agent,
        triggerData,
        executionContext,
      });

      return { queued: true, jobId: job.id };
    } catch (error) {
      logger.error('[AgentExecutor] Failed to queue agent:', error.message);
      return { queued: false, error: error.message };
    }
  }

  /**
   * Execute escalate action - update record fields
   * @private
   * @param {Object} action - Escalate action config
   * @param {Object} triggerData - Trigger data
   * @param {Object} executionContext - Execution context
   * @returns {Promise<Object>}
   */
  async executeEscalate(action, triggerData, executionContext) {
    logger.debug('[AgentExecutor] Executing escalate action');

    const { entity, record } = triggerData;
    const updates = action.config?.updates || {};

    if (!this.runtime) {
      return {
        success: false,
        error: 'Runtime not configured',
      };
    }

    try {
      const request = {
        entity: entity.slug,
        action: 'update',
        data: {
          id: record.id,
          ...updates,
        },
      };

      const result = await this.runtime.execute(request, {
        state: {},
        entity,
        executionContext,
      });

      return {
        success: result.success,
        data: {
          action: 'escalate',
          recordId: record.id,
          updates,
          result: result.result,
        },
        error: result.abortReason,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute workflow action - trigger workflow
   * @private
   * @param {Object} action - Workflow action config
   * @param {Object} triggerData - Trigger data
   * @param {Object} executionContext - Execution context
   * @returns {Promise<Object>}
   */
  async executeWorkflow(action, triggerData, executionContext) {
    logger.debug('[AgentExecutor] Executing workflow action');

    const workflowId = action.config?.workflowId;

    if (!workflowId) {
      return {
        success: false,
        error: 'workflowId is required',
      };
    }

    if (!this.workflowExecutor) {
      return {
        success: false,
        error: 'WorkflowExecutor not configured',
      };
    }

    try {
      const result = await this.workflowExecutor.executeAsync(
        workflowId,
        action.config?.workflow, // workflow definition
        triggerData,
        executionContext
      );

      return {
        success: result.queued !== false,
        data: {
          action: 'workflow',
          workflowId,
          result,
        },
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute mutate action - arbitrary record updates
   * @private
   * @param {Object} action - Mutate action config
   * @param {Object} triggerData - Trigger data
   * @param {Object} executionContext - Execution context
   * @returns {Promise<Object>}
   */
  async executeMutate(action, triggerData, executionContext) {
    logger.debug('[AgentExecutor] Executing mutate action');

    const { entity, record } = triggerData;
    const updates = action.config?.updates || {};

    if (!this.runtime) {
      return {
        success: false,
        error: 'Runtime not configured',
      };
    }

    try {
      const request = {
        entity: entity.slug,
        action: 'update',
        data: {
          id: record.id,
          ...updates,
        },
      };

      const result = await this.runtime.execute(request, {
        state: {},
        entity,
        executionContext,
      });

      return {
        success: result.success,
        data: {
          action: 'mutate',
          recordId: record.id,
          updates,
          result: result.result,
        },
        error: result.abortReason,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create a new AgentExecutor
   * @static
   * @param {Object} config - Configuration
   * @returns {AgentExecutor}
   */
  static create(config) {
    return new AgentExecutor(config);
  }
}

export default AgentExecutor;
