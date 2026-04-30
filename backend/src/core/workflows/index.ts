/**
 * Lume Workflow System - Complete Module Exports
 *
 * Exports all classes, interfaces, and types for the unified workflow system.
 * This is the main entry point for workflow functionality.
 *
 * @module @lume/workflows
 */

// ============================================================================
// CLASS EXPORTS
// ============================================================================

export { TriggerEvaluator } from './trigger-evaluator.js';
export { ActionExecutor } from './action-executor.js';
export { WorkflowStateMachine } from './state-machine.js';
export { default as WorkflowJobQueue } from './job-queue.js';
export { WorkflowEngine } from './workflow-engine.js';

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Type aliases
export type {
  TriggerType,
  WorkflowStatus,
  ActionType,
  JobStatus
} from './types.js';

// Interface exports
export type {
  TriggerCondition,
  EventTrigger,
  TimeTrigger,
  ManualTrigger,
  ConditionalTrigger,
  WorkflowTrigger,
  TriggerResult,
  WorkflowAction,
  WorkflowDef,
  WorkflowInstance,
  WorkflowJob,
  WorkflowEvent,
  IWorkflowEngine
} from './types.js';
