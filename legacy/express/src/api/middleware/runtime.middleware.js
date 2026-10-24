/**
 * @fileoverview Runtime Middleware - Load LumeRuntime into Express request
 * Initializes/loads the runtime instance and attaches to req.runtime
 */

import logger from '../../core/services/logger.js';

/**
 * Middleware to initialize and load LumeRuntime
 * @param {LumeRuntime} runtime - Runtime instance
 * @returns {Function} Express middleware
 */
export function runtimeMiddleware(runtime) {
  return (req, res, next) => {
    if (!runtime) {
      logger.error('[RuntimeMiddleware] Runtime not provided');
      return res.status(500).json({
        success: false,
        errors: [{ message: 'Runtime not initialized' }],
      });
    }

    req.runtime = runtime;
    next();
  };
}

/**
 * Factory middleware for lazy-loading runtime
 * @param {Function} runtimeFactory - Function that returns runtime instance
 * @returns {Function} Express middleware
 */
export function runtimeFactory(runtimeFactory) {
  let runtimeInstance = null;

  return async (req, res, next) => {
    try {
      if (!runtimeInstance) {
        logger.info('[RuntimeMiddleware] Initializing runtime...');
        runtimeInstance = await runtimeFactory();
      }

      req.runtime = runtimeInstance;
      next();
    } catch (error) {
      logger.error('[RuntimeMiddleware] Error initializing runtime:', error.message);
      res.status(500).json({
        success: false,
        errors: [{ message: 'Runtime initialization failed' }],
      });
    }
  };
}

export default {
  runtimeMiddleware,
  runtimeFactory,
};
