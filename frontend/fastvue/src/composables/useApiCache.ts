import { ref, shallowRef, type Ref, type ShallowRef } from 'vue';

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Global cache storage
 * Using Map for O(1) lookups
 */
const globalCache = new Map<string, CacheEntry<any>>();

/**
 * Pending requests map for deduplication
 */
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Options for useApiCache
 */
export interface UseApiCacheOptions<T> {
  /** Time-to-live in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Whether to fetch immediately on creation */
  immediate?: boolean;
  /** Whether to use stale data while revalidating */
  staleWhileRevalidate?: boolean;
  /** Transform data after fetch */
  transform?: (data: T) => T;
  /** Custom cache key generator */
  cacheKeyGenerator?: (params?: Record<string, any>) => string;
  /** Whether to persist cache in sessionStorage */
  persist?: boolean;
  /** Callback on successful fetch */
  onSuccess?: (data: T) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Return type for useApiCache
 */
export interface UseApiCacheReturn<T> {
  /** Cached data */
  data: ShallowRef<T | null>;
  /** Loading state */
  loading: Ref<boolean>;
  /** Error state */
  error: Ref<Error | null>;
  /** Whether data is stale */
  isStale: Ref<boolean>;
  /** Last fetch timestamp */
  lastFetched: Ref<number | null>;
  /** Fetch data (uses cache if valid) */
  fetch: (params?: Record<string, any>, force?: boolean) => Promise<T | null>;
  /** Force refresh (ignores cache) */
  refresh: (params?: Record<string, any>) => Promise<T | null>;
  /** Invalidate cache */
  invalidate: () => void;
  /** Clear all caches with matching prefix */
  invalidatePrefix: (prefix: string) => void;
  /** Check if cache is valid */
  isCacheValid: () => boolean;
  /** Set data manually (useful for optimistic updates) */
  setData: (data: T) => void;
  /** Update data partially */
  updateData: (updater: (current: T | null) => T | null) => void;
}

/**
 * Composable for caching API responses with TTL, deduplication, and stale-while-revalidate.
 *
 * @example
 * ```ts
 * // Simple usage
 * const { data: departments, fetch, loading } = useApiCache(
 *   'departments',
 *   getDepartmentsApi,
 *   { ttl: 30 * 60 * 1000 } // 30 minutes
 * );
 *
 * // With parameters
 * const { data: employees, fetch } = useApiCache(
 *   'employees',
 *   getEmployeesApi,
 *   { immediate: false }
 * );
 * await fetch({ department_id: 1 }); // Cache key: employees:department_id=1
 *
 * // Stale-while-revalidate pattern
 * const { data: stats } = useApiCache(
 *   'dashboard-stats',
 *   getDashboardStatsApi,
 *   { ttl: 60000, staleWhileRevalidate: true }
 * );
 * ```
 */
export function useApiCache<T>(
  cacheKey: string,
  fetcher: (params?: Record<string, any>) => Promise<T>,
  options: UseApiCacheOptions<T> = {},
): UseApiCacheReturn<T> {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    immediate = false,
    staleWhileRevalidate = false,
    transform,
    cacheKeyGenerator,
    persist = false,
    onSuccess,
    onError,
  } = options;

  const data = shallowRef<T | null>(null) as ShallowRef<T | null>;
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const isStale = ref(false);
  const lastFetched = ref<number | null>(null);
  let currentParams: Record<string, any> | undefined;

  /**
   * Generate cache key from base key and params
   */
  function generateCacheKey(params?: Record<string, any>): string {
    if (cacheKeyGenerator) {
      return cacheKeyGenerator(params);
    }

    if (!params || Object.keys(params).length === 0) {
      return cacheKey;
    }

    // Sort params for consistent keys
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${JSON.stringify(params[key])}`)
      .join('&');

    return `${cacheKey}:${sortedParams}`;
  }

  /**
   * Get cached entry if valid
   */
  function getCachedEntry(key: string): CacheEntry<T> | null {
    // Try memory cache first
    let entry = globalCache.get(key);

    // Try session storage if persist is enabled
    if (!entry && persist) {
      try {
        const stored = sessionStorage.getItem(`api-cache:${key}`);
        if (stored) {
          entry = JSON.parse(stored);
          if (entry) {
            // Restore to memory cache
            globalCache.set(key, entry);
          }
        }
      } catch {
        // Ignore storage errors
      }
    }

    return entry || null;
  }

  /**
   * Set cache entry
   */
  function setCacheEntry(key: string, value: T): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: now,
      expiresAt: now + ttl,
    };

    globalCache.set(key, entry);

    // Persist to session storage if enabled
    if (persist) {
      try {
        sessionStorage.setItem(`api-cache:${key}`, JSON.stringify(entry));
      } catch {
        // Ignore storage errors (quota exceeded, etc.)
      }
    }
  }

  /**
   * Check if cache is valid for given key
   */
  function isCacheValid(key?: string): boolean {
    const targetKey = key || generateCacheKey(currentParams);
    const entry = getCachedEntry(targetKey);

    if (!entry) return false;

    return Date.now() < entry.expiresAt;
  }

  /**
   * Fetch data with caching and deduplication
   */
  async function fetch(
    params?: Record<string, any>,
    force = false,
  ): Promise<T | null> {
    currentParams = params;
    const key = generateCacheKey(params);

    // Check cache first (unless forced)
    if (!force) {
      const cached = getCachedEntry(key);
      if (cached) {
        const now = Date.now();
        const isValid = now < cached.expiresAt;

        if (isValid) {
          // Cache hit - return cached data
          data.value = cached.data;
          lastFetched.value = cached.timestamp;
          isStale.value = false;
          return cached.data;
        } else if (staleWhileRevalidate) {
          // Stale data available - return it but revalidate in background
          data.value = cached.data;
          lastFetched.value = cached.timestamp;
          isStale.value = true;

          // Background revalidation
          fetchFromNetwork(key, params).catch(console.error);
          return cached.data;
        }
      }
    }

    return fetchFromNetwork(key, params);
  }

  /**
   * Fetch from network with deduplication
   */
  async function fetchFromNetwork(
    key: string,
    params?: Record<string, any>,
  ): Promise<T | null> {
    // Check for pending request (deduplication)
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

        // Apply transform if provided
        if (transform) {
          result = transform(result) as Awaited<T>;
        }

        // Update cache
        setCacheEntry(key, result);

        // Update state
        data.value = result;
        lastFetched.value = Date.now();
        isStale.value = false;

        onSuccess?.(result);
        return result;
      } catch (e) {
        const err = e as Error;
        error.value = err;
        onError?.(err);
        console.error(`useApiCache error [${key}]:`, e);
        return null;
      } finally {
        loading.value = false;
        pendingRequests.delete(key);
      }
    })();

    // Store pending request for deduplication
    pendingRequests.set(key, request);

    return request;
  }

  /**
   * Force refresh (bypass cache)
   */
  function refresh(params?: Record<string, any>): Promise<T | null> {
    return fetch(params ?? currentParams, true);
  }

  /**
   * Invalidate cache for this key
   */
  function invalidate(): void {
    const key = generateCacheKey(currentParams);
    globalCache.delete(key);

    if (persist) {
      try {
        sessionStorage.removeItem(`api-cache:${key}`);
      } catch {
        // Ignore
      }
    }

    isStale.value = true;
  }

  /**
   * Invalidate all caches with matching prefix
   */
  function invalidatePrefix(prefix: string): void {
    // Memory cache
    for (const key of globalCache.keys()) {
      if (key.startsWith(prefix)) {
        globalCache.delete(key);
      }
    }

    // Session storage
    if (persist) {
      try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          if (key?.startsWith(`api-cache:${prefix}`)) {
            sessionStorage.removeItem(key);
          }
        }
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Set data manually (for optimistic updates)
   */
  function setData(newData: T): void {
    data.value = newData;
    const key = generateCacheKey(currentParams);
    setCacheEntry(key, newData);
  }

  /**
   * Update data partially
   */
  function updateData(updater: (current: T | null) => T | null): void {
    const updated = updater(data.value);
    if (updated !== null) {
      setData(updated);
    }
  }

  // Fetch immediately if configured
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
    isCacheValid: () => isCacheValid(),
    setData,
    updateData,
  };
}

/**
 * Utility to create cached API function
 * Useful for reference data that should be shared across components
 *
 * @example
 * ```ts
 * // In api/cache.ts
 * export const cachedDepartments = createCachedApi(
 *   'departments',
 *   getDepartmentsApi,
 *   { ttl: 30 * 60 * 1000 }
 * );
 *
 * // In component
 * const { data, fetch } = cachedDepartments();
 * ```
 */
export function createCachedApi<T, P extends Record<string, any> = Record<string, any>>(
  cacheKey: string,
  fetcher: (params?: P) => Promise<T>,
  defaultOptions: UseApiCacheOptions<T> = {},
) {
  return (options?: UseApiCacheOptions<T>) => {
    return useApiCache<T>(cacheKey, fetcher as (params?: Record<string, any>) => Promise<T>, { ...defaultOptions, ...options });
  };
}

/**
 * Clear all cached data
 */
export function clearAllApiCache(): void {
  globalCache.clear();

  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('api-cache:')) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore
  }
}

/**
 * Get cache statistics (useful for debugging)
 */
export function getApiCacheStats(): {
  entryCount: number;
  keys: string[];
  totalSize: number;
} {
  const keys = Array.from(globalCache.keys());
  let totalSize = 0;

  for (const [_, entry] of globalCache) {
    totalSize += JSON.stringify(entry).length;
  }

  return {
    entryCount: globalCache.size,
    keys,
    totalSize,
  };
}
