/**
 * @fileoverview Phase 7 Performance & Scalability Tests
 * Tests for 5-layer caching, query optimization, connection pooling, and rate limiting
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import QueryCache from '../../src/core/cache/query-cache.js';
import CacheOptimizer from '../../src/core/cache/cache-optimizer.js';
import QueryOptimizationInterceptor from '../../src/core/runtime/interceptors/query-optimization.interceptor.js';
import RateLimiter from '../../src/core/rate-limit/rate-limiter.js';
import ConnectionPoolManager from '../../src/core/db/connection-pool.js';

describe('Phase 7: Performance & Scalability', () => {
  describe('QueryCache (Layer 3)', () => {
    let cache;
    let mockRedis;

    beforeEach(() => {
      mockRedis = {
        get: async (key) => null,
        setex: async (key, ttl, value) => {},
        keys: async (pattern) => [],
        del: async (...keys) => 0,
        info: async () => 'used_memory_human:1.5M',
      };

      cache = new QueryCache(mockRedis, 30);
    });

    it('should cache query results', async () => {
      const query = { entity: 'ticket', action: 'list', filters: { status: 'open' } };
      const result = { id: 1, title: 'Test' };

      await cache.set(query, result, 30);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should retrieve cached query results', async () => {
      const query = { entity: 'ticket', action: 'list' };
      const cachedResult = { id: 1, title: 'Test' };

      mockRedis.get = async () => JSON.stringify(cachedResult);

      const result = await cache.get(query);

      expect(result).toEqual(cachedResult);
    });

    it('should return null for cache miss', async () => {
      mockRedis.get = async () => null;

      const query = { entity: 'ticket', action: 'list' };
      const result = await cache.get(query);

      expect(result).toBeNull();
    });

    it('should invalidate by pattern', async () => {
      mockRedis.keys = async (pattern) => ['query:ticket:hash1', 'query:ticket:hash2'];
      mockRedis.del = async (...keys) => keys.length;

      const deleted = await cache.invalidatePattern('ticket:*');

      expect(deleted).toBe(2);
    });

    it('should invalidate all by entity', async () => {
      mockRedis.keys = async (pattern) => ['query:ticket:hash1', 'query:ticket:hash2'];
      mockRedis.del = async (...keys) => keys.length;

      const deleted = await cache.invalidateEntity('ticket');

      expect(deleted).toBe(2);
    });

    it('should normalize queries for consistent hashing', () => {
      const query1 = {
        entity: 'ticket',
        action: 'list',
        filters: { status: 'open', priority: 'high' },
        sort: { field: 'createdAt', order: 'desc' },
      };

      const query2 = {
        entity: 'ticket',
        action: 'list',
        filters: { priority: 'high', status: 'open' }, // Different order
        sort: { field: 'createdAt', order: 'desc' },
      };

      const key1 = cache.hashQuery(query1);
      const key2 = cache.hashQuery(query2);

      // Should be same even with different filter order
      expect(key1).toBe(key2);
    });

    it('should get statistics', async () => {
      mockRedis.keys = async () => ['query:ticket:hash1', 'query:ticket:hash2'];
      mockRedis.info = async () => 'used_memory_human:2.5M\r\n';

      const stats = await cache.getStats();

      expect(stats.enabled).toBe(true);
      expect(stats.cachedQueries).toBe(2);
      expect(stats.memoryUsage).toContain('2.5M');
    });
  });

  describe('CacheOptimizer (5-Layer Caching)', () => {
    let optimizer;
    let mockMemory;
    let mockMetadata;
    let mockQuery;

    beforeEach(() => {
      mockMemory = new Map();
      mockMetadata = {
        get: async (key) => null,
        set: async (key, value, ttl) => {},
      };
      mockQuery = {
        get: async (query) => null,
        set: async (query, value, ttl) => {},
      };

      optimizer = new CacheOptimizer({
        memoryCache: mockMemory,
        metadataCache: mockMetadata,
        queryCache: mockQuery,
      });
    });

    it('should hit L1 in-process cache', async () => {
      const key = 'test:1';
      const data = { id: 1, title: 'Test' };

      mockMemory.set(key, data);

      const result = await optimizer.get(key, async () => ({ id: 2 }));

      expect(result).toEqual(data);
      expect(optimizer.stats.byLayer.L1).toBe(1);
    });

    it('should promote from L2 to L1', async () => {
      const key = 'test:1';
      const data = { id: 1, title: 'Test' };

      mockMetadata.get = async () => data;

      const result = await optimizer.get(key, async () => ({ id: 2 }));

      expect(result).toEqual(data);
      expect(optimizer.stats.byLayer.L2).toBe(1);
      expect(mockMemory.has(key)).toBe(true);
    });

    it('should promote from L3 to L1 and L2', async () => {
      const key = 'test:1';
      const data = { id: 1, title: 'Test' };

      mockQuery.get = async () => data;

      const result = await optimizer.get(key, async () => ({ id: 2 }));

      expect(result).toEqual(data);
      expect(optimizer.stats.byLayer.L3).toBe(1);
      expect(mockMemory.has(key)).toBe(true);
    });

    it('should fetch from source on cache miss', async () => {
      const key = 'test:1';
      const data = { id: 1, title: 'Test' };

      const result = await optimizer.get(key, async () => data);

      expect(result).toEqual(data);
      expect(optimizer.stats.misses).toBe(1);
      expect(mockMemory.has(key)).toBe(true);
    });

    it('should calculate hit rate', async () => {
      // Create some hits and misses
      mockMemory.set('test:1', { id: 1 });

      await optimizer.get('test:1', async () => ({})); // L1 hit
      await optimizer.get('test:2', async () => ({ id: 2 })); // Miss
      await optimizer.get('test:1', async () => ({})); // L1 hit

      const stats = optimizer.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe('66.67%');
    });

    it('should generate HTTP cache headers', () => {
      const publicHeaders = optimizer.getHttpHeaders('public', 300);
      expect(publicHeaders['Cache-Control']).toContain('public');
      expect(publicHeaders['Cache-Control']).toContain('max-age=300');

      const privateHeaders = optimizer.getHttpHeaders('private', 600);
      expect(privateHeaders['Cache-Control']).toContain('private');

      const noCacheHeaders = optimizer.getHttpHeaders('no-cache');
      expect(noCacheHeaders['Cache-Control']).toContain('no-cache');
      expect(noCacheHeaders['Cache-Control']).toContain('no-store');
    });

    it('should generate ETags', () => {
      const data = { id: 1, title: 'Test' };
      const etag = optimizer.generateETag(data);

      expect(etag).toMatch(/^[a-f0-9]{16}$/); // 16 hex chars
      expect(etag).toHaveLength(16);
    });

    it('should generate consistent ETags for same data', () => {
      const data = { id: 1, title: 'Test' };

      const etag1 = optimizer.generateETag(data);
      const etag2 = optimizer.generateETag(data);

      expect(etag1).toBe(etag2);
    });

    it('should invalidate all layers', async () => {
      mockMemory.set('test:1', { id: 1 });
      mockMemory.set('test:2', { id: 2 });

      await optimizer.invalidateEntity('test');

      expect(mockMemory.size).toBe(0);
    });

    it('should clear all caches and reset stats', async () => {
      mockMemory.set('test:1', { id: 1 });
      optimizer.stats.hits = 5;
      optimizer.stats.misses = 2;

      await optimizer.clear();

      expect(mockMemory.size).toBe(0);
      expect(optimizer.stats.hits).toBe(0);
      expect(optimizer.stats.misses).toBe(0);
    });
  });

  describe('QueryOptimizationInterceptor', () => {
    let interceptor;
    let mockEntity;

    beforeEach(() => {
      interceptor = new QueryOptimizationInterceptor();
      mockEntity = {
        slug: 'ticket',
        fields: [
          { name: 'id', type: 'number' },
          { name: 'title', type: 'text' },
          { name: 'status', type: 'select' },
          { name: 'userId', type: 'relation', computed: false },
        ],
      };
    });

    it('should enforce pagination defaults', async () => {
      const request = { action: 'list', params: {} };

      await interceptor.handle(request, mockEntity, {});

      expect(request.params.page).toBe(1);
      expect(request.params.pageSize).toBe(25);
    });

    it('should enforce maximum page size', async () => {
      const request = { action: 'list', params: { pageSize: 500 } };

      await interceptor.handle(request, mockEntity, {});

      expect(request.params.pageSize).toBe(200); // Max enforced
    });

    it('should not optimize single record reads', async () => {
      const request = { action: 'read', params: {} };
      const originalParams = { ...request.params };

      await interceptor.handle(request, mockEntity, {});

      // read action shouldn't enforce pagination
      expect(request.params.page).toBeUndefined();
    });

    it('should optimize field projection', async () => {
      const request = {
        action: 'list',
        params: { fields: ['title', 'status'] },
      };

      await interceptor.handle(request, mockEntity, {});

      expect(request.params.fields).toContain('title');
      expect(request.params.fields).toContain('status');
    });

    it('should filter invalid requested fields', async () => {
      const request = {
        action: 'list',
        params: { fields: ['title', 'nonexistent'] },
      };

      await interceptor.handle(request, mockEntity, {});

      expect(request.params.fields).toContain('title');
      expect(request.params.fields).not.toContain('nonexistent');
    });

    it('should not load relations by default', async () => {
      const request = { action: 'list', params: {} };

      await interceptor.handle(request, mockEntity, {});

      expect(request.params.includeRelations).toBe(false);
    });

    it('should validate explicitly requested relations', async () => {
      const request = {
        action: 'list',
        params: { relations: ['userId', 'nonexistent'] },
      };

      await interceptor.handle(request, mockEntity, {});

      expect(request.params.relations).toContain('userId');
      expect(request.params.relations).not.toContain('nonexistent');
    });
  });

  describe('RateLimiter', () => {
    let limiter;

    beforeEach(() => {
      limiter = new RateLimiter({
        limits: {
          read: { requests: 100, window: 60 },
          create: { requests: 10, window: 60 },
        },
      });
    });

    it('should allow request within limit', () => {
      const status = limiter.checkLimit('user1', 'read');

      expect(status.allowed).toBe(true);
      expect(status.tokens).toBe(99);
    });

    it('should track tokens consumed', () => {
      limiter.checkLimit('user1', 'read');
      const status1 = limiter.checkLimit('user1', 'read');
      const status2 = limiter.checkLimit('user1', 'read');

      expect(status1.tokens).toBe(98);
      expect(status2.tokens).toBe(97);
    });

    it('should deny request exceeding limit', () => {
      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit('user2', 'create');
      }

      const status = limiter.checkLimit('user2', 'create');

      expect(status.allowed).toBe(false);
      expect(status.tokens).toBe(0);
    });

    it('should isolate limits per user', () => {
      const status1 = limiter.checkLimit('user1', 'read');
      const status2 = limiter.checkLimit('user2', 'read');

      expect(status1.tokens).toBe(99);
      expect(status2.tokens).toBe(99);
    });

    it('should isolate limits per action', () => {
      const readStatus = limiter.checkLimit('user3', 'read');
      const createStatus = limiter.checkLimit('user3', 'create');

      expect(readStatus.tokens).toBe(99); // 100 - 1
      expect(createStatus.tokens).toBe(9); // 10 - 1
    });

    it('should return current status', () => {
      limiter.checkLimit('user4', 'read');
      limiter.checkLimit('user4', 'read');

      const status = limiter.getStatus('user4', 'read');

      expect(status.remaining).toBe(98);
      expect(status.limit).toBe(100);
      expect(status.action).toBe('read');
    });

    it('should reset limits', () => {
      limiter.checkLimit('user5', 'read');
      limiter.checkLimit('user5', 'read');

      limiter.reset('user5', 'read');

      const status = limiter.getStatus('user5', 'read');
      expect(status.remaining).toBe(100);
    });

    it('should reset all actions for user', () => {
      limiter.checkLimit('user6', 'read');
      limiter.checkLimit('user6', 'create');

      limiter.reset('user6', '*');

      const readStatus = limiter.getStatus('user6', 'read');
      const createStatus = limiter.getStatus('user6', 'create');

      expect(readStatus.remaining).toBe(100);
      expect(createStatus.remaining).toBe(10);
    });

    it('should provide Express middleware', () => {
      const middleware = limiter.middleware('read');

      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next
    });

    it('should cleanup expired entries', () => {
      limiter.checkLimit('user7', 'read');
      limiter.checkLimit('user8', 'read');

      limiter.cleanup();

      // Entries shouldn't be cleaned immediately (not expired)
      expect(limiter.store.size).toBe(2);
    });

    it('should return default config', () => {
      const config = limiter.getConfig();

      expect(config.read).toBeDefined();
      expect(config.create).toBeDefined();
    });

    it('should update configuration', () => {
      limiter.updateConfig({ read: { requests: 500, window: 60 } });

      const status = limiter.checkLimit('user9', 'read');

      expect(status.limit).toBe(500);
    });
  });

  describe('ConnectionPoolManager', () => {
    it('should provide Prisma pool config', () => {
      const config = ConnectionPoolManager.getPrismaPoolConfig();

      expect(config.max).toBeGreaterThan(0);
      expect(config.idleTimeoutMillis).toBeGreaterThan(0);
      expect(config.connectionTimeoutMillis).toBeGreaterThan(0);
    });

    it('should provide Drizzle pool config', () => {
      const config = ConnectionPoolManager.getDrizzlePoolConfig();

      expect(config.min).toBeGreaterThan(0);
      expect(config.max).toBeGreaterThan(config.min);
      expect(config.idleTimeoutMillis).toBeGreaterThan(0);
    });

    it('should build connection URI with pool params', () => {
      const baseUri = 'mysql://user:pass@localhost:3306/db';
      const uri = ConnectionPoolManager.buildConnectionUri(baseUri, 'drizzle');

      expect(uri).toContain(baseUri);
      expect(uri).toContain('max=');
      expect(uri).toContain('min=');
    });

    it('should provide environment-specific configs', () => {
      const devConfig = ConnectionPoolManager.getPoolConfigForEnvironment('development');
      const prodConfig = ConnectionPoolManager.getPoolConfigForEnvironment('production');

      expect(devConfig.max).toBeLessThan(prodConfig.max);
    });

    it('should return development config by default', () => {
      const config = ConnectionPoolManager.getPoolConfigForEnvironment('unknown');

      expect(config.max).toBeLessThan(50);
    });
  });
});
