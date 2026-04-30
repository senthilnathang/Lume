/**
 * @fileoverview NestJS Permission Decorators
 * Decorators for declaring permission requirements on route handlers
 *
 * Stores metadata directly on function objects using WeakMap for internal tracking
 * Compatible with reflect-metadata if installed, falls back to direct property storage
 */

// Fallback metadata storage (WeakMap for internal tracking)
const metadataMap = new WeakMap();

/**
 * Internal helper to set metadata on a function/object
 * Uses Reflect.defineMetadata if available, otherwise falls back to direct property storage
 * @private
 */
function setMetadata(key, value, target) {
  // Try to use Reflect.defineMetadata if available (reflect-metadata polyfill)
  if (typeof Reflect !== 'undefined' && Reflect.defineMetadata) {
    Reflect.defineMetadata(key, value, target);
  } else {
    // Fallback: store in object property
    if (!target.__metadata__) {
      Object.defineProperty(target, '__metadata__', {
        value: new Map(),
        writable: false,
        enumerable: false,
        configurable: true
      });
    }
    target.__metadata__.set(key, value);
  }
}

/**
 * Decorator to check a specific permission string
 * Attaches permission metadata using 'permission:check' key
 * @param {string} permission - Permission string to check (e.g., 'user:read')
 * @returns {Function} Decorator function
 */
export function CheckPermission(permission) {
  return function (target, propertyKey, descriptor) {
    if (!permission || typeof permission !== 'string') {
      throw new Error('Permission must be a non-empty string');
    }
    setMetadata('permission:check', permission, descriptor.value);
    return descriptor;
  };
}

/**
 * Decorator to require resource and action permission
 * Attaches resource/action metadata using 'permission:require' key
 * @param {string} resource - Resource name (e.g., 'ticket', 'document')
 * @param {string} action - Action name (e.g., 'read', 'write', 'delete')
 * @returns {Function} Decorator function
 */
export function RequirePermission(resource, action) {
  return function (target, propertyKey, descriptor) {
    if (!resource || typeof resource !== 'string') {
      throw new Error('Resource must be a non-empty string');
    }
    if (!action || typeof action !== 'string') {
      throw new Error('Action must be a non-empty string');
    }
    setMetadata('permission:require', { resource, action }, descriptor.value);
    return descriptor;
  };
}

/**
 * Decorator to skip permission checks for an endpoint
 * Attaches skip metadata using 'permission:skip' key with value true
 * @returns {Function} Decorator function
 */
export function SkipPermissionCheck() {
  return function (target, propertyKey, descriptor) {
    setMetadata('permission:skip', true, descriptor.value);
    return descriptor;
  };
}

export default {
  CheckPermission,
  RequirePermission,
  SkipPermissionCheck
};
