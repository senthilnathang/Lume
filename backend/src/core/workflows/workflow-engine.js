/**
 * Workflow Engine - Orchestrates the complete workflow execution lifecycle
 * Integrates TriggerEvaluator, ActionExecutor, WorkflowStateMachine, and WorkflowJobQueue
 *
 * Responsibilities:
 * - Register and manage workflow definitions
 * - Execute workflows with proper state transitions
 * - Track workflow instances and results
 * - Enable/disable workflows
 * - Delegate to specialized components for trigger evaluation and action execution
 */

import { TriggerEvaluator } from './trigger-evaluator.js';
import { ActionExecutor } from './action-executor.js';
import { WorkflowStateMachine } from './state-machine.js';
import WorkflowJobQueue from './job-queue.js';

/**
 * WorkflowEngine - Main orchestrator for workflow execution
 * Implements IWorkflowEngine interface from types.ts
 *
 * @class WorkflowEngine
 * @example
 * const engine = new WorkflowEngine(entityStore);
 * engine.registerWorkflow(myWorkflow);
 * const instance = await engine.executeWorkflow('workflow-id');
 */
export class WorkflowEngine {
  /**
   * Initialize the WorkflowEngine with all required components
   *
   * @param {any} entityStore - Service for entity CRUD operations (optional)
   */
  constructor(entityStore) {
    /**
     * Map of registered workflows indexed by workflow ID
     * @type {Map<string, any>}
     * @private
     */
    this.workflows = new Map();

    /**
     * Map of workflow execution instances indexed by instance ID
     * @type {Map<string, any>}
     * @private
     */
    this.instances = new Map();

    /**
     * Evaluates workflow triggers against data
     * @type {TriggerEvaluator}
     * @private
     */
    this.triggerEvaluator = new TriggerEvaluator();

    /**
     * Executes workflow actions with timeout and retry support
     * @type {ActionExecutor}
     * @private
     */
    this.actionExecutor = new ActionExecutor(entityStore);

    /**
     * Manages valid state transitions for workflow instances
     * @type {WorkflowStateMachine}
     * @private
     */
    this.stateMachine = new WorkflowStateMachine();

    /**
     * FIFO queue for async job processing
     * @type {WorkflowJobQueue}
     * @private
     */
    this.jobQueue = new WorkflowJobQueue();

    /**
     * Counter for generating unique instance IDs
     * @type {number}
     * @private
     */
    this.instanceCounter = 0;
  }

  /**
   * Register a new workflow definition
   *
   * Stores the workflow in the workflows map so it can be executed later.
   * The workflow must have a unique ID.
   *
   * @param {any} workflow - The workflow definition to register
   * @throws {Error} if workflow is missing required fields
   * @public
   */
  registerWorkflow(workflow) {
    if (!workflow || !workflow.id) {
      throw new Error('Workflow must have an id');
    }

    this.workflows.set(workflow.id, workflow);
  }

  /**
   * Get a workflow definition by ID
   *
   * Retrieves a registered workflow definition from the workflows map.
   *
   * @param {string} workflowId - The workflow ID to retrieve
   * @returns {any|undefined} The workflow definition or undefined if not found
   * @public
   */
  getWorkflow(workflowId) {
    return this.workflows.get(workflowId);
  }

  /**
   * Get all registered workflows, optionally filtered by enabled status
   *
   * Returns an array of all registered workflows. If the enabled parameter is provided,
   * filters to only enabled (true) or disabled (false) workflows.
   *
   * @param {boolean} [enabled] - Optional filter for enabled status
   * @returns {Array<any>} Array of workflow definitions
   * @public
   */
  listWorkflows(enabled) {
    const workflows = Array.from(this.workflows.values());

    // If enabled filter is specified, apply it
    if (enabled !== undefined) {
      return workflows.filter(w => w.enabled === enabled);
    }

    return workflows;
  }

  /**
   * Execute a workflow immediately
   *
   * Orchestrates the complete workflow execution:
   * 1. Validates workflow exists and is enabled
   * 2. Creates workflow instance with initial state
   * 3. Transitions state from 'pending' to 'running'
   * 4. Executes all actions via ActionExecutor
   * 5. Evaluates results and transitions to final state
   * 6. Stores instance for later retrieval
   *
   * @param {string} workflowId - ID of the workflow to execute
   * @param {Record<string, any>} [triggerData] - Optional data passed to the workflow
   * @returns {Promise<any>} Promise resolving to the workflow instance with execution results
   * @throws {Error} if workflow not found or is disabled
   * @public
   */
  async executeWorkflow(workflowId, triggerData) {
    // Get the workflow definition
    const workflow = this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Validate workflow is enabled
    if (!workflow.enabled) {
      throw new Error('Workflow is disabled');
    }

    // Create workflow instance
    const instanceId = `inst-${++this.instanceCounter}`;
    const instance = {
      id: instanceId,
      workflowId,
      status: 'pending',
      triggeredBy: triggerData?.event ? 'event' : 'manual',
      triggerId: undefined,
      startedAt: new Date(),
      completedAt: undefined,
      result: undefined,
      error: undefined,
      actionResults: new Map()
    };

    // Transition to 'running' state
    instance.status = this.stateMachine.transition(instance.status, 'start');

    try {
      // Execute all actions
      const actionResults = await this.actionExecutor.executeAll(
        workflow.actions || [],
        instance,
        triggerData || {}
      );

      // Check if all actions succeeded
      const allSuccess = actionResults.every(result => result.success);

      if (allSuccess) {
        // Transition to 'success' state
        instance.status = this.stateMachine.transition(instance.status, 'complete');
      } else {
        // Transition to 'failed' state
        instance.status = this.stateMachine.transition(instance.status, 'fail');

        // Capture error from first failed action
        const firstFailure = actionResults.find(r => !r.success);
        if (firstFailure) {
          instance.error = firstFailure.error;
        }
      }
    } catch (error) {
      // If an exception occurs during execution, transition to failed
      instance.status = this.stateMachine.transition(instance.status, 'fail');
      instance.error = error instanceof Error ? error.message : String(error);
    }

    // Mark completion time
    instance.completedAt = new Date();

    // Store instance for later retrieval
    this.instances.set(instance.id, instance);

    return instance;
  }

  /**
   * Get a specific workflow execution instance
   *
   * Retrieves a previously executed workflow instance by ID.
   *
   * @param {string} instanceId - The instance ID to retrieve
   * @returns {any|undefined} The workflow instance or undefined if not found
   * @public
   */
  getInstance(instanceId) {
    return this.instances.get(instanceId);
  }

  /**
   * Enable a workflow so it can be triggered
   *
   * Sets the enabled flag to true on the specified workflow.
   * Workflows must be enabled to execute via executeWorkflow().
   *
   * @param {string} workflowId - The workflow ID to enable
   * @throws {Error} if workflow not found
   * @public
   */
  enableWorkflow(workflowId) {
    const workflow = this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    workflow.enabled = true;
  }

  /**
   * Disable a workflow so it cannot be triggered
   *
   * Sets the enabled flag to false on the specified workflow.
   * Disabled workflows will raise an error if executeWorkflow() is called.
   *
   * @param {string} workflowId - The workflow ID to disable
   * @throws {Error} if workflow not found
   * @public
   */
  disableWorkflow(workflowId) {
    const workflow = this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    workflow.enabled = false;
  }

  /**
   * Evaluate whether a trigger matches the given data
   *
   * Delegates to TriggerEvaluator to determine if a trigger should fire.
   * Supports event, time, manual, and conditional triggers.
   *
   * @param {any} trigger - The trigger to evaluate
   * @param {Record<string, any>} data - The data to evaluate against
   * @returns {any} The trigger evaluation result (TriggerResult interface)
   * @public
   */
  evaluateTrigger(trigger, data) {
    return this.triggerEvaluator.evaluate(trigger, data);
  }

  /**
   * Get the job queue instance for advanced use cases
   *
   * Returns a reference to the internal WorkflowJobQueue for direct access.
   * Used for custom job management and monitoring.
   *
   * @returns {WorkflowJobQueue} The job queue instance
   * @public
   */
  getJobQueue() {
    return this.jobQueue;
  }
}
