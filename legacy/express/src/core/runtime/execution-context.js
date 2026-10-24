/**
 * @fileoverview ContextLoader - Extract ExecutionContext from Express request
 */

import logger from '../services/logger.js';

class ContextLoader {
  /**
   * Load ExecutionContext from Express request
   * @param {Object} req - Express request object
   * @returns {Promise<ExecutionContext>}
   */
  async loadFromRequest(req) {
    try {
      // Extract from JWT payload (set by auth middleware)
      const user = req.user || {};

      const context = {
        userId: user.id || '',
        orgId: req.headers['x-org-id'] || user.orgId || '',
        roles: Array.isArray(user.roles) ? user.roles : [],
        permissions: Array.isArray(user.permissions) ? user.permissions : [],
        locale: req.headers['accept-language']?.split(',')[0]?.split(';')[0] || 'en-US',
        timezone: req.headers['x-timezone'] || 'UTC',
        metadata: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
      };

      logger.debug(`[ContextLoader] Loaded context for user: ${context.userId}`);
      return context;
    } catch (error) {
      logger.warn(`[ContextLoader] Error loading context:`, error.message);
      // Return empty context on error
      return {
        userId: '',
        orgId: '',
        roles: [],
        permissions: [],
        locale: 'en-US',
        timezone: 'UTC',
      };
    }
  }

  /**
   * Create a test context (for testing/demos)
   * @param {Partial<ExecutionContext>} overrides - Override values
   * @returns {ExecutionContext}
   */
  static createTestContext(overrides = {}) {
    return {
      userId: 'test-user',
      orgId: 'test-org',
      roles: ['user'],
      permissions: [],
      locale: 'en-US',
      timezone: 'UTC',
      ...overrides,
    };
  }
}

export default ContextLoader;
