/**
 * @typedef {Object} PermissionContext
 * @property {string} userId - The ID of the user requesting access
 * @property {string} userRole - The primary role of the user
 * @property {Object} userAttributes - Additional user attributes for attribute-based conditions
 * @property {string} resource - The resource being accessed (e.g., 'ticket', 'document')
 * @property {string} action - The action being performed (e.g., 'read', 'write', 'delete')
 */

/**
 * @typedef {Object} RoleCondition
 * @property {'role'} type - The condition type
 * @property {string[]} roles - List of allowed roles
 */

/**
 * @typedef {Object} OwnershipCondition
 * @property {'ownership'} type - The condition type
 * @property {string} ownerField - The field name containing the owner ID (e.g., 'createdById')
 */

/**
 * @typedef {Object} TimeCondition
 * @property {'time'} type - The condition type
 * @property {string} startTime - Start time in HH:MM format
 * @property {string} endTime - End time in HH:MM format
 * @property {number[]} daysOfWeek - Array of day numbers (0=Sunday, 6=Saturday)
 */

/**
 * @typedef {Object} AttributeCondition
 * @property {'attribute'} type - The condition type
 * @property {string} field - The attribute field to check
 * @property {'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith'} operator - Comparison operator
 * @property {any} value - The value to compare against
 */

/**
 * @typedef {Object} ExpressionCondition
 * @property {'expression'} type - The condition type
 * @property {string} expression - Safe JavaScript expression to evaluate
 */

/**
 * @typedef {RoleCondition | OwnershipCondition | TimeCondition | AttributeCondition | ExpressionCondition} PermissionCondition
 */

/**
 * @typedef {Object} PermissionRule
 * @property {string} id - Unique identifier for the rule
 * @property {'allow' | 'deny'} effect - Whether to allow or deny access
 * @property {string} resource - Resource pattern (e.g., 'ticket:*', 'document:123')
 * @property {string} action - Action pattern (e.g., 'read', 'write', '*')
 * @property {PermissionCondition[]} conditions - Conditions that must be satisfied
 * @property {number} [ttl] - Time-to-live in seconds for caching (optional)
 * @property {number} [priority] - Rule priority (higher number = higher priority, optional)
 */

/**
 * @typedef {Object} FieldPermission
 * @property {boolean} allowed - Whether access is allowed to this field
 * @property {string} [reason] - Reason why access was allowed/denied (optional)
 */

/**
 * @typedef {Object} PermissionResult
 * @property {boolean} allowed - Whether access is allowed
 * @property {string} reason - Reason for the decision
 * @property {Object.<string, FieldPermission>} fieldPermissions - Per-field permission results
 * @property {QueryFilter[]} queryFilters - Filters to apply to queries for data-level access control
 */

/**
 * @typedef {Object} QueryFilter
 * @property {string} field - Field name to filter
 * @property {'eq' | 'neq' | 'in' | 'nin' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'contains' | 'startsWith' | 'endsWith'} operator - Filter operator
 * @property {any} value - Filter value
 */

/**
 * @typedef {Object} IPermissionEngine
 * @property {Function} evaluate - Evaluate permission for a context
 * @property {Function} evaluateField - Evaluate permission for a specific field
 * @property {Function} getQueryFilters - Get query filters for data-level access control
 * @property {Function} registerPolicy - Register a new permission policy
 * @property {Function} getPolicy - Retrieve a registered policy
 */

export const PermissionContext = Symbol('PermissionContext');
export const PermissionCondition = Symbol('PermissionCondition');
export const PermissionRule = Symbol('PermissionRule');
export const PermissionResult = Symbol('PermissionResult');
export const QueryFilter = Symbol('QueryFilter');
export const IPermissionEngine = Symbol('IPermissionEngine');
export const RoleCondition = Symbol('RoleCondition');
export const OwnershipCondition = Symbol('OwnershipCondition');
export const TimeCondition = Symbol('TimeCondition');
export const AttributeCondition = Symbol('AttributeCondition');
export const ExpressionCondition = Symbol('ExpressionCondition');
export const FieldPermission = Symbol('FieldPermission');
