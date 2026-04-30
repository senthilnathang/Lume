import { jest } from '@jest/globals';
import { PermissionCache } from '../../src/core/permissions/cache.js';

describe('PermissionCache', () => {
  describe('initialization', () => {
    it('should initialize with defaults and custom config', () => {
      const cacheDefault = new PermissionCache();
      expect(cacheDefault.getStats()).toEqual({ hits: 0, misses: 0, size: 0 });

      const cacheCustom = new PermissionCache({ maxSize: 500, defaultTTL: 600 });
      expect(cacheCustom.getStats()).toEqual({ hits: 0, misses: 0, size: 0 });
    });
  });

  describe('get/set', () => {
    it('should cache permission results', () => {
      const cache = new PermissionCache();
      const result = {
        allowed: true,
        reason: 'User has admin role',
        fieldPermissions: {},
        queryFilters: [],
      };

      cache.set('perm:user1:ticket:read', result);
      const retrieved = cache.get('perm:user1:ticket:read');

      expect(retrieved).toEqual(result);
      expect(cache.getStats().size).toBe(1);
    });

    it('should return null for missing keys', () => {
      const cache = new PermissionCache();
      const result = cache.get('nonexistent:key');
      expect(result).toBeNull();
    });
  });

  describe('TTL expiration', () => {
    it('should expire cached entries after TTL', async () => {
      const cache = new PermissionCache({ defaultTTL: 1 });
      const result = {
        allowed: true,
        reason: 'Test',
        fieldPermissions: {},
        queryFilters: [],
      };

      cache.set('perm:user1:resource:action', result);
      expect(cache.get('perm:user1:resource:action')).not.toBeNull();

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const expired = cache.get('perm:user1:resource:action');
      expect(expired).toBeNull();
    });
  });

  describe('LRU eviction', () => {
    it('should evict least-recently-used entry when maxSize exceeded', () => {
      const cache = new PermissionCache({ maxSize: 3 });
      const result1 = { allowed: true, reason: 'Test1', fieldPermissions: {}, queryFilters: [] };
      const result2 = { allowed: false, reason: 'Test2', fieldPermissions: {}, queryFilters: [] };
      const result3 = { allowed: true, reason: 'Test3', fieldPermissions: {}, queryFilters: [] };
      const result4 = { allowed: false, reason: 'Test4', fieldPermissions: {}, queryFilters: [] };

      // Add 3 entries
      cache.set('key1', result1);
      cache.set('key2', result2);
      cache.set('key3', result3);
      expect(cache.getStats().size).toBe(3);

      // Access key1 to make it recently used
      cache.get('key1');

      // Add 4th entry - should evict key2 (least recently used)
      cache.set('key4', result4);
      expect(cache.getStats().size).toBe(3);

      expect(cache.get('key1')).not.toBeNull(); // Still there
      expect(cache.get('key2')).toBeNull(); // Evicted
      expect(cache.get('key3')).not.toBeNull(); // Still there
      expect(cache.get('key4')).not.toBeNull(); // Newly added
    });
  });

  describe('generateKey', () => {
    it('should generate consistent cache keys', () => {
      const cache = new PermissionCache();
      const key1 = cache.generateKey('user123', 'ticket', 'read');
      const key2 = cache.generateKey('user123', 'ticket', 'read');

      expect(key1).toBe(key2);
      expect(key1).toBe('perm:user123:ticket:read');
    });

    it('should generate different keys for different inputs', () => {
      const cache = new PermissionCache();
      const key1 = cache.generateKey('user1', 'ticket', 'read');
      const key2 = cache.generateKey('user2', 'ticket', 'read');
      const key3 = cache.generateKey('user1', 'document', 'read');
      const key4 = cache.generateKey('user1', 'ticket', 'write');

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key1).not.toBe(key4);
    });
  });

  describe('getStats', () => {
    it('should track cache hits and misses', () => {
      const cache = new PermissionCache();
      const result = { allowed: true, reason: 'Test', fieldPermissions: {}, queryFilters: [] };

      // Setup: Add some entries
      cache.set('key1', result);
      cache.set('key2', result);

      expect(cache.getStats()).toEqual({ hits: 0, misses: 0, size: 2 });

      // Hit: Existing entry
      cache.get('key1');
      expect(cache.getStats().hits).toBe(1);
      expect(cache.getStats().misses).toBe(0);

      // Miss: Non-existent entry
      cache.get('nonexistent');
      expect(cache.getStats().hits).toBe(1);
      expect(cache.getStats().misses).toBe(1);

      // Hit: Another existing entry
      cache.get('key2');
      expect(cache.getStats().hits).toBe(2);
      expect(cache.getStats().misses).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all cached entries', () => {
      const cache = new PermissionCache();
      const result = { allowed: true, reason: 'Test', fieldPermissions: {}, queryFilters: [] };

      cache.set('key1', result);
      cache.set('key2', result);
      cache.set('key3', result);
      expect(cache.getStats().size).toBe(3);

      cache.clear();
      expect(cache.getStats().size).toBe(0);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });
  });

  describe('resetStats', () => {
    it('should reset hit/miss counters', () => {
      const cache = new PermissionCache();
      const result = { allowed: true, reason: 'Test', fieldPermissions: {}, queryFilters: [] };

      cache.set('key1', result);
      cache.get('key1'); // Hit
      cache.get('nonexistent'); // Miss

      expect(cache.getStats().hits).toBe(1);
      expect(cache.getStats().misses).toBe(1);

      cache.resetStats();
      expect(cache.getStats().hits).toBe(0);
      expect(cache.getStats().misses).toBe(0);
      expect(cache.getStats().size).toBe(1); // Size should not be reset
    });
  });
});
