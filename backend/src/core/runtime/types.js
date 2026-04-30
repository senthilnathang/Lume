/**
 * @fileoverview Core type definitions for the unified Lume runtime
 * All interfaces are defined as JSDoc @typedef for runtime-only type checking
 */

/**
 * @typedef {Object} ExecutionContext
 * @property {string} userId - User ID from JWT
 * @property {string} orgId - Organization ID
 * @property {string[]} roles - User roles (e.g., ['admin', 'user'])
 * @property {string[]} permissions - Flattened permission codes (e.g., ['ticket:create', 'ticket:read'])
 * @property {string} [locale] - User's locale (e.g., 'en-US')
 * @property {string} [timezone] - User's timezone (e.g., 'UTC')
 * @property {Object} [metadata] - Additional context data
 */

/**
 * @typedef {Object} OperationRequest
 * @property {ExecutionContext} context - User execution context
 * @property {string} entity - Entity slug (e.g., 'ticket', 'user')
 * @property {string} action - Action name (e.g., 'create', 'read', 'update', 'delete', 'list', 'bulk_create', 'search')
 * @property {Object} [data] - Request payload (for create/update actions)
 * @property {Object} [options] - Operation options
 * @property {boolean} [options.skipPermissions] - Skip permission checks (for internal operations)
 * @property {string[]} [options.includeRelations] - Relations to eager load
 * @property {'json'|'raw'} [options.returnFormat] - Return format (default: 'json')
 * @property {number} [options.limit] - Page size for list operations
 * @property {number} [options.offset] - Offset for pagination
 * @property {Object} [options.filters] - Filter conditions for list operations
 * @property {string} [options.search] - Full-text search query
 * @property {Object} [options.sort] - Sort specification { field, order: 'asc'|'desc' }
 */

/**
 * @typedef {Object} ValidationError
 * @property {string} [field] - Field name (if field-level error)
 * @property {string} message - Error message
 * @property {string} [code] - Error code (e.g., 'REQUIRED', 'INVALID_TYPE', 'UNIQUE_VIOLATION')
 */

/**
 * @typedef {Object} PermissionCheck
 * @property {string} check - Permission check description (e.g., 'ticket:create')
 * @property {boolean} allowed - Whether check passed
 * @property {string} [reason] - Reason if denied
 */

/**
 * @typedef {Object} OperationResult
 * @property {boolean} success - Operation succeeded
 * @property {*} [data] - Result data (record, array, or custom)
 * @property {ValidationError[]} [errors] - Validation/permission errors
 * @property {Object} [metadata] - Execution metadata
 * @property {string} [metadata.executedAt] - ISO timestamp when operation executed
 * @property {number} [metadata.duration] - Execution time in milliseconds
 * @property {PermissionCheck[]} [metadata.permissions] - Permission checks performed
 * @property {string[]} [metadata.interceptorsRun] - Names of interceptors that ran
 * @property {number} [metadata.rowsAffected] - For mutations, number of rows affected
 */

/**
 * @typedef {Object} FieldDefinition
 * @property {string} id - Unique field ID
 * @property {string} name - Field name (snake_case, DB column name)
 * @property {string} label - Display label
 * @property {'text'|'number'|'date'|'datetime'|'boolean'|'select'|'relation'|'rich-text'|'email'|'phone'|'url'|'color'|'multi-select'} type - Field type
 * @property {boolean} required - Field is required
 * @property {boolean} [unique] - Field value must be unique
 * @property {boolean} [indexed] - Create database index on this field
 * @property {*} [defaultValue] - Default value on create
 * @property {ValidationRule[]} [validation] - Validation rules
 * @property {boolean} [computed] - This is a computed/virtual field
 * @property {string} [computed_expression] - JavaScript expression to compute value (e.g., 'daysSince(createdAt)')
 * @property {Object} [config] - Field-specific config (for select: options, etc.)
 */

/**
 * @typedef {Object} ValidationRule
 * @property {string} rule - Rule name (e.g., 'required', 'min_length', 'max_length', 'enum', 'regex', 'email')
 * @property {*} [value] - Rule value (e.g., for min_length: 5)
 * @property {string} [message] - Custom error message
 */

/**
 * @typedef {Object} RelationDefinition
 * @property {string} name - Relation name (e.g., 'customer', 'comments')
 * @property {string} target - Target entity slug (e.g., 'customer', 'comment')
 * @property {'many-to-one'|'one-to-many'|'many-to-many'} type - Relation type
 * @property {boolean} [required] - Relation is required
 * @property {string} [foreignKey] - Foreign key field name (default: {name}_id)
 * @property {string} [throughTable] - For many-to-many, the join table name
 */

/**
 * @typedef {Object} PermissionPolicy
 * @property {string} resource - Resource name (e.g., 'ticket')
 * @property {string} action - Action name (e.g., 'create', 'read', 'update', 'delete')
 * @property {string} [rule] - ABAC rule expression (e.g., "user.role == 'manager'")
 * @property {'query'|'field'|'operation'} [scope] - Scope of permission
 * @property {Object} [fieldLevel] - Field-level permissions { fieldName: ruleExpression }
 * @property {boolean} [allow] - Default allow/deny (for simple RBAC)
 */

/**
 * @typedef {Object} AgentDefinition
 * @property {string} id - Unique agent ID (e.g., 'auto_escalate_ticket')
 * @property {string} trigger - Trigger expression (e.g., "status != 'closed' && daysOpen > 2")
 * @property {string} [schedule] - Cron schedule for scheduled agents (e.g., '0 */4 * * *')
 * @property {Object} action - Agent action
 * @property {'escalate'|'workflow'|'mutate'|'notify'} action.type - Action type
 * @property {Object} [action.updates] - Field updates for escalate action
 * @property {string} [action.workflowId] - Workflow to trigger for workflow action
 * @property {string|string[]} [action.notify] - Who to notify
 */

/**
 * @typedef {Object} ViewDefinition
 * @property {string} id - Unique view ID (e.g., 'table', 'kanban')
 * @property {'table'|'form'|'kanban'|'calendar'|'timeline'} type - View type
 * @property {string} label - Display label
 * @property {string[]} [columns] - Visible columns (for table view)
 * @property {string[]} [filters] - Filterable fields
 * @property {string} [groupBy] - Field to group by (for kanban/calendar)
 * @property {string} [dateField] - Date field for calendar/timeline
 * @property {Object} [defaultSort] - Default sort spec
 * @property {string} defaultSort.field - Field to sort by
 * @property {'asc'|'desc'} defaultSort.order - Sort direction
 * @property {Object} [config] - View-specific configuration
 */

/**
 * @typedef {Object} WorkflowStep
 * @property {string} id - Unique step ID
 * @property {'if'|'send_email'|'send_notification'|'workflow'|'mutate'|'wait'|'log'} type - Step type
 * @property {Object} [condition] - Condition for 'if' step
 * @property {Object} [config] - Step-specific config (email, notification details, etc.)
 * @property {string[]} [successSteps] - Next steps if successful
 * @property {string[]} [failureSteps] - Next steps if failed
 */

/**
 * @typedef {Object} WorkflowDefinition
 * @property {string} id - Unique workflow ID (e.g., 'ticket.notify_customer')
 * @property {string} trigger - Trigger event (e.g., 'onCreate', 'onUpdate', 'manual')
 * @property {string} name - Display name
 * @property {WorkflowStep[]} steps - Workflow steps
 * @property {Object} [errorHandler] - Error handling configuration
 * @property {'retry'|'skip'|'fail'} [errorHandler.type] - Error action
 * @property {number} [errorHandler.maxAttempts] - Max retry attempts
 * @property {number} [errorHandler.backoffMs] - Backoff time between retries
 * @property {'active'|'inactive'|'draft'} status - Workflow status (default: 'draft')
 */

/**
 * @typedef {Object} EntityDefinition
 * @property {string} id - Unique entity ID (auto-generated UUID if not provided)
 * @property {string} slug - Entity slug (e.g., 'ticket', 'user') - used in URLs
 * @property {string} name - Entity name
 * @property {string} label - Display label (e.g., 'Support Ticket')
 * @property {string} [description] - Entity description
 * @property {string} [icon] - Icon name (e.g., 'ticket', 'user')
 * @property {string} [color] - Primary color hex (e.g., '#2196F3')
 * @property {'prisma'|'drizzle'} orm - Which ORM to use
 * @property {string} tableName - Database table name
 * @property {FieldDefinition[]} fields - Entity fields
 * @property {RelationDefinition[]} [relations] - Entity relations
 * @property {Object} [hooks] - Lifecycle hooks
 * @property {Function[]} [hooks.beforeCreate] - Before create hooks
 * @property {Function[]} [hooks.afterCreate] - After create hooks
 * @property {Function[]} [hooks.beforeUpdate] - Before update hooks
 * @property {Function[]} [hooks.afterUpdate] - After update hooks
 * @property {Function[]} [hooks.beforeDelete] - Before delete hooks
 * @property {Function[]} [hooks.afterDelete] - After delete hooks
 * @property {Object} [workflows] - Workflows triggered by entity events
 * @property {string[]} [workflows.onCreate] - Workflows to trigger on create
 * @property {string[]} [workflows.onUpdate] - Workflows to trigger on update
 * @property {string[]} [workflows.onDelete] - Workflows to trigger on delete
 * @property {AgentDefinition[]} [agents] - Reactive agents
 * @property {PermissionPolicy[]} [permissions] - Permission policies
 * @property {ViewDefinition[]} [views] - Available views
 * @property {boolean} [softDelete] - Use soft delete (add deleted_at column)
 * @property {boolean} [auditable] - Enable audit logging
 */

/**
 * @typedef {Object} Interceptor
 * @property {string} name - Interceptor name (e.g., 'auth', 'permission')
 * @property {number} order - Execution order (10-80, increments of 10)
 * @property {boolean} enabled - Whether interceptor is active
 * @property {Function} process - Async process(request, context) -> Promise<InterceptorResult>
 */

/**
 * @typedef {Object} InterceptorContext
 * @property {OperationRequest} request - Current request
 * @property {ExecutionContext} executionContext - User context
 * @property {EntityDefinition} entity - Entity definition
 * @property {Object} state - Shared state across interceptors
 * @property {string[]} interceptorsRun - Names of interceptors executed so far
 * @property {PermissionCheck[]} permissionChecks - Permission checks performed
 * @property {*} [result] - Result from previous stages
 */

/**
 * @typedef {Object} InterceptorResult
 * @property {boolean} abort - Whether to abort execution
 * @property {string} [abortReason] - Reason for abort
 * @property {*} [result] - Modified result to pass to next stage
 * @property {Object} [stateUpdate] - State updates to merge
 * @property {PermissionCheck[]} [permissionChecks] - Permission checks from this stage
 */

export {
  // ExecutionContext is not exported; used internally
};
