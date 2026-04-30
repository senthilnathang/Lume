/**
 * Core TypeScript Interfaces and Types for the Lume Unified Runtime
 * Defines the complete type system for entities, workflows, views, policies, and events
 */

/**
 * Execution context containing user, security, and request information
 * Passed through the runtime to provide context for all operations
 */
export interface ExecutionContext {
  /** Unique identifier of the user executing the operation */
  userId: string;

  /** User's role (admin, super_admin, viewer, editor, etc.) */
  role: string;

  /** Array of permission identifiers granted to the user */
  permissions: string[];

  /** Unique identifier for the current request */
  requestId: string;

  /** Domain/tenant identifier for multi-tenancy support */
  domain: string;

  /** ISO 8601 timestamp of when the operation started */
  timestamp: string;

  /** Optional metadata specific to the request */
  metadata?: Record<string, unknown>;

  /** Optional correlation ID for tracing across services */
  correlationId?: string;
}

/**
 * Field definition for entity properties
 * Defines the structure, validation, and presentation of entity attributes
 */
export interface EntityField {
  /** Unique field name within the entity */
  name: string;

  /** Data type of the field */
  type:
    | 'string'
    | 'text'
    | 'number'
    | 'integer'
    | 'boolean'
    | 'date'
    | 'datetime'
    | 'json'
    | 'reference'
    | 'attachment';

  /** Whether the field is required to have a value */
  required: boolean;

  /** Whether the field cannot be modified after creation */
  readonly: boolean;

  /** Human-readable label for UI display */
  label?: string;

  /** Detailed description of the field's purpose */
  description?: string;

  /** Default value to use if none is provided */
  default?: unknown;

  /** Array of valid options for select/dropdown fields */
  options?: Array<{ label: string; value: unknown }>;

  /** Validation rules and patterns for the field */
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    custom?: (value: unknown) => boolean | string;
  };

  /** Name of the entity this field belongs to */
  entityName: string;
}

/**
 * Lifecycle hooks for entity operations
 * Allows custom logic to execute at various stages of CRUD operations
 */
export interface EntityHooks {
  /** Called before creating a new record */
  beforeCreate?: (context: ExecutionContext, data: Record<string, unknown>) => Promise<Record<string, unknown>>;

  /** Called after successfully creating a record */
  afterCreate?: (context: ExecutionContext, record: Record<string, unknown>) => Promise<void>;

  /** Called before updating an existing record */
  beforeUpdate?: (
    context: ExecutionContext,
    data: Record<string, unknown>,
    oldRecord: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;

  /** Called after successfully updating a record */
  afterUpdate?: (
    context: ExecutionContext,
    record: Record<string, unknown>,
    oldRecord: Record<string, unknown>,
  ) => Promise<void>;

  /** Called before deleting a record */
  beforeDelete?: (context: ExecutionContext, record: Record<string, unknown>) => Promise<boolean>;

  /** Called after successfully deleting a record */
  afterDelete?: (context: ExecutionContext, record: Record<string, unknown>) => Promise<void>;
}

/**
 * Entity definition combining structure, behavior, and access control
 * Represents a complete entity type in the runtime system
 */
export interface EntityDef {
  /** Unique identifier for the entity type */
  name: string;

  /** Human-readable name for the entity (used in UI) */
  displayName: string;

  /** Name of the database table backing this entity */
  tableName: string;

  /** Array of field definitions for the entity */
  fields: EntityField[];

  /** Arbitrary metadata attached to the entity */
  metadata?: Record<string, unknown>;

  /** Lifecycle hooks for the entity operations */
  hooks?: EntityHooks;

  /** Array of permission identifiers required to access this entity */
  permissions: string[];
}

/**
 * Runtime event representing a significant change in the system
 * Events are emitted by the runtime and can trigger workflows
 */
export interface RuntimeEvent {
  /** Unique identifier for this event */
  id: string;

  /** Type of event that occurred */
  type: 'entity.created' | 'entity.updated' | 'entity.deleted' | 'workflow.triggered' | 'policy.evaluated' | string;

  /** Name of the entity that triggered the event */
  entityName: string;

  /** Action that triggered the event (create, update, delete) */
  action: 'create' | 'update' | 'delete' | string;

  /** ID of the record affected by the event */
  recordId: string;

  /** Current state of the data after the event */
  data: Record<string, unknown>;

  /** Previous state of the data before the event (null for create) */
  previousData?: Record<string, unknown> | null;

  /** Execution context in which the event occurred */
  context: ExecutionContext;

  /** ISO 8601 timestamp when the event occurred */
  timestamp: string;

  /** Optional ID to correlate related events */
  correlationId?: string;
}

/**
 * Workflow definition combining triggers, filters, and handlers
 * Workflows are automated processes triggered by events
 */
export interface WorkflowDef {
  /** Unique identifier for the workflow */
  name: string;

  /** Array of event types that trigger this workflow */
  triggers: string[];

  /** Optional filter to match specific events */
  filter?: {
    entityName?: string;
    action?: string;
    [key: string]: unknown;
  };

  /** Async function that processes the event */
  handler: (event: RuntimeEvent, context: ExecutionContext) => Promise<Record<string, unknown>>;

  /** Whether the workflow is currently active */
  active: boolean;
}

/**
 * View definition for entity data presentation
 * Defines how entity data is displayed and interacted with
 */
export interface ViewDef {
  /** Unique identifier for the view */
  name: string;

  /** Entity this view displays */
  entityName: string;

  /** Type of view for rendering */
  type: 'table' | 'grid' | 'card' | 'form' | 'kanban' | 'calendar' | 'timeline' | string;

  /** Template name or identifier for rendering */
  template: string;

  /** View-specific configuration */
  config: Record<string, unknown>;
}

/**
 * Condition for policy evaluation
 * Used to evaluate policies at runtime
 */
export interface PolicyCondition {
  /** Type of condition being evaluated */
  type: 'field' | 'expression' | 'time' | 'role' | string;

  /** Operator to use for evaluation */
  operator:
    | 'equals'
    | 'notEquals'
    | 'greaterThan'
    | 'lessThan'
    | 'in'
    | 'notIn'
    | 'contains'
    | 'startsWith'
    | string;

  /** Value to compare or match against */
  value: unknown;

  /** Optional expression for complex conditions */
  expression?: string;
}

/**
 * Policy rule granting or denying access
 * Rules are evaluated to determine access control
 */
export interface PolicyRule {
  /** Whether this rule allows or denies access */
  effect: 'allow' | 'deny';

  /** Resource affected by this rule (entity name or wildcard) */
  resource: string;

  /** Action being controlled (read, write, delete, etc.) */
  action: string;

  /** Optional condition for conditional access */
  condition?: PolicyCondition;
}

/**
 * Complete policy definition
 * Policies are collections of rules for access control
 */
export interface PolicyDef {
  /** Unique identifier for the policy */
  id: string;

  /** Human-readable name for the policy */
  name: string;

  /** Detailed description of the policy's purpose */
  description: string;

  /** Array of rules that make up this policy */
  rules: PolicyRule[];
}

/**
 * Result of a permission check
 * Indicates whether an operation is allowed and why
 */
export interface PermissionResult {
  /** Whether the permission is granted */
  allowed: boolean;

  /** Reason for the permission decision */
  reason: string;

  /** Array of reasons if the permission was denied */
  denialReasons: string[];
}

/**
 * Result of an executed operation
 * Returned after running create, update, or delete operations
 */
export interface ExecutionResult {
  /** Whether the operation completed successfully */
  success: boolean;

  /** ID of the affected record (null on error) */
  recordId?: string | null;

  /** Data returned from the operation */
  data?: Record<string, unknown> | null;

  /** Error information if operation failed */
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } | null;

  /** Time taken to execute the operation in milliseconds */
  executionTime: number;
}

/**
 * Interface for the runtime registry
 * Manages registration and retrieval of all runtime components
 */
export interface RuntimeRegistry {
  // Entity operations
  /**
   * Get an entity definition by name
   * @param name The entity name
   * @returns The entity definition or undefined
   */
  getEntity(name: string): EntityDef | undefined;

  /**
   * Register an entity definition
   * @param def The entity definition
   * @returns True if successfully registered
   */
  registerEntity(def: EntityDef): boolean;

  /**
   * Check if an entity is registered
   * @param name The entity name
   * @returns True if the entity exists
   */
  hasEntity(name: string): boolean;

  /**
   * Get all registered entities
   * @returns Array of entity definitions
   */
  listEntities(): EntityDef[];

  // Workflow operations
  /**
   * Get a workflow definition by name
   * @param name The workflow name
   * @returns The workflow definition or undefined
   */
  getWorkflow(name: string): WorkflowDef | undefined;

  /**
   * Register a workflow definition
   * @param def The workflow definition
   * @returns True if successfully registered
   */
  registerWorkflow(def: WorkflowDef): boolean;

  /**
   * Check if a workflow is registered
   * @param name The workflow name
   * @returns True if the workflow exists
   */
  hasWorkflow(name: string): boolean;

  /**
   * Get all registered workflows
   * @returns Array of workflow definitions
   */
  listWorkflows(): WorkflowDef[];

  // View operations
  /**
   * Get a view definition by name
   * @param name The view name
   * @returns The view definition or undefined
   */
  getView(name: string): ViewDef | undefined;

  /**
   * Register a view definition
   * @param def The view definition
   * @returns True if successfully registered
   */
  registerView(def: ViewDef): boolean;

  /**
   * Check if a view is registered
   * @param name The view name
   * @returns True if the view exists
   */
  hasView(name: string): boolean;

  /**
   * Get all registered views
   * @returns Array of view definitions
   */
  listViews(): ViewDef[];

  // Policy operations
  /**
   * Get a policy definition by ID
   * @param id The policy ID
   * @returns The policy definition or undefined
   */
  getPolicy(id: string): PolicyDef | undefined;

  /**
   * Register a policy definition
   * @param def The policy definition
   * @returns True if successfully registered
   */
  registerPolicy(def: PolicyDef): boolean;

  /**
   * Get all registered policies
   * @returns Array of policy definitions
   */
  listPolicies(): PolicyDef[];
}

/**
 * Interface for the event bus
 * Manages event subscriptions and emissions
 */
export interface EventBusInterface {
  /**
   * Subscribe to events of a specific type
   * @param eventType The type of events to listen for
   * @param handler Callback function when matching events occur
   */
  on(eventType: string, handler: (event: RuntimeEvent) => Promise<void> | void): void;

  /**
   * Unsubscribe from events of a specific type
   * @param eventType The type of events to stop listening for
   * @param handler The handler function to remove
   */
  off(eventType: string, handler: (event: RuntimeEvent) => Promise<void> | void): void;

  /**
   * Emit an event to all subscribers
   * @param event The event to emit
   */
  emit(event: RuntimeEvent): Promise<void>;
}

/**
 * Module manifest defining a complete module
 * Contains all definitions for entities, workflows, views, and policies
 */
export interface ModuleManifest {
  /** Unique module identifier */
  name: string;

  /** Semantic version of the module */
  version: string;

  /** Human-readable description of the module */
  description: string;

  /** Array of module names this module depends on */
  depends: string[];

  /** Entity definitions provided by this module */
  entities: EntityDef[];

  /** Workflow definitions provided by this module */
  workflows: WorkflowDef[];

  /** View definitions provided by this module */
  views: ViewDef[];

  /** Policy definitions provided by this module */
  policies: PolicyDef[];
}
