/**
 * @fileoverview CacheOptimizer - Orchestrate 5-layer caching strategy
 * L1: In-process Map (instant), L2: Redis metadata, L3: Query cache
 * L4: HTTP ETags, L5: CDN headers
 */

import logger from '../services/logger.js';

const CACHE_LAYERS = {
  L1_MEMORY: 'memory',      // In-process Map (instant)
  L2_METADATA: 'metadata',  // Redis (1h entity, 30m permissions, 5m fields)
  L3_QUERY: 'query',        // Redis query results (30s TTL)
  L4_ETAG: 'etag',          // HTTP ETags (last-modified headers)
  L5_CDN: 'cdn',            // Cache-Control headers for CDN
};

class CacheOptimizer {
  /**
   * @param {Object} config - Cache configuration
   * @param {Map} config.memoryCache - In-process Map cache
   * @param {Object} config.metadataCache - Redis metadata cache wrapper
   * @param {Object} config.queryCache - Redis query cache wrapper
   */
  constructor({ memoryCache = null, metadataCache = null, queryCache = null }) {
    this.memory = memoryCache || new Map();
    this.metadata = metadataCache;
    this.query = queryCache;
    this.stats = {
      hits: 0,
      misses: 0,
      byLayer: {
        L1: 0,
        L2: 0,
        L3: 0,
        L4: 0,
        L5: 0,
      },
    };
  }

  /**
   * Get with 5-layer cache strategy
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch if cache miss
   * @param {Object} options - Cache options
   * @param {number} [options.ttl1] - L1 TTL (milliseconds)
   * @param {number} [options.ttl2] - L2 TTL (seconds)
   * @param {number} [options.ttl3] - L3 TTL (seconds)
   * @returns {Promise<*>} Cached or fetched value
   */
  async get(key, fetchFn, options = {}) {
    const startTime = Date.now();

    // L1: In-process cache (instant)
    if (this.memory.has(key)) {
      logger.debug(`[CacheOptimizer] L1 HIT: ${key}`);
      this.stats.hits++;
      this.stats.byLayer.L1++;
      return this.memory.get(key);
    }

    // L2: Redis metadata cache
    if (this.metadata) {
      try {
        const cached = await this.metadata.get(key);
        if (cached) {
          logger.debug(`[CacheOptimizer] L2 HIT: ${key}`);
          this.stats.hits++;
          this.stats.byLayer.L2++;
          // Promote to L1
          this.memory.set(key, cached);
          return cached;
        }
      } catch (error) {
        logger.warn('[CacheOptimizer] L2 error:', error.message);
      }
    }

    // L3: Query cache
    if (this.query) {
      try {
        const cached = await this.query.get({ key });
        if (cached) {
          logger.debug(`[CacheOptimizer] L3 HIT: ${key}`);
          this.stats.hits++;
          this.stats.byLayer.L3++;
          // Promote to L1 and L2
          this.memory.set(key, cached);
          if (this.metadata) {
            await this.metadata.set(key, cached, options.ttl2 || 1800);
          }
          return cached;
        }
      } catch (error) {
        logger.warn('[CacheOptimizer] L3 error:', error.message);
      }
    }

    // Cache miss: fetch from source
    this.stats.misses++;
    logger.debug(`[CacheOptimizer] MISS: ${key}`);

    try {
      const result = await fetchFn();

      const ttl1 = options.ttl1 || 300000; // 5 minutes default
      const ttl2 = options.ttl2 || 1800; // 30 minutes default
      const ttl3 = options.ttl3 || 30; // 30 seconds default

      // Store in all layers
      this.memory.set(key, result);

      if (this.metadata) {
        await this.metadata.set(key, result, ttl2);
      }

      if (this.query) {
        await this.query.set({ key }, result, ttl3);
      }

      const elapsed = Date.now() - startTime;
      logger.debug(`[CacheOptimizer] Fetched and cached ${key} (${elapsed}ms)`);

      return result;
    } catch (error) {
      logger.error('[CacheOptimizer] Error fetching value:', error.message);
      throw error;
    }
  }

  /**
   * Invalidate across all layers
   * @param {string} pattern - Key pattern or specific key
   * @returns {Promise<void>}
   */
  async invalidate(pattern) {
    logger.debug(`[CacheOptimizer] Invalidating: ${pattern}`);

    // L1: Memory cache
    if (pattern.includes('*')) {
      const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
      for (const key of this.memory.keys()) {
        if (regex.test(key)) {
          this.memory.delete(key);
        }
      }
    } else {
      this.memory.delete(pattern);
    }

    // L2: Metadata cache
    if (this.metadata) {
      try {
        // Redis supports patterns natively
        await this.metadata.invalidatePattern(pattern);
      } catch (error) {
        logger.warn('[CacheOptimizer] L2 invalidation error:', error.message);
      }
    }

    // L3: Query cache
    if (this.query) {
      try {
        await this.query.invalidatePattern(pattern);
      } catch (error) {
        logger.warn('[CacheOptimizer] L3 invalidation error:', error.message);
      }
    }
  }

  /**
   * Invalidate all cache for entity
   * @param {string} entity - Entity slug
   * @returns {Promise<void>}
   */
  async invalidateEntity(entity) {
    await this.invalidate(`${entity}:*`);
  }

  /**
   * Clear all caches
   * @returns {Promise<void>}
   */
  async clear() {
    logger.info('[CacheOptimizer] Clearing all caches');

    // L1: Memory
    this.memory.clear();

    // L2: Metadata
    if (this.metadata) {
      try {
        await this.metadata.clear();
      } catch (error) {
        logger.warn('[CacheOptimizer] L2 clear error:', error.message);
      }
    }

    // L3: Query
    if (this.query) {
      try {
        await this.query.clear();
      } catch (error) {
        logger.warn('[CacheOptimizer] L3 clear error:', error.message);
      }
    }

    // Reset stats
    this.stats = {
      hits: 0,
      misses: 0,
      byLayer: { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 },
    };
  }

  /**
   * Get cache hit/miss statistics
   * @returns {Object}
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      total,
      hitRate: `${hitRate}%`,
    };
  }

  /**
   * Generate HTTP cache headers for response
   * @param {string} cacheStrategy - 'public' | 'private' | 'no-cache'
   * @param {number} maxAge - Max age in seconds
   * @returns {Object} Headers
   */
  getHttpHeaders(cacheStrategy = 'public', maxAge = 300) {
    const headers = {};

    switch (cacheStrategy) {
      case 'no-cache':
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
        break;

      case 'private':
        headers['Cache-Control'] = `private, max-age=${maxAge}`;
        break;

      case 'public':
      default:
        headers['Cache-Control'] = `public, max-age=${maxAge}`;
        headers['Vary'] = 'Accept-Encoding';
        break;
    }

    return headers;
  }

  /**
   * Generate ETag from data
   * @param {*} data - Data to hash
   * @returns {string} ETag value
   */
  generateETag(data) {
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Create a new CacheOptimizer
   * @static
   * @param {Object} config - Configuration
   * @returns {CacheOptimizer}
   */
  static create(config) {
    return new CacheOptimizer(config);
  }
}

export default CacheOptimizer;
