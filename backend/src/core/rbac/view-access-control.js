/**
 * @fileoverview Role-Based View Access Control
 * Controls which views and view types users can access based on roles and permissions
 */

import logger from '../services/logger.js';

/**
 * @typedef {Object} ViewAccessPolicy
 * @property {string} viewId - View ID
 * @property {string} entity - Entity slug
 * @property {string[]} allowedRoles - Roles that can access
 * @property {string} [abacRule] - ABAC condition for access
 * @property {string[]} [allowedFields] - Fields visible in view
 * @property {boolean} [canCreate] - Can create records
 * @property {boolean} [canRead] - Can read records
 * @property {boolean} [canUpdate] - Can update records
 * @property {boolean} [canDelete] - Can delete records
 * @property {Object} [fieldRestrictions] - Per-field access { fieldName: { read, write, operators } }
 * @property {Object} [filterOverrides] - Auto-apply filters { field: value }
 */

class ViewAccessControl {
  constructor() {
    this.policies = new Map(); // viewId -> ViewAccessPolicy
    this.roleHierarchy = new Map(); // role -> parentRoles
    this.viewTypePermissions = new Map(); // viewType -> { roles, permissions }
  }

  /**
   * Define view access policy
   * @param {string} viewId - View ID
   * @param {Partial<ViewAccessPolicy>} policy - Policy definition
   */
  defineViewPolicy(viewId, policy) {
    if (this.policies.has(viewId)) {
      throw new Error(`Policy already exists for view: ${viewId}`);
    }

    const fullPolicy = {
      viewId,
      entity: policy.entity,
      allowedRoles: policy.allowedRoles || [],
      abacRule: policy.abacRule || null,
      allowedFields: policy.allowedFields || [],
      canCreate: policy.canCreate !== false,
      canRead: policy.canRead !== false,
      canUpdate: policy.canUpdate !== false,
      canDelete: policy.canDelete !== false,
      fieldRestrictions: policy.fieldRestrictions || {},
      filterOverrides: policy.filterOverrides || {},
      createdAt: new Date(),
    };

    this.policies.set(viewId, fullPolicy);
    logger.info(`[ViewAccessControl] Policy defined for view: ${viewId}`);
  }

  /**
   * Get view access policy
   * @param {string} viewId - View ID
   * @returns {ViewAccessPolicy|null}
   */
  getPolicy(viewId) {
    return this.policies.get(viewId) || null;
  }

  /**
   * Define role hierarchy for inheritance
   * @param {string} role - Role name
   * @param {string[]} inheritsFrom - Parent roles
   */
  defineRoleHierarchy(role, inheritsFrom = []) {
    this.roleHierarchy.set(role, inheritsFrom);
  }

  /**
   * Get all roles a user effectively has (including inherited)
   * @param {string} userRole - User's primary role
   * @returns {Set<string>}
   */
  getEffectiveRoles(userRole) {
    const roles = new Set();
    const queue = [userRole];

    while (queue.length > 0) {
      const role = queue.shift();
      if (roles.has(role)) continue;

      roles.add(role);

      const parents = this.roleHierarchy.get(role) || [];
      queue.push(...parents);
    }

    return roles;
  }

  /**
   * Check if user can access view
   * @param {string} viewId - View ID
   * @param {Object} context - Execution context { user, role, permissions }
   * @returns {boolean}
   */
  canAccessView(viewId, context) {
    const policy = this.getPolicy(viewId);
    if (!policy) return true; // No policy = everyone can access

    const userRoles = this.getEffectiveRoles(context.role);

    // Check role-based access
    const hasRole = policy.allowedRoles.length === 0 ||
                    policy.allowedRoles.some(role => userRoles.has(role));

    if (!hasRole) return false;

    // Check ABAC rule if present
    if (policy.abacRule) {
      // ABAC evaluation would be delegated to expression evaluator
      // For now, just check if rule exists and assume it's been verified
      return true;
    }

    return true;
  }

  /**
   * Get visible fields for user in view
   * @param {string} viewId - View ID
   * @param {string[]} allFields - All available fields
   * @param {Object} context - Execution context
   * @returns {string[]}
   */
  getVisibleFields(viewId, allFields, context) {
    const policy = this.getPolicy(viewId);
    if (!policy) return allFields;

    // If allowedFields specified, use that whitelist
    if (policy.allowedFields.length > 0) {
      return allFields.filter(field => policy.allowedFields.includes(field));
    }

    // Filter out fields with explicit restrictions
    return allFields.filter(field => {
      const restriction = policy.fieldRestrictions[field];
      if (!restriction) return true;
      return restriction.read !== false;
    });
  }

  /**
   * Check if user can perform action on view
   * @param {string} viewId - View ID
   * @param {string} action - 'create', 'read', 'update', 'delete'
   * @param {Object} context - Execution context
   * @returns {boolean}
   */
  canPerformAction(viewId, action, context) {
    const policy = this.getPolicy(viewId);
    if (!policy) return true;

    if (!this.canAccessView(viewId, context)) return false;

    const actionMap = {
      create: policy.canCreate,
      read: policy.canRead,
      update: policy.canUpdate,
      delete: policy.canDelete,
    };

    return actionMap[action] !== false;
  }

  /**
   * Get field-level restrictions
   * @param {string} viewId - View ID
   * @param {string} fieldName - Field name
   * @returns {Object|null}
   */
  getFieldRestriction(viewId, fieldName) {
    const policy = this.getPolicy(viewId);
    if (!policy) return null;

    return policy.fieldRestrictions[fieldName] || null;
  }

  /**
   * Check if user can read field value
   * @param {string} viewId - View ID
   * @param {string} fieldName - Field name
   * @param {Object} context - Execution context
   * @returns {boolean}
   */
  canReadField(viewId, fieldName, context) {
    const restriction = this.getFieldRestriction(viewId, fieldName);
    if (!restriction) return true;

    return restriction.read !== false;
  }

  /**
   * Check if user can write field value
   * @param {string} viewId - View ID
   * @param {string} fieldName - Field name
   * @param {Object} context - Execution context
   * @returns {boolean}
   */
  canWriteField(viewId, fieldName, context) {
    const restriction = this.getFieldRestriction(viewId, fieldName);
    if (!restriction) return true;

    return restriction.write !== false;
  }

  /**
   * Get allowed operators for field in view
   * @param {string} viewId - View ID
   * @param {string} fieldName - Field name
   * @returns {string[]|null}
   */
  getAllowedOperators(viewId, fieldName) {
    const restriction = this.getFieldRestriction(viewId, fieldName);
    if (!restriction) return null;

    return restriction.operators || null;
  }

  /**
   * Get filter overrides for user's view
   * @param {string} viewId - View ID
   * @param {Object} context - Execution context
   * @returns {Object}
   */
  getFilterOverrides(viewId, context) {
    const policy = this.getPolicy(viewId);
    if (!policy) return {};

    const filters = { ...policy.filterOverrides };

    // Could also inject user-specific filters here
    // e.g., if user is not manager, add { assignedTo: user.id }

    return filters;
  }

  /**
   * Define view type (Table, Form, Kanban, etc) access
   * @param {string} viewType - 'table', 'form', 'kanban', 'calendar', 'timeline'
   * @param {string[]} allowedRoles - Roles that can use this view type
   * @param {Object} [restrictions] - Additional restrictions
   */
  defineViewTypeAccess(viewType, allowedRoles, restrictions = {}) {
    this.viewTypePermissions.set(viewType, {
      viewType,
      allowedRoles,
      restrictions,
      createdAt: new Date(),
    });

    logger.info(`[ViewAccessControl] View type access defined: ${viewType}`);
  }

  /**
   * Check if user can use view type
   * @param {string} viewType - View type
   * @param {Object} context - Execution context
   * @returns {boolean}
   */
  canUseViewType(viewType, context) {
    const typeAccess = this.viewTypePermissions.get(viewType);
    if (!typeAccess) return true; // No restriction = everyone can use

    const userRoles = this.getEffectiveRoles(context.role);
    return typeAccess.allowedRoles.some(role => userRoles.has(role));
  }

  /**
   * List accessible views for user
   * @param {string} entity - Entity slug
   * @param {Object} context - Execution context
   * @returns {Object[]}
   */
  getAccessibleViews(entity, context) {
    const accessible = [];

    for (const [viewId, policy] of this.policies) {
      if (policy.entity !== entity) continue;

      if (this.canAccessView(viewId, context)) {
        accessible.push({
          viewId,
          entity: policy.entity,
          canCreate: this.canPerformAction(viewId, 'create', context),
          canRead: this.canPerformAction(viewId, 'read', context),
          canUpdate: this.canPerformAction(viewId, 'update', context),
          canDelete: this.canPerformAction(viewId, 'delete', context),
          visibleFields: policy.allowedFields,
        });
      }
    }

    return accessible;
  }

  /**
   * Create view customization for user role
   * @param {string} viewId - View ID
   * @param {string} role - Role name
   * @param {Object} customization - Custom config
   * @returns {Object}
   */
  customizeViewForRole(viewId, role, customization) {
    const policy = this.getPolicy(viewId);
    if (!policy) {
      throw new Error(`No policy found for view: ${viewId}`);
    }

    const customized = {
      viewId,
      role,
      basePolicy: policy,
      customization,
      hiddenFields: customization.hiddenFields || [],
      readOnlyFields: customization.readOnlyFields || [],
      defaultFilters: customization.defaultFilters || {},
      defaultSort: customization.defaultSort || null,
      createdAt: new Date(),
    };

    return customized;
  }

  /**
   * Get all policies for entity
   * @param {string} entity - Entity slug
   * @returns {Object[]}
   */
  getPoliciesForEntity(entity) {
    const policies = [];

    for (const [, policy] of this.policies) {
      if (policy.entity === entity) {
        policies.push(policy);
      }
    }

    return policies;
  }

  /**
   * Export all policies
   * @returns {Object}
   */
  exportPolicies() {
    return {
      policies: Array.from(this.policies.values()),
      roleHierarchy: Object.fromEntries(this.roleHierarchy),
      viewTypePermissions: Array.from(this.viewTypePermissions.values()),
    };
  }

  /**
   * Import policies
   * @param {Object} data - Exported data
   */
  importPolicies(data) {
    if (data.policies) {
      for (const policy of data.policies) {
        this.policies.set(policy.viewId, policy);
      }
    }

    if (data.roleHierarchy) {
      for (const [role, parents] of Object.entries(data.roleHierarchy)) {
        this.roleHierarchy.set(role, parents);
      }
    }

    if (data.viewTypePermissions) {
      for (const typeAccess of data.viewTypePermissions) {
        this.viewTypePermissions.set(typeAccess.viewType, typeAccess);
      }
    }

    logger.info('[ViewAccessControl] Policies imported');
  }

  /**
   * Get access control statistics
   * @returns {Object}
   */
  getStats() {
    return {
      totalPolicies: this.policies.size,
      totalRoles: this.roleHierarchy.size,
      viewTypePermissions: this.viewTypePermissions.size,
    };
  }

  /**
   * Clear all policies
   */
  clear() {
    this.policies.clear();
    this.roleHierarchy.clear();
    this.viewTypePermissions.clear();
    logger.info('[ViewAccessControl] All view access policies cleared');
  }
}

export default ViewAccessControl;
