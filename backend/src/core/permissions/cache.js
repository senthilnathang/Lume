/**
 * PermissionCache - LRU cache with TTL expiration for permission decisions
 *
 * @typedef {Object} CacheEntry
 * @property {Object} value - The cached PermissionResult
 * @property {number} expiresAt - Timestamp when entry expires
 * @property {number} accessTime - Last access timestamp (for LRU tracking)
 *
 * @typedef {Object} CacheStats
 * @property {number} hits - Number of cache hits
 * @property {number} misses - Number of cache misses
 * @property {number} size - Current number of cached entries
 *
 * @typedef {Object} CacheConfig
 * @property {number} [maxSize=1000] - Maximum number of entries
 * @property {number} [defaultTTL=300] - Default TTL in seconds
 */

export class PermissionCache {
  /**
   * Initialize the permission cache
   * @param {CacheConfig} config - Cache configuration
   * @throws {Error} If maxSize <= 0 or defaultTTL < 0
   */
  constructor(config = {}) {
    this.maxSize = config.maxSize ?? 1000;
    this.defaultTTL = config.defaultTTL ?? 300;

    // Validate parameters
    if (this.maxSize <= 0) {
      throw new Error(`Invalid cache maxSize: ${this.maxSize}, must be greater than 0`);
    }
    if (this.defaultTTL < 0) {
      throw new Error(`Invalid defaultTTL: ${this.defaultTTL}, must be non-negative`);
    }

    /** @type {Map<string, CacheEntry>} */
    this.cache = new Map();

    /** @type {string[]} - Track access order for LRU eviction */
    this.accessOrder = [];

    /** @type {number} */
    this.hits = 0;

    /** @type {number} */
    this.misses = 0;
  }

  /**
   * Generate a cache key from userId, resource, and action
   * @param {string} userId - User identifier
   * @param {string} resource - Resource identifier
   * @param {string} action - Action identifier
   * @returns {string} Cache key
   */
  generateKey(userId, resource, action) {
    return `perm:${userId}:${resource}:${action}`;
  }

  /**
   * Retrieve a cached permission result
   * Updates LRU order and tracks hits/misses
   * @param {string} key - Cache key
   * @returns {Object|null} Cached PermissionResult or null if missing/expired
   */
  get(key) {
    const entry = this.cache.get(key);

    // Entry not found
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      // Entry expired - remove it and track as miss
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
      this.misses++;
      return null;
    }

    // Hit - update access order and return value
    entry.accessTime = Date.now();
    // Move to end of access order (most recently used)
    this.accessOrder = this.accessOrder.filter((k) => k !== key);
    this.accessOrder.push(key);

    this.hits++;
    return entry.value;
  }

  /**
   * Cache a permission result
   * Handles LRU eviction if cache is full
   * @param {string} key - Cache key
   * @param {Object} value - PermissionResult to cache
   * @param {number} [ttlSeconds] - TTL in seconds (uses default if not provided)
   */
  set(key, value, ttlSeconds) {
    const ttl = ttlSeconds ?? this.defaultTTL;
    const now = Date.now();

    // If key already exists, remove it from access order
    if (this.cache.has(key)) {
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
    } else if (this.cache.size >= this.maxSize) {
      // Cache is full - evict LRU entry
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }

    // Add new entry
    const entry = {
      value,
      expiresAt: now + ttl * 1000,
      accessTime: now,
    };

    this.cache.set(key, entry);
    this.accessOrder.push(key);
  }

  /**
   * Clear all cached entries
   */
  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache statistics
   * @returns {CacheStats} Cache statistics
   */
  getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
    };
  }

  /**
   * Reset hit/miss counters (but not the cache itself)
   */
  resetStats() {
    this.hits = 0;
    this.misses = 0;
  }
}
