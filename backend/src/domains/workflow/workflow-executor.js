/**
 * @fileoverview WorkflowExecutor - Execute workflow steps sequentially or asynchronously
 * Bridges workflow definitions to step runners (email, notification, mutate, condition, wait, etc.)
 */

import logger from '../../core/services/logger.js';

/**
 * @typedef {Object} WorkflowStep
 * @property {string} id - Step ID
 * @property {string} type - Step type (send_email, send_notification, mutate, if, wait, log)
 * @property {Object} config - Step configuration
 * @property {string} [nextStepId] - ID of next step if not linear
 */

/**
 * @typedef {Object} StepExecutionContext
 * @property {Object} stepData - Current step result/data
 * @property {Object} workflowData - Workflow-level data accumulation
 * @property {Object} executionContext - User/auth context
 * @property {Object} record - Entity record triggering workflow
 * @property {string} action - Trigger action (onCreate, onUpdate, onDelete)
 */

class WorkflowExecutor {
  /**
   * @param {Object} config - Executor configuration
   * @param {Map<string, Function>} config.stepRunners - Registered step runner classes
   * @param {Object} config.queueManager - BullMQ QueueManagerService
   * @param {Object} config.runtime - LumeRuntime for triggering workflows
   */
  constructor({ stepRunners = new Map(), queueManager = null, runtime = null }) {
    this.stepRunners = stepRunners;
    this.queueManager = queueManager;
    this.runtime = runtime;
    this.registerDefaultRunners();
  }

  /**
   * Register built-in step runners
   * @private
   */
  registerDefaultRunners() {
    // Runners will be imported and registered on demand
    // This allows circular dependency prevention
  }

  /**
   * Execute workflow definition synchronously
   * @param {Object} workflowDef - Workflow definition
   * @param {Object} triggerData - Data triggering workflow
   * @param {Object} executionContext - User/auth context
   * @returns {Promise<Object>} Execution result { success, steps, errors }
   */
  async executeSync(workflowDef, triggerData, executionContext) {
    logger.debug(`[WorkflowExecutor] Executing sync workflow: ${workflowDef.id}`);

    if (!workflowDef || !workflowDef.steps || workflowDef.steps.length === 0) {
      return { success: true, steps: [], errors: [] };
    }

    const executionResult = {
      success: true,
      steps: [],
      errors: [],
      workflowData: {},
    };

    const context = {
      stepData: null,
      workflowData: executionResult.workflowData,
      executionContext,
      record: triggerData.record,
      action: triggerData.action,
      entity: triggerData.entity,
    };

    try {
      for (const step of workflowDef.steps) {
        const stepResult = await this.executeStep(step, context);

        executionResult.steps.push({
          stepId: step.id,
          type: step.type,
          success: stepResult.success,
          data: stepResult.data,
          error: stepResult.error,
        });

        if (!stepResult.success) {
          executionResult.success = false;
          executionResult.errors.push(stepResult.error);

          if (step.config?.continueOnError !== true) {
            logger.warn(`[WorkflowExecutor] Step ${step.id} failed, halting workflow`);
            break;
          }
        }

        context.stepData = stepResult.data;
      }
    } catch (error) {
      executionResult.success = false;
      executionResult.errors.push(error.message);
      logger.error('[WorkflowExecutor] Sync execution error:', error.message);
    }

    return executionResult;
  }

  /**
   * Queue workflow for asynchronous execution
   * @param {string} workflowId - Workflow ID
   * @param {Object} workflowDef - Workflow definition
   * @param {Object} triggerData - Data triggering workflow
   * @param {Object} executionContext - User/auth context
   * @returns {Promise<Object>} Queue job info
   */
  async executeAsync(workflowId, workflowDef, triggerData, executionContext) {
    logger.debug(`[WorkflowExecutor] Queuing async workflow: ${workflowId}`);

    if (!this.queueManager) {
      logger.warn('[WorkflowExecutor] QueueManager not configured, executing sync instead');
      return this.executeSync(workflowDef, triggerData, executionContext);
    }

    try {
      const job = await this.queueManager.enqueueJob('workflows', {
        workflowId,
        workflowDef,
        triggerData,
        executionContext,
      });

      return { queued: true, jobId: job.id };
    } catch (error) {
      logger.error('[WorkflowExecutor] Failed to queue workflow:', error.message);
      return { queued: false, error: error.message };
    }
  }

  /**
   * Execute a single step
   * @private
   * @param {WorkflowStep} step - Step definition
   * @param {StepExecutionContext} context - Execution context
   * @returns {Promise<Object>} { success, data, error }
   */
  async executeStep(step, context) {
    try {
      const Runner = this.stepRunners.get(step.type);

      if (!Runner) {
        return {
          success: false,
          error: `Unknown step type: ${step.type}`,
        };
      }

      const runner = new Runner(step.config, this);
      const result = await runner.execute(context);

      logger.debug(`[WorkflowExecutor] Step ${step.id} executed: ${step.type}`);

      return {
        success: result.success !== false,
        data: result.data || null,
        error: result.error || null,
      };
    } catch (error) {
      logger.error(`[WorkflowExecutor] Step execution error:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Register a custom step runner
   * @param {string} stepType - Step type name (e.g., 'send_email')
   * @param {Function} RunnerClass - Runner class constructor
   */
  registerRunner(stepType, RunnerClass) {
    this.stepRunners.set(stepType, RunnerClass);
    logger.debug(`[WorkflowExecutor] Registered step runner: ${stepType}`);
  }

  /**
   * Create a new WorkflowExecutor
   * @static
   * @param {Object} config - Configuration
   * @returns {WorkflowExecutor}
   */
  static create(config) {
    return new WorkflowExecutor(config);
  }
}

export default WorkflowExecutor;
