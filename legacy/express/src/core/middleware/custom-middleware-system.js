/**
 * @fileoverview Custom Middleware & Validator System
 * Allows runtime registration of custom middleware and field validators
 */

import logger from '../services/logger.js';

/**
 * @typedef {Object} CustomValidator
 * @property {string} name - Validator name
 * @property {Function} validate - (value, field, record, context) => { valid: boolean, error?: string }
 * @property {string} [description] - Human-readable description
 */

/**
 * @typedef {Object} CustomMiddleware
 * @property {string} name - Middleware name
 * @property {Function} execute - (data, context) => Promise<data>
 * @property {number} [order] - Execution order (default 50)
 * @property {string} [phase] - 'pre' or 'post' (default 'pre')
 */

class CustomMiddlewareSystem {
  constructor() {
    this.validators = new Map(); // name -> CustomValidator
    this.middlewares = new Map(); // phase -> [CustomMiddleware]
    this.hooks = new Map(); // entity -> [hook]
  }

  /**
   * Register custom field validator
   * @param {string} name - Validator name
   * @param {Function} validate - Validation function
   * @param {string} [description] - Description
   */
  registerValidator(name, validate, description = '') {
    if (this.validators.has(name)) {
      throw new Error(`Validator already exists: ${name}`);
    }

    this.validators.set(name, {
      name,
      validate,
      description,
      createdAt: new Date(),
    });

    logger.info(`[CustomMiddlewareSystem] Validator registered: ${name}`);
  }

  /**
   * Get validator by name
   * @param {string} name - Validator name
   * @returns {CustomValidator|null}
   */
  getValidator(name) {
    return this.validators.get(name) || null;
  }

  /**
   * List all registered validators
   * @returns {Object[]}
   */
  listValidators() {
    return Array.from(this.validators.values());
  }

  /**
   * Execute custom validators on field value
   * @param {string} validatorName - Validator to execute
   * @param {*} value - Field value
   * @param {Object} field - Field definition
   * @param {Object} record - Full record
   * @param {Object} context - Execution context
   * @returns {{valid: boolean, error?: string}}
   */
  async executeValidator(validatorName, value, field, record, context) {
    const validator = this.getValidator(validatorName);
    if (!validator) {
      throw new Error(`Validator not found: ${validatorName}`);
    }

    try {
      const result = await validator.validate(value, field, record, context);
      return result;
    } catch (error) {
      logger.error(`[CustomMiddlewareSystem] Validator ${validatorName} failed: ${error.message}`);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Register custom middleware
   * @param {string} name - Middleware name
   * @param {Function} execute - Execution function
   * @param {{order?: number, phase?: string}} [options]
   */
  registerMiddleware(name, execute, options = {}) {
    const { order = 50, phase = 'pre' } = options;

    if (!['pre', 'post'].includes(phase)) {
      throw new Error('Phase must be "pre" or "post"');
    }

    const middleware = {
      name,
      execute,
      order,
      phase,
      createdAt: new Date(),
    };

    if (!this.middlewares.has(phase)) {
      this.middlewares.set(phase, []);
    }

    this.middlewares.get(phase).push(middleware);
    this.middlewares.get(phase).sort((a, b) => a.order - b.order);

    logger.info(`[CustomMiddlewareSystem] Middleware registered: ${name} (${phase}, order: ${order})`);
  }

  /**
   * Get middleware by phase
   * @param {string} phase - 'pre' or 'post'
   * @returns {CustomMiddleware[]}
   */
  getMiddleware(phase = 'pre') {
    return this.middlewares.get(phase) || [];
  }

  /**
   * Execute all middlewares for phase
   * @param {string} phase - 'pre' or 'post'
   * @param {Object} data - Data to process
   * @param {Object} context - Execution context
   * @returns {Promise<Object>}
   */
  async executePhase(phase, data, context) {
    const middlewares = this.getMiddleware(phase);
    let result = data;

    for (const middleware of middlewares) {
      try {
        result = await middleware.execute(result, context);
      } catch (error) {
        logger.error(
          `[CustomMiddlewareSystem] Middleware ${middleware.name} failed: ${error.message}`
        );
        throw error;
      }
    }

    return result;
  }

  /**
   * Register entity lifecycle hook
   * @param {string} entity - Entity slug
   * @param {string} event - 'onCreate', 'onUpdate', 'onDelete'
   * @param {Function} handler - Hook handler
   */
  registerHook(entity, event, handler) {
    const key = `${entity}:${event}`;

    if (!this.hooks.has(key)) {
      this.hooks.set(key, []);
    }

    this.hooks.get(key).push({
      handler,
      createdAt: new Date(),
    });

    logger.info(`[CustomMiddlewareSystem] Hook registered: ${key}`);
  }

  /**
   * Execute entity lifecycle hooks
   * @param {string} entity - Entity slug
   * @param {string} event - 'onCreate', 'onUpdate', 'onDelete'
   * @param {Object} record - Record data
   * @param {Object} context - Execution context
   * @returns {Promise<Object>}
   */
  async executeHooks(entity, event, record, context) {
    const key = `${entity}:${event}`;
    const hooks = this.hooks.get(key) || [];
    let result = record;

    for (const hook of hooks) {
      try {
        result = await hook.handler(result, context);
      } catch (error) {
        logger.error(`[CustomMiddlewareSystem] Hook ${key} failed: ${error.message}`);
        throw error;
      }
    }

    return result;
  }

  /**
   * Create reusable middleware chain
   * @param {string} name - Chain name
   * @param {Function[]} handlers - Array of middleware handlers
   * @param {Object} [options]
   * @returns {Object} Chain definition
   */
  defineMiddlewareChain(name, handlers, options = {}) {
    const { order = 50, phase = 'pre' } = options;

    const chain = {
      name,
      handlers,
      order,
      phase,
      createdAt: new Date(),
    };

    // Create composite middleware that runs all handlers in sequence
    const execute = async (data, context) => {
      let result = data;
      for (const handler of handlers) {
        result = await handler(result, context);
      }
      return result;
    };

    this.registerMiddleware(name, execute, { order, phase });

    return chain;
  }

  /**
   * Create reusable validator
   * @param {string} name - Validator name
   * @param {Object} rules - Validation rules
   * @returns {Object} Validator definition
   */
  defineValidator(name, rules) {
    const validator = {
      name,
      rules,
      createdAt: new Date(),
    };

    const validate = async (value, field, record, context) => {
      // Check required
      if (rules.required && (value === null || value === undefined || value === '')) {
        return { valid: false, error: `${field.name} is required` };
      }

      // Check type
      if (rules.type && value !== null && value !== undefined) {
        const actualType = typeof value;
        const expectedType = rules.type;

        if (actualType !== expectedType) {
          return { valid: false, error: `${field.name} must be ${expectedType}` };
        }
      }

      // Check min
      if (rules.min !== undefined && value < rules.min) {
        return { valid: false, error: `${field.name} must be >= ${rules.min}` };
      }

      // Check max
      if (rules.max !== undefined && value > rules.max) {
        return { valid: false, error: `${field.name} must be <= ${rules.max}` };
      }

      // Check minLength
      if (rules.minLength && value && value.length < rules.minLength) {
        return { valid: false, error: `${field.name} must be at least ${rules.minLength} chars` };
      }

      // Check maxLength
      if (rules.maxLength && value && value.length > rules.maxLength) {
        return { valid: false, error: `${field.name} must be at most ${rules.maxLength} chars` };
      }

      // Check pattern
      if (rules.pattern && value && !new RegExp(rules.pattern).test(value)) {
        return { valid: false, error: `${field.name} format invalid` };
      }

      // Check enum
      if (rules.enum && !rules.enum.includes(value)) {
        return { valid: false, error: `${field.name} must be one of: ${rules.enum.join(', ')}` };
      }

      // Check custom
      if (rules.custom && typeof rules.custom === 'function') {
        const customResult = await rules.custom(value, field, record, context);
        if (!customResult.valid) {
          return customResult;
        }
      }

      return { valid: true };
    };

    this.registerValidator(name, validate, rules.description);

    return validator;
  }

  /**
   * Get all registered middlewares
   * @returns {Object}
   */
  listAllMiddlewares() {
    const result = {};

    for (const [phase, middlewares] of this.middlewares) {
      result[phase] = middlewares.map(m => ({
        name: m.name,
        order: m.order,
        phase: m.phase,
        createdAt: m.createdAt,
      }));
    }

    return result;
  }

  /**
   * Get middleware execution stats
   * @returns {Object}
   */
  getStats() {
    return {
      validators: this.validators.size,
      middlewares: Array.from(this.middlewares.values()).reduce((sum, arr) => sum + arr.length, 0),
      hooks: this.hooks.size,
    };
  }

  /**
   * Clear all custom middleware and validators
   */
  clear() {
    this.validators.clear();
    this.middlewares.clear();
    this.hooks.clear();
    logger.info('[CustomMiddlewareSystem] All custom middleware and validators cleared');
  }
}

export default CustomMiddlewareSystem;
