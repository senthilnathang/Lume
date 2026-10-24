import { ReadThroughCache, menuCache } from '../../src/core/services/read-through-cache.js';

describe('read-through cache (F6.2)', () => {
  test('caches loads until TTL expiry', async () => {
    let now = 1000;
    const cache = new ReadThroughCache({ ttlMs: 100, clock: { now: () => now } });
    let calls = 0;
    const loader = async () => ({ n: ++calls });
    expect(await cache.load(['a'], loader)).toEqual({ n: 1 });
    expect(await cache.load(['a'], loader)).toEqual({ n: 1 });
    expect(cache.stats()).toMatchObject({ hits: 1, misses: 1 });
    now += 101;
    expect(await cache.load(['a'], loader)).toEqual({ n: 2 });
  });

  test('invalidate and prefix invalidation', async () => {
    const cache = new ReadThroughCache();
    await cache.load(['menu', 'location', 'header'], async () => 1);
    await cache.load(['menu', 'location', 'footer'], async () => 2);
    await cache.load(['settings', 'x'], async () => 3);
    expect(cache.invalidatePrefix(['menu'])).toBe(2);
    expect(cache.get(['menu', 'location', 'header'])).toBeUndefined();
    expect(cache.get(['settings', 'x'])).toBe(3);
  });

  test('evicts oldest past capacity and reports stats', async () => {
    const cache = new ReadThroughCache({ maxEntries: 2 });
    await cache.load(['a'], async () => 1);
    await cache.load(['b'], async () => 2);
    await cache.load(['c'], async () => 3);
    expect(cache.get(['a'])).toBeUndefined();
    expect(cache.stats()).toMatchObject({ entries: 2 });
    expect(cache.clear()).toBe(2);
  });

  test('shared menu cache instance exists', () => {
    expect(menuCache).toBeTruthy();
    expect(typeof menuCache.load).toBe('function');
  });
});
