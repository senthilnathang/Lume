/**
 * Core TypeScript Types and Interfaces for the Lume Workflow System
 * Defines the complete type system for event-driven workflows, triggers, actions, and execution
 */

// ============================================================================
// TYPE ALIASES
// ============================================================================

/**
 * Type of trigger that can initiate a workflow
 * - 'event': Triggered by specific events in the system
 * - 'time': Triggered on a schedule using cron expressions
 * - 'manual': Triggered manually by a user
 * - 'conditional': Triggered when conditions are met
 */
export type TriggerType = 'event' | 'time' | 'manual' | 'conditional';

/**
 * Status of a workflow execution instance
 * - 'pending': Workflow is waiting to be processed
 * - 'running': Workflow is currently executing
 * - 'success': Workflow completed successfully
 * - 'failed': Workflow execution failed
 * - 'paused': Workflow execution is paused
 * - 'cancelled': Workflow execution was cancelled
 */
export type WorkflowStatus = 'pending' | 'running' | 'success' | 'failed' | 'paused' | 'cancelled';

/**
 * Type of action that a workflow can execute
 * - 'create-entity': Create a new entity record
 * - 'update-entity': Update an existing entity record
 * - 'delete-entity': Delete an entity record
 * - 'send-notification': Send a notification to user(s)
 * - 'webhook': Call an external webhook
 * - 'custom': Execute custom business logic
 */
export type ActionType = 'create-entity' | 'update-entity' | 'delete-entity' | 'send-notification' | 'webhook' | 'custom';

/**
 * Status of a queued job in the async execution queue
 * - 'queued': Job is waiting to be processed
 * - 'running': Job is currently executing
 * - 'completed': Job completed successfully
 * - 'failed': Job execution failed
 * - 'retry': Job is scheduled for retry
 */
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'retry';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Condition evaluated to determine if a trigger should fire
 * Used in event triggers and conditional triggers
 */
export interface TriggerCondition {
  /** Name of the field to evaluate */
  field: string;

  /** Comparison operator to use */
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'in' | 'contains';

  /** Value to compare against */
  value: unknown;
}

/**
 * Event-based trigger that fires when specific events occur
 * Supports event wildcards (e.g., "order:*" matches "order:created", "order:updated")
 */
export interface EventTrigger {
  /** Fixed value indicating this is an event trigger */
  type: 'event';

  /** Event name to match (supports wildcards with *) */
  event: string;

  /** Optional conditions that must all be met for trigger to fire */
  conditions?: TriggerCondition[];

  /** Optional delay in seconds before workflow executes after event */
  delaySeconds?: number;
}

/**
 * Time-based trigger using cron expressions
 * Fires on a schedule defined by a cron expression
 */
export interface TimeTrigger {
  /** Fixed value indicating this is a time trigger */
  type: 'time';

  /** Cron expression (e.g., "0 9 * * 1-5" for 9 AM weekdays) */
  cron: string;

  /** Timezone for cron evaluation (e.g., "America/New_York") */
  timezone?: string;
}

/**
 * Manual trigger initiated by a user
 * Allows workflows to be triggered on-demand through the UI
 */
export interface ManualTrigger {
  /** Fixed value indicating this is a manual trigger */
  type: 'manual';

  /** Optional label for UI display (e.g., "Process Now") */
  label?: string;
}

/**
 * Conditional trigger that fires when conditions are met
 * Periodically evaluates conditions and fires when all are satisfied
 */
export interface ConditionalTrigger {
  /** Fixed value indicating this is a conditional trigger */
  type: 'conditional';

  /** Conditions that must all be true to trigger workflow */
  conditions: TriggerCondition[];

  /** How often to check conditions in seconds (default 300) */
  checkInterval?: number;
}

/**
 * Union type of all possible trigger types
 * Used as parameter type for functions that accept any trigger
 */
export type WorkflowTrigger = EventTrigger | TimeTrigger | ManualTrigger | ConditionalTrigger;

/**
 * Result of evaluating a trigger against data
 * Indicates whether the trigger matched and provides diagnostic info
 */
export interface TriggerResult {
  /** Whether the trigger was activated */
  triggered: boolean;

  /** Names of conditions that matched (if applicable) */
  matchedConditions?: string[];

  /** Human-readable explanation of why trigger fired or didn't fire */
  reason?: string;

  /** Additional data from trigger evaluation */
  metadata?: Record<string, unknown>;
}

/**
 * Action to be executed as part of a workflow
 * Defines what happens when a workflow is triggered
 */
export interface WorkflowAction {
  /** Unique identifier for this action within the workflow */
  id: string;

  /** Type of action to execute */
  type: ActionType;

  /** Target entity or service for the action (e.g., "ticket", "slack") */
  target?: string;

  /** Action configuration and parameters */
  payload: Record<string, unknown>;

  /** Whether to execute this action asynchronously */
  async?: boolean;

  /** Maximum number of retries if action fails */
  retryCount?: number;

  /** Timeout in seconds for action execution */
  timeout?: number;

  /** IDs of actions that must complete before this one executes */
  dependsOn?: string[];

  /** What to do if this action fails: 'continue' to proceed, 'stop' to abort workflow */
  onError?: 'continue' | 'stop';
}

/**
 * Complete workflow definition
 * Defines when a workflow executes and what it does
 */
export interface WorkflowDef {
  /** Unique identifier for the workflow */
  id: string;

  /** Human-readable name of the workflow */
  name: string;

  /** Detailed description of what the workflow does */
  description?: string;

  /** Triggers that can initiate this workflow */
  triggers: WorkflowTrigger[];

  /** Actions to execute when workflow is triggered */
  actions: WorkflowAction[];

  /** Optional workflow execution stages/phases */
  stages?: string[];

  /** Whether this workflow is currently active */
  enabled: boolean;

  /** Semantic version of the workflow definition */
  version: number;

  /** Timestamp when workflow was created */
  created_at?: Date;

  /** Timestamp when workflow was last updated */
  updated_at?: Date;

  /** Additional metadata about the workflow */
  metadata?: Record<string, unknown>;
}

/**
 * Execution instance of a workflow
 * Tracks the state and results of a single workflow execution
 */
export interface WorkflowInstance {
  /** Unique identifier for this execution instance */
  id: string;

  /** ID of the workflow definition being executed */
  workflowId: string;

  /** Current status of the execution */
  status: WorkflowStatus;

  /** What triggered this workflow ('event', 'time', 'manual', etc.) */
  triggeredBy: string;

  /** Optional ID of the specific trigger that fired */
  triggerId?: string;

  /** Timestamp when execution started */
  startedAt: Date;

  /** Timestamp when execution completed (if finished) */
  completedAt?: Date;

  /** Final result/output from the workflow */
  result?: Record<string, unknown>;

  /** Error message if workflow failed */
  error?: string;

  /** Map of action IDs to their execution results */
  actionResults: Map<string, unknown>;
}

/**
 * Job in the async execution queue
 * Represents a single action or subtask queued for execution
 */
export interface WorkflowJob {
  /** Unique identifier for this job */
  id: string;

  /** ID of the workflow this job belongs to */
  workflowId: string;

  /** ID of the workflow instance executing this job */
  instanceId: string;

  /** ID of the action this job executes */
  actionId: string;

  /** Current status of the job */
  status: JobStatus;

  /** Input data for the job */
  payload: Record<string, unknown>;

  /** Result/output from completed job */
  result?: unknown;

  /** Error message if job failed */
  error?: string;

  /** Number of times this job has been retried */
  retries: number;

  /** Timestamp when job was created */
  createdAt: Date;

  /** Timestamp when job execution started */
  startedAt?: Date;

  /** Timestamp when job execution completed */
  completedAt?: Date;
}

/**
 * Lifecycle event emitted by the workflow engine
 * Allows external systems to react to workflow state changes
 */
export interface WorkflowEvent {
  /** Type of lifecycle event that occurred */
  event:
    | 'workflow:triggered'
    | 'workflow:started'
    | 'workflow:action:started'
    | 'workflow:action:completed'
    | 'workflow:completed'
    | 'workflow:failed'
    | 'workflow:paused';

  /** ID of the workflow involved */
  workflowId: string;

  /** ID of the workflow instance involved */
  instanceId: string;

  /** ISO 8601 timestamp when the event occurred */
  timestamp: Date;

  /** Additional context about the event */
  metadata?: Record<string, unknown>;
}

/**
 * Interface for the workflow execution engine
 * Main API for registering, managing, and executing workflows
 */
export interface IWorkflowEngine {
  /**
   * Register a new workflow definition
   * @param workflow The workflow definition to register
   */
  registerWorkflow(workflow: WorkflowDef): void;

  /**
   * Get a workflow definition by ID
   * @param workflowId The workflow ID to retrieve
   * @returns The workflow definition or undefined if not found
   */
  getWorkflow(workflowId: string): WorkflowDef | undefined;

  /**
   * Get all registered workflows
   * @param enabled Optional filter to get only enabled workflows
   * @returns Array of workflow definitions
   */
  listWorkflows(enabled?: boolean): WorkflowDef[];

  /**
   * Execute a workflow immediately
   * @param workflowId ID of the workflow to execute
   * @param triggerData Optional data passed to the workflow
   * @returns The workflow execution instance
   */
  executeWorkflow(workflowId: string, triggerData?: Record<string, unknown>): Promise<WorkflowInstance>;

  /**
   * Get a specific workflow execution instance
   * @param instanceId The instance ID to retrieve
   * @returns The workflow instance or undefined if not found
   */
  getInstance(instanceId: string): WorkflowInstance | undefined;

  /**
   * Enable a workflow so it can be triggered
   * @param workflowId The workflow ID to enable
   */
  enableWorkflow(workflowId: string): void;

  /**
   * Disable a workflow so it cannot be triggered
   * @param workflowId The workflow ID to disable
   */
  disableWorkflow(workflowId: string): void;

  /**
   * Evaluate whether a trigger matches the given data
   * @param trigger The trigger to evaluate
   * @param data The data to evaluate against
   * @returns The trigger evaluation result
   */
  evaluateTrigger(trigger: WorkflowTrigger, data: Record<string, unknown>): TriggerResult;
}
