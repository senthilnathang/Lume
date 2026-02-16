/**
 * ServiceRegistry — Global registry for cross-module service access.
 * Modules register their services during init. BaseService uses this
 * to fire webhooks, evaluate business rules, and dispatch notifications
 * on CRUD operations.
 */

const registry = {};

export const serviceRegistry = {
  /**
   * Register a service by name.
   */
  register(name, service) {
    registry[name] = service;
  },

  /**
   * Get a service by name.
   */
  get(name) {
    return registry[name] || null;
  },

  /**
   * Check if a service is registered.
   */
  has(name) {
    return name in registry;
  },

  /**
   * Get all registered service names.
   */
  list() {
    return Object.keys(registry);
  },
};

export default serviceRegistry;
