/**
 * @fileoverview Permissions Module - Central exports for all permission classes and decorators
 */

// Core classes
export { ConditionEvaluator } from './condition-evaluator.js';
export { PermissionEngine } from './permission-engine.js';
export { PermissionCache } from './cache.js';
export { QueryFilterBuilder } from './query-filter-builder.js';
export { SafeExpressionEvaluator } from './safe-evaluator.js';

// Decorators
export { CheckPermission, RequirePermission, SkipPermissionCheck } from './decorators.js';

// Types (exported as symbols for JSDoc reference)
export {
  PermissionContext,
  PermissionCondition,
  PermissionRule,
  PermissionResult,
  QueryFilter,
  IPermissionEngine,
  RoleCondition,
  OwnershipCondition,
  TimeCondition,
  AttributeCondition,
  ExpressionCondition,
  FieldPermission,
  PermissionPolicy,
  PermissionDecision,
  EvaluationResult,
  ConditionType,
  PermissionEffect,
  AttributeOperator,
  QueryOperator
} from './types.js';

export default {
  // Classes
  ConditionEvaluator: (await import('./condition-evaluator.js')).ConditionEvaluator,
  PermissionEngine: (await import('./permission-engine.js')).PermissionEngine,
  PermissionCache: (await import('./cache.js')).PermissionCache,
  QueryFilterBuilder: (await import('./query-filter-builder.js')).QueryFilterBuilder,
  SafeExpressionEvaluator: (await import('./safe-evaluator.js')).SafeExpressionEvaluator,

  // Decorators
  CheckPermission: (await import('./decorators.js')).CheckPermission,
  RequirePermission: (await import('./decorators.js')).RequirePermission,
  SkipPermissionCheck: (await import('./decorators.js')).SkipPermissionCheck
};
