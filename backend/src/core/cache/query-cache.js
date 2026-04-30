/**
 * @fileoverview QueryCache - Cache query results with hash-based keys
 * Layer 3 caching: Redis-backed query result cache with TTL
 */

import crypto from 'crypto';
import logger from '../services/logger.js';

const DEFAULT_TTL = 30; // 30 seconds

class QueryCache {
  /**
   * @param {Redis} redisClient - Redis client
   * @param {number} defaultTtl - Default TTL in seconds
   */
  constructor(redisClient, defaultTtl = DEFAULT_TTL) {
    this.redis = redisClient;
    this.defaultTtl = defaultTtl;
  }

  /**
   * Get cached query result
   * @param {Object} query - Query object
   * @returns {Promise<Object|null>} Cached result or null
   */
  async get(query) {
    if (!this.redis) {
      return null;
    }

    try {
      const key = this.hashQuery(query);
      const cached = await this.redis.get(key);

      if (cached) {
        logger.debug(`[QueryCache] HIT: ${key}`);
        return JSON.parse(cached);
      }

      logger.debug(`[QueryCache] MISS: ${key}`);
      return null;
    } catch (error) {
      logger.warn('[QueryCache] Error getting cached query:', error.message);
      return null;
    }
  }

  /**
   * Set query cache
   * @param {Object} query - Query object
   * @param {*} result - Result to cache
   * @param {number} [ttl] - TTL in seconds
   * @returns {Promise<void>}
   */
  async set(query, result, ttl = this.defaultTtl) {
    if (!this.redis) {
      return;
    }

    try {
      const key = this.hashQuery(query);
      const value = JSON.stringify(result);

      await this.redis.setex(key, ttl, value);

      logger.debug(`[QueryCache] SET: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.warn('[QueryCache] Error setting cache:', error.message);
    }
  }

  /**
   * Invalidate queries matching pattern
   * @param {string} pattern - Key pattern (e.g., "query:ticket:*")
   * @returns {Promise<number>} Number of keys deleted
   */
  async invalidatePattern(pattern) {
    if (!this.redis) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(`query:${pattern}`);

      if (keys.length === 0) {
        return 0;
      }

      const deleted = await this.redis.del(...keys);

      logger.debug(`[QueryCache] Invalidated ${deleted} keys matching: ${pattern}`);

      return deleted;
    } catch (error) {
      logger.warn('[QueryCache] Error invalidating pattern:', error.message);
      return 0;
    }
  }

  /**
   * Invalidate all queries for entity
   * @param {string} entity - Entity slug
   * @returns {Promise<number>} Number of keys deleted
   */
  async invalidateEntity(entity) {
    return this.invalidatePattern(`${entity}:*`);
  }

  /**
   * Clear all query cache
   * @returns {Promise<void>}
   */
  async clear() {
    if (!this.redis) {
      return;
    }

    try {
      const keys = await this.redis.keys('query:*');

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      logger.debug('[QueryCache] Cleared all query cache');
    } catch (error) {
      logger.warn('[QueryCache] Error clearing cache:', error.message);
    }
  }

  /**
   * Generate hash key from query object
   * @private
   * @param {Object} query - Query object
   * @returns {string} Cache key
   */
  hashQuery(query) {
    const normalized = this.normalizeQuery(query);
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex');

    return `query:${query.entity}:${hash}`;
  }

  /**
   * Normalize query for consistent hashing
   * @private
   * @param {Object} query - Query object
   * @returns {Object} Normalized query
   */
  normalizeQuery(query) {
    return {
      entity: query.entity,
      action: query.action,
      filters: this.sortFilters(query.filters),
      sort: query.sort,
      page: query.page || 1,
      pageSize: query.pageSize || 25,
      fields: this.sortArray(query.fields),
    };
  }

  /**
   * Sort filter object for consistent comparison
   * @private
   * @param {Object} filters - Filters object
   * @returns {Object} Sorted filters
   */
  sortFilters(filters) {
    if (!filters) {
      return {};
    }

    const sorted = {};
    Object.keys(filters)
      .sort()
      .forEach(key => {
        sorted[key] = filters[key];
      });

    return sorted;
  }

  /**
   * Sort array for consistent comparison
   * @private
   * @param {Array} arr - Array to sort
   * @returns {Array} Sorted array
   */
  sortArray(arr) {
    if (!Array.isArray(arr)) {
      return [];
    }

    return arr.slice().sort();
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    if (!this.redis) {
      return { enabled: false };
    }

    try {
      const keys = await this.redis.keys('query:*');
      const info = await this.redis.info('memory');

      return {
        enabled: true,
        cachedQueries: keys.length,
        memoryUsage: this.parseMemoryInfo(info),
      };
    } catch (error) {
      logger.warn('[QueryCache] Error getting stats:', error.message);
      return { enabled: true, error: error.message };
    }
  }

  /**
   * Parse Redis memory info
   * @private
   * @param {string} info - Redis info output
   * @returns {string} Used memory
   */
  parseMemoryInfo(info) {
    const match = info.match(/used_memory_human:(.+?)\r?\n/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Create a new QueryCache
   * @static
   * @param {Redis} redisClient - Redis client
   * @returns {QueryCache}
   */
  static create(redisClient) {
    return new QueryCache(redisClient);
  }
}

export default QueryCache;
