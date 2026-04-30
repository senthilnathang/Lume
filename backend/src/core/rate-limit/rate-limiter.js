/**
 * @fileoverview Rate Limiter for CRUD Operations
 * Provides token-bucket rate limiting for entity CRUD endpoints
 */

import logger from '../services/logger.js';

const DEFAULT_LIMITS = {
  read: { requests: 1000, window: 60 }, // 1000 reads per minute
  create: { requests: 100, window: 60 }, // 100 creates per minute
  update: { requests: 500, window: 60 }, // 500 updates per minute
  delete: { requests: 100, window: 60 }, // 100 deletes per minute
  list: { requests: 500, window: 60 }, // 500 lists per minute
  search: { requests: 500, window: 60 }, // 500 searches per minute
};

class RateLimiter {
  /**
   * @param {Object} config - Rate limit configuration
   * @param {Object} config.limits - Limit overrides per action
   * @param {number} config.windowMs - Time window in milliseconds (default 60000)
   */
  constructor(config = {}) {
    this.limits = { ...DEFAULT_LIMITS, ...config.limits };
    this.windowMs = config.windowMs || 60000;
    this.store = new Map(); // userId -> { action -> { tokens, resetTime } }
  }

  /**
   * Get rate limit configuration for an action
   * @param {string} action - CRUD action (read, create, update, delete, list, search)
   * @returns {Object} Limit config { requests, window }
   */
  getLimit(action) {
    return this.limits[action] || this.limits.read;
  }

  /**
   * Check if request is within rate limit
   * @param {string} userId - User ID
   * @param {string} action - CRUD action
   * @returns {{allowed: boolean, tokens: number, resetTime: number}}
   */
  checkLimit(userId, action) {
    const limit = this.getLimit(action);
    const now = Date.now();

    // Get or initialize user record
    let userRecord = this.store.get(userId);
    if (!userRecord) {
      userRecord = {};
      this.store.set(userId, userRecord);
    }

    // Get or initialize action bucket
    let actionBucket = userRecord[action];
    if (!actionBucket || now >= actionBucket.resetTime) {
      actionBucket = {
        tokens: limit.requests,
        resetTime: now + this.windowMs,
      };
      userRecord[action] = actionBucket;
    }

    // Attempt to consume a token
    const allowed = actionBucket.tokens > 0;
    if (allowed) {
      actionBucket.tokens--;
    }

    return {
      allowed,
      tokens: actionBucket.tokens,
      resetTime: actionBucket.resetTime,
      limit: limit.requests,
    };
  }

  /**
   * Get current rate limit status for user/action
   * @param {string} userId - User ID
   * @param {string} action - CRUD action
   * @returns {Object} Status including tokens remaining and reset time
   */
  getStatus(userId, action) {
    const limit = this.getLimit(action);
    const userRecord = this.store.get(userId);

    if (!userRecord || !userRecord[action]) {
      return {
        action,
        remaining: limit.requests,
        limit: limit.requests,
        resetTime: Date.now() + this.windowMs,
        resetsIn: this.windowMs,
      };
    }

    const actionBucket = userRecord[action];
    const now = Date.now();
    const resetsIn = Math.max(0, actionBucket.resetTime - now);

    return {
      action,
      remaining: actionBucket.tokens,
      limit: limit.requests,
      resetTime: actionBucket.resetTime,
      resetsIn,
    };
  }

  /**
   * Reset limit for a specific user/action
   * @param {string} userId - User ID
   * @param {string} action - CRUD action or '*' for all
   */
  reset(userId, action = '*') {
    if (action === '*') {
      this.store.delete(userId);
    } else {
      const userRecord = this.store.get(userId);
      if (userRecord) {
        delete userRecord[action];
      }
    }
  }

  /**
   * Get all rate limit configurations
   * @returns {Object} Current limits
   */
  getConfig() {
    return { ...this.limits, windowMs: this.windowMs };
  }

  /**
   * Update rate limit configuration
   * @param {Object} newLimits - Updated limits per action
   */
  updateConfig(newLimits) {
    this.limits = { ...DEFAULT_LIMITS, ...newLimits };
    logger.info('[RateLimiter] Configuration updated', this.limits);
  }

  /**
   * Clean up expired entries (call periodically)
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [userId, userRecord] of this.store) {
      // Check if all buckets are expired
      let allExpired = true;
      for (const actionBucket of Object.values(userRecord)) {
        if (now < actionBucket.resetTime) {
          allExpired = false;
          break;
        }
      }

      if (allExpired) {
        this.store.delete(userId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`[RateLimiter] Cleaned ${cleaned} expired entries`);
    }
  }

  /**
   * Create Express middleware for rate limiting
   * @param {string} action - CRUD action to limit
   * @param {Object} options - Additional options
   * @returns {Function} Express middleware
   */
  middleware(action, options = {}) {
    return (req, res, next) => {
      const userId = req.user?.id || req.ip;
      const status = this.checkLimit(userId, action);

      // Add rate limit info to response headers
      res.setHeader('X-RateLimit-Limit', status.limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, status.tokens));
      res.setHeader('X-RateLimit-Reset', Math.ceil(status.resetTime / 1000));

      if (!status.allowed) {
        logger.warn(
          `[RateLimiter] Rate limit exceeded for user ${userId} on action ${action}`
        );

        if (options.handler) {
          return options.handler(req, res, status);
        }

        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil(status.resetTime / 1000),
        });
      }

      next();
    };
  }
}

export default RateLimiter;
