/**
 * @fileoverview RedisCache - Redis-backed TTL cache wrapper
 * Provides L2 caching layer for metadata, permissions, and computed fields
 */

import logger from '../services/logger.js';

class RedisCache {
  /**
   * @param {Redis} redisClient - ioredis client
   */
  constructor(redisClient) {
    this.redis = redisClient;
  }

  /**
   * Set a value in cache with TTL
   * @param {string} key - Cache key
   * @param {*} value - Value (will be JSON stringified)
   * @param {number} ttlSeconds - Time to live in seconds
   * @returns {Promise<void>}
   */
  async set(key, value, ttlSeconds) {
    try {
      const jsonValue = JSON.stringify(value);
      await this.redis.setex(key, ttlSeconds, jsonValue);
      logger.debug(`[RedisCache] Set: ${key} (TTL: ${ttlSeconds}s)`);
    } catch (error) {
      logger.warn(`[RedisCache] Error setting ${key}:`, error.message);
    }
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<*|null>}
   */
  async get(key) {
    try {
      const value = await this.redis.get(key);
      if (value === null) {
        return null;
      }

      logger.debug(`[RedisCache] Hit: ${key}`);
      return JSON.parse(value);
    } catch (error) {
      logger.warn(`[RedisCache] Error getting ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   * @returns {Promise<void>}
   */
  async del(key) {
    try {
      await this.redis.del(key);
      logger.debug(`[RedisCache] Deleted: ${key}`);
    } catch (error) {
      logger.warn(`[RedisCache] Error deleting ${key}:`, error.message);
    }
  }

  /**
   * Delete multiple keys
   * @param {string[]} keys - Cache keys
   * @returns {Promise<void>}
   */
  async delMany(keys) {
    try {
      if (keys.length === 0) return;
      await this.redis.del(...keys);
      logger.debug(`[RedisCache] Deleted ${keys.length} keys`);
    } catch (error) {
      logger.warn(`[RedisCache] Error deleting keys:`, error.message);
    }
  }

  /**
   * Clear all cache (use with caution)
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      await this.redis.flushdb();
      logger.info('[RedisCache] Cleared all cache');
    } catch (error) {
      logger.warn('[RedisCache] Error clearing cache:', error.message);
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.warn(`[RedisCache] Error checking existence of ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Get remaining TTL of a key
   * @param {string} key - Cache key
   * @returns {Promise<number>} TTL in seconds (-1 if no expiry, -2 if not exists)
   */
  async ttl(key) {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      logger.warn(`[RedisCache] Error getting TTL of ${key}:`, error.message);
      return -2;
    }
  }

  /**
   * Get all keys matching pattern
   * @param {string} pattern - Key pattern (e.g., 'entity:*')
   * @returns {Promise<string[]>}
   */
  async keys(pattern) {
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      logger.warn(`[RedisCache] Error getting keys for pattern ${pattern}:`, error.message);
      return [];
    }
  }

  /**
   * Increment a numeric value
   * @param {string} key - Cache key
   * @param {number} amount - Amount to increment
   * @returns {Promise<number>} New value
   */
  async incr(key, amount = 1) {
    try {
      return await this.redis.incrby(key, amount);
    } catch (error) {
      logger.warn(`[RedisCache] Error incrementing ${key}:`, error.message);
      return 0;
    }
  }
}

export default RedisCache;
