/**
 * @fileoverview Connection Pool Manager
 * Configures and manages database connection pooling for Prisma and Drizzle
 */

import logger from '../services/logger.js';

const DEFAULT_POOL_CONFIG = {
  min: 5,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statementTimeoutMillis: 30000,
};

class ConnectionPoolManager {
  /**
   * Get Prisma pool configuration
   * @returns {Object} Pool config for Prisma
   */
  static getPrismaPoolConfig() {
    return {
      max: DEFAULT_POOL_CONFIG.max,
      idleTimeoutMillis: DEFAULT_POOL_CONFIG.idleTimeoutMillis,
      connectionTimeoutMillis: DEFAULT_POOL_CONFIG.connectionTimeoutMillis,
      statementTimeoutMillis: DEFAULT_POOL_CONFIG.statementTimeoutMillis,
    };
  }

  /**
   * Get Drizzle pool configuration
   * @returns {Object} Pool config for Drizzle
   */
  static getDrizzlePoolConfig() {
    return {
      min: DEFAULT_POOL_CONFIG.min,
      max: DEFAULT_POOL_CONFIG.max,
      idleTimeoutMillis: DEFAULT_POOL_CONFIG.idleTimeoutMillis,
      connectionTimeoutMillis: DEFAULT_POOL_CONFIG.connectionTimeoutMillis,
      statementTimeoutMillis: DEFAULT_POOL_CONFIG.statementTimeoutMillis,
    };
  }

  /**
   * Get connection URI with pool options
   * @param {string} baseUri - Base database connection URI
   * @param {string} ormType - 'prisma' or 'drizzle'
   * @returns {string} URI with pool parameters
   */
  static buildConnectionUri(baseUri, ormType = 'drizzle') {
    const config = ormType === 'prisma' ? this.getPrismaPoolConfig() : this.getDrizzlePoolConfig();

    const poolParams = new URLSearchParams({
      max: config.max,
      min: config.min || 5,
      idleTimeoutMillis: config.idleTimeoutMillis,
      connectionTimeoutMillis: config.connectionTimeoutMillis,
      statementTimeoutMillis: config.statementTimeoutMillis,
    });

    // Append pool parameters to URI
    const separator = baseUri.includes('?') ? '&' : '?';
    return `${baseUri}${separator}${poolParams.toString()}`;
  }

  /**
   * Get recommended pool size for environment
   * @param {string} env - Environment: 'development', 'staging', 'production'
   * @returns {Object} Pool config for environment
   */
  static getPoolConfigForEnvironment(env = process.env.NODE_ENV || 'development') {
    const configs = {
      development: {
        min: 2,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        statementTimeoutMillis: 60000,
      },
      staging: {
        min: 5,
        max: 30,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 3000,
        statementTimeoutMillis: 45000,
      },
      production: {
        min: 10,
        max: 50,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        statementTimeoutMillis: 30000,
      },
    };

    return configs[env] || configs.development;
  }

  /**
   * Apply pool configuration to environment variables
   * @param {string} env - Environment name
   * @returns {Object} Updated environment config
   */
  static configurePoolForEnvironment(env) {
    const poolConfig = this.getPoolConfigForEnvironment(env);

    logger.info('[ConnectionPool] Pool config for ' + env, poolConfig);

    return poolConfig;
  }

  /**
   * Verify pool health by executing test query
   * @param {Object} adapter - Prisma or Drizzle adapter instance
   * @returns {Promise<boolean>} True if pool is healthy
   */
  async verifyPoolHealth(adapter) {
    try {
      const startTime = Date.now();

      // Simple test query
      if (adapter.query) {
        // Drizzle adapter
        await adapter.query.raw('SELECT 1 as health_check');
      } else if (adapter.$queryRaw) {
        // Prisma adapter
        await adapter.$queryRaw`SELECT 1 as health_check`;
      }

      const elapsed = Date.now() - startTime;
      logger.debug(`[ConnectionPool] Pool health check passed (${elapsed}ms)`);

      return true;
    } catch (error) {
      logger.error('[ConnectionPool] Pool health check failed:', error.message);
      return false;
    }
  }

  /**
   * Get current pool statistics (if available)
   * @param {Object} adapter - Adapter instance
   * @returns {Object|null} Pool statistics or null if not available
   */
  getPoolStats(adapter) {
    if (!adapter) {
      return null;
    }

    // Drizzle pool stats (if available)
    if (adapter.pool) {
      return {
        waiting: adapter.pool.waitingCount || 0,
        idle: adapter.pool.idleCount || 0,
        totalConnections: (adapter.pool.totalCount || 0),
      };
    }

    // Prisma doesn't expose pool stats directly
    return null;
  }
}

export default ConnectionPoolManager;
