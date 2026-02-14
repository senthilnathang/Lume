/**
 * API Cache Composable
 * TTL-based caching with request deduplication and stale-while-revalidate.
 * Useful for reference data (departments, categories) shared across components.
 */
import { ref, shallowRef, type Ref, type ShallowRef } from 'vue';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Global cache storage (shared across all instances)
const globalCache = new Map<string, CacheEntry<any>>();

// Pending requests for deduplication
const pendingRequests = new Map<string, Promise<any>>();

export interface UseApiCacheOptions<T> {
  /** Time-to-live in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Whether to fetch immediately on creation */
  immediate?: boolean;
  /** Return stale data while revalidating in background */
  staleWhileRevalidate?: boolean;
  /** Transform data after fetch */
  transform?: (data: T) => T;
  /** Custom cache key generator */
  cacheKeyGenerator?: (params?: Record<string, any>) => string;
  /** Callback on successful fetch */
  onSuccess?: (data: T) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Composable for caching API responses with TTL, deduplication, and stale-while-revalidate.
 *
 * @example
 * ```ts
 * const { data: categories, fetch, loading } = useApiCache(
 *   'categories',
 *   () => get('/categories'),
 *   { ttl: 30 * 60 * 1000 } // 30 minutes
 * );
 *
 * // Stale-while-revalidate
 * const { data: stats } = useApiCache(
 *   'dashboard-stats',
 *   () => get('/dashboard/stats'),
 *   { ttl: 60000, staleWhileRevalidate: true }
 * );
 * ```
 */
export function useApiCache<T>(
  cacheKey: string,
  fetcher: (params?: Record<string, any>) => Promise<T>,
  options: UseApiCacheOptions<T> = {},
) {
  const {
    ttl = 5 * 60 * 1000,
    immediate = false,
    staleWhileRevalidate = false,
    transform,
    cacheKeyGenerator,
    onSuccess,
    onError,
  } = options;

  const data = shallowRef<T | null>(null) as ShallowRef<T | null>;
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const isStale = ref(false);
  const lastFetched = ref<number | null>(null);
  let currentParams: Record<string, any> | undefined;

  function generateKey(params?: Record<string, any>): string {
    if (cacheKeyGenerator) {
      return cacheKeyGenerator(params);
    }
    if (!params || Object.keys(params).length === 0) {
      return cacheKey;
    }
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    return `${cacheKey}:${sortedParams}`;
  }

  function getCachedEntry(key: string): CacheEntry<T> | null {
    return globalCache.get(key) || null;
  }

  function setCacheEntry(key: string, value: T): void {
    const now = Date.now();
    globalCache.set(key, {
      data: value,
      timestamp: now,
      expiresAt: now + ttl,
    });
  }

  function isCacheValid(): boolean {
    const key = generateKey(currentParams);
    const entry = getCachedEntry(key);
    if (!entry) return false;
    return Date.now() < entry.expiresAt;
  }

  async function fetchFromNetwork(key: string, params?: Record<string, any>): Promise<T | null> {
    // Deduplication: reuse in-flight request for same key
    const pending = pendingRequests.get(key);
    if (pending) {
      try {
        return await pending;
      } finally {
        loading.value = false;
      }
    }

    loading.value = true;
    error.value = null;

    const request = (async () => {
      try {
        let result = await fetcher(params);
        if (transform) {
          result = transform(result);
        }

        setCacheEntry(key, result);
        data.value = result;
        lastFetched.value = Date.now();
        isStale.value = false;

        onSuccess?.(result);
        return result;
      } catch (e) {
        const err = e as Error;
        error.value = err;
        onError?.(err);
        return null;
      } finally {
        loading.value = false;
        pendingRequests.delete(key);
      }
    })();

    pendingRequests.set(key, request);
    return request;
  }

  async function fetch(params?: Record<string, any>, force = false): Promise<T | null> {
    currentParams = params;
    const key = generateKey(params);

    if (!force) {
      const cached = getCachedEntry(key);
      if (cached) {
        const isValid = Date.now() < cached.expiresAt;

        if (isValid) {
          data.value = cached.data;
          lastFetched.value = cached.timestamp;
          isStale.value = false;
          return cached.data;
        } else if (staleWhileRevalidate) {
          data.value = cached.data;
          lastFetched.value = cached.timestamp;
          isStale.value = true;
          fetchFromNetwork(key, params).catch(console.error);
          return cached.data;
        }
      }
    }

    return fetchFromNetwork(key, params);
  }

  function refresh(params?: Record<string, any>): Promise<T | null> {
    return fetch(params ?? currentParams, true);
  }

  function invalidate(): void {
    const key = generateKey(currentParams);
    globalCache.delete(key);
    isStale.value = true;
  }

  function invalidatePrefix(prefix: string): void {
    for (const key of globalCache.keys()) {
      if (key.startsWith(prefix)) {
        globalCache.delete(key);
      }
    }
  }

  function setData(newData: T): void {
    data.value = newData;
    const key = generateKey(currentParams);
    setCacheEntry(key, newData);
  }

  function updateData(updater: (current: T | null) => T | null): void {
    const updated = updater(data.value);
    if (updated !== null) {
      setData(updated);
    }
  }

  if (immediate) {
    fetch();
  }

  return {
    data,
    loading,
    error,
    isStale,
    lastFetched,
    fetch,
    refresh,
    invalidate,
    invalidatePrefix,
    isCacheValid,
    setData,
    updateData,
  };
}

/**
 * Factory to create a reusable cached API function
 *
 * @example
 * ```ts
 * export const cachedCategories = createCachedApi(
 *   'categories',
 *   () => get('/categories'),
 *   { ttl: 30 * 60 * 1000 }
 * );
 *
 * // In component:
 * const { data, fetch } = cachedCategories();
 * ```
 */
export function createCachedApi<T>(
  cacheKey: string,
  fetcher: (params?: Record<string, any>) => Promise<T>,
  defaultOptions: UseApiCacheOptions<T> = {},
) {
  return (options?: UseApiCacheOptions<T>) => {
    return useApiCache<T>(cacheKey, fetcher, { ...defaultOptions, ...options });
  };
}

/**
 * Clear all cached data
 */
export function clearAllApiCache(): void {
  globalCache.clear();
}
