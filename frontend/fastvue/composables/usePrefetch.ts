/**
 * Prefetching Composables
 *
 * Provides intelligent prefetching for pagination and navigation.
 * Improves perceived performance by loading data before user needs it.
 *
 * Strategies:
 * - Pagination: Prefetch next page when user reaches current page
 * - Hover: Prefetch on link/button hover
 * - Idle: Prefetch during browser idle time
 * - Viewport: Prefetch when element enters viewport
 *
 * @example
 * ```ts
 * const { items, prefetchNext, isPrefetching } = usePaginatedPrefetch(
 *   getEmployeesApi,
 *   { prefetchAhead: 1 }
 * );
 * ```
 */

import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  watch,
  type Ref,
  type ShallowRef,
} from 'vue';

/**
 * Prefetch cache entry
 */
interface PrefetchCacheEntry<T> {
  data: T;
  timestamp: number;
  page: number;
}

/**
 * Options for paginated prefetch
 */
export interface UsePaginatedPrefetchOptions {
  /** Number of pages to prefetch ahead (default: 1) */
  prefetchAhead?: number;
  /** Initial page size */
  pageSize?: number;
  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTTL?: number;
  /** Whether to prefetch immediately on mount */
  immediate?: boolean;
  /** Prefetch during idle time */
  useIdleCallback?: boolean;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  count: number;
  results: T[];
  next?: string | null;
  previous?: string | null;
}

/**
 * Return type for usePaginatedPrefetch
 */
export interface UsePaginatedPrefetchReturn<T> {
  /** Current page items */
  items: ShallowRef<T[]>;
  /** Total count */
  total: Ref<number>;
  /** Current page (1-indexed) */
  currentPage: Ref<number>;
  /** Page size */
  pageSize: Ref<number>;
  /** Loading state for current page */
  loading: Ref<boolean>;
  /** Prefetching state */
  isPrefetching: Ref<boolean>;
  /** Whether next page is available */
  hasNextPage: Ref<boolean>;
  /** Whether previous page is available */
  hasPreviousPage: Ref<boolean>;
  /** Total pages */
  totalPages: Ref<number>;

  // Methods
  /** Go to specific page */
  goToPage: (page: number) => Promise<void>;
  /** Go to next page */
  nextPage: () => Promise<void>;
  /** Go to previous page */
  previousPage: () => Promise<void>;
  /** Manually trigger prefetch for a page */
  prefetch: (page: number) => Promise<void>;
  /** Clear prefetch cache */
  clearCache: () => void;
  /** Refresh current page */
  refresh: () => Promise<void>;
}

/**
 * Composable for paginated data with automatic prefetching
 */
export function usePaginatedPrefetch<T>(
  fetcher: (params: { page: number; page_size: number }) => Promise<PaginatedResponse<T>>,
  options: UsePaginatedPrefetchOptions = {},
): UsePaginatedPrefetchReturn<T> {
  const {
    prefetchAhead = 1,
    pageSize: initialPageSize = 20,
    cacheTTL = 5 * 60 * 1000,
    immediate = true,
    useIdleCallback = true,
  } = options;

  // State
  const items = shallowRef<T[]>([]) as ShallowRef<T[]>;
  const total = ref(0);
  const currentPage = ref(1);
  const pageSize = ref(initialPageSize);
  const loading = ref(false);
  const isPrefetching = ref(false);

  // Cache
  const cache = new Map<number, PrefetchCacheEntry<T[]>>();

  // Computed
  const totalPages = computed(() => Math.ceil(total.value / pageSize.value));
  const hasNextPage = computed(() => currentPage.value < totalPages.value);
  const hasPreviousPage = computed(() => currentPage.value > 1);

  /**
   * Check if cache entry is valid
   */
  function isCacheValid(page: number): boolean {
    const entry = cache.get(page);
    if (!entry) return false;
    return Date.now() - entry.timestamp < cacheTTL;
  }

  /**
   * Get cached data for a page
   */
  function getCached(page: number): T[] | null {
    if (!isCacheValid(page)) {
      cache.delete(page);
      return null;
    }
    return cache.get(page)!.data;
  }

  /**
   * Set cache entry
   */
  function setCache(page: number, data: T[]) {
    cache.set(page, {
      data,
      timestamp: Date.now(),
      page,
    });
  }

  /**
   * Fetch a specific page
   */
  async function fetchPage(page: number, isPrefetech = false): Promise<T[]> {
    // Check cache first
    const cached = getCached(page);
    if (cached) {
      return cached;
    }

    if (isPrefetech) {
      isPrefetching.value = true;
    } else {
      loading.value = true;
    }

    try {
      const response = await fetcher({
        page,
        page_size: pageSize.value,
      });

      total.value = response.count;
      const data = response.results || [];
      setCache(page, data);

      return data;
    } finally {
      if (isPrefetech) {
        isPrefetching.value = false;
      } else {
        loading.value = false;
      }
    }
  }

  /**
   * Prefetch pages ahead
   */
  async function prefetchAheadPages() {
    const pagesToPrefetch: number[] = [];

    // Prefetch next pages
    for (let i = 1; i <= prefetchAhead; i++) {
      const nextPage = currentPage.value + i;
      if (nextPage <= totalPages.value && !isCacheValid(nextPage)) {
        pagesToPrefetch.push(nextPage);
      }
    }

    if (pagesToPrefetch.length === 0) return;

    // Use requestIdleCallback if available and enabled
    if (useIdleCallback && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(async () => {
        for (const page of pagesToPrefetch) {
          await fetchPage(page, true);
        }
      });
    } else {
      // Fallback: prefetch after a short delay
      setTimeout(async () => {
        for (const page of pagesToPrefetch) {
          await fetchPage(page, true);
        }
      }, 100);
    }
  }

  /**
   * Go to a specific page
   */
  async function goToPage(page: number) {
    if (page < 1 || page > totalPages.value) return;

    currentPage.value = page;
    const data = await fetchPage(page);
    items.value = data;

    // Trigger prefetch for next pages
    prefetchAheadPages();
  }

  /**
   * Go to next page
   */
  async function nextPage() {
    if (hasNextPage.value) {
      await goToPage(currentPage.value + 1);
    }
  }

  /**
   * Go to previous page
   */
  async function previousPage() {
    if (hasPreviousPage.value) {
      await goToPage(currentPage.value - 1);
    }
  }

  /**
   * Manually prefetch a page
   */
  async function prefetch(page: number) {
    if (page < 1 || page > totalPages.value) return;
    if (isCacheValid(page)) return;

    await fetchPage(page, true);
  }

  /**
   * Clear prefetch cache
   */
  function clearCache() {
    cache.clear();
  }

  /**
   * Refresh current page
   */
  async function refresh() {
    cache.delete(currentPage.value);
    await goToPage(currentPage.value);
  }

  // Initial fetch
  onMounted(() => {
    if (immediate) {
      goToPage(1);
    }
  });

  // Watch page size changes
  watch(pageSize, () => {
    clearCache();
    goToPage(1);
  });

  return {
    items,
    total,
    currentPage,
    pageSize,
    loading,
    isPrefetching,
    hasNextPage,
    hasPreviousPage,
    totalPages,
    goToPage,
    nextPage,
    previousPage,
    prefetch,
    clearCache,
    refresh,
  };
}

/**
 * Prefetch on hover composable
 *
 * @example
 * ```vue
 * <Button v-bind="hoverProps" @click="navigateToDetail">
 *   View Details
 * </Button>
 * ```
 */
export function usePrefetchOnHover(
  prefetchFn: () => Promise<void>,
  options: {
    delay?: number;
    onlyOnce?: boolean;
  } = {},
) {
  const { delay = 100, onlyOnce = true } = options;

  const hasPrefetched = ref(false);
  const isPrefetching = ref(false);
  let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

  function onMouseEnter() {
    if (onlyOnce && hasPrefetched.value) return;

    hoverTimeout = setTimeout(async () => {
      isPrefetching.value = true;
      try {
        await prefetchFn();
        hasPrefetched.value = true;
      } catch (error) {
        console.error('Prefetch failed:', error);
      } finally {
        isPrefetching.value = false;
      }
    }, delay);
  }

  function onMouseLeave() {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
  }

  onUnmounted(() => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
  });

  return {
    hoverProps: {
      onMouseenter: onMouseEnter,
      onMouseleave: onMouseLeave,
    },
    isPrefetching,
    hasPrefetched,
  };
}

/**
 * Prefetch when element enters viewport
 *
 * @example
 * ```ts
 * const { elementRef } = usePrefetchOnVisible(() => fetchDetailData(id));
 * ```
 */
export function usePrefetchOnVisible(
  prefetchFn: () => Promise<void>,
  options: {
    rootMargin?: string;
    threshold?: number;
    onlyOnce?: boolean;
  } = {},
) {
  const { rootMargin = '100px', threshold = 0.1, onlyOnce = true } = options;

  const elementRef = ref<HTMLElement | null>(null);
  const hasPrefetched = ref(false);
  const isPrefetching = ref(false);
  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    if (!elementRef.value) return;

    observer = new IntersectionObserver(
      async (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          if (onlyOnce && hasPrefetched.value) return;

          isPrefetching.value = true;
          try {
            await prefetchFn();
            hasPrefetched.value = true;

            if (onlyOnce && observer && elementRef.value) {
              observer.unobserve(elementRef.value);
            }
          } catch (error) {
            console.error('Prefetch failed:', error);
          } finally {
            isPrefetching.value = false;
          }
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(elementRef.value);
  });

  onUnmounted(() => {
    if (observer) {
      observer.disconnect();
    }
  });

  return {
    elementRef,
    isPrefetching,
    hasPrefetched,
  };
}

/**
 * Prefetch during browser idle time
 *
 * @example
 * ```ts
 * useIdlePrefetch([
 *   () => prefetchDepartments(),
 *   () => prefetchPositions(),
 *   () => prefetchEmployeeTypes(),
 * ]);
 * ```
 */
export function useIdlePrefetch(
  prefetchFns: Array<() => Promise<void>>,
  options: {
    timeout?: number;
    onComplete?: () => void;
  } = {},
) {
  const { timeout = 2000, onComplete } = options;

  const completed = ref(0);
  const total = prefetchFns.length;
  const isComplete = computed(() => completed.value >= total);

  onMounted(() => {
    if (!('requestIdleCallback' in window)) {
      // Fallback: run after delay
      setTimeout(async () => {
        for (const fn of prefetchFns) {
          try {
            await fn();
            completed.value++;
          } catch (error) {
            console.error('Idle prefetch failed:', error);
          }
        }
        onComplete?.();
      }, 1000);
      return;
    }

    let index = 0;

    function scheduleNext(deadline: IdleDeadline) {
      while (index < prefetchFns.length && deadline.timeRemaining() > 0) {
        const fn = prefetchFns[index]!;
        fn()
          .then(() => {
            completed.value++;
          })
          .catch((error) => {
            console.error('Idle prefetch failed:', error);
          });
        index++;
      }

      if (index < prefetchFns.length) {
        (window as any).requestIdleCallback(scheduleNext, { timeout });
      } else {
        onComplete?.();
      }
    }

    (window as any).requestIdleCallback(scheduleNext, { timeout });
  });

  return {
    completed,
    total,
    isComplete,
    progress: computed(() => (total > 0 ? completed.value / total : 0)),
  };
}

/**
 * Route prefetching for navigation
 *
 * @example
 * ```ts
 * const { prefetchRoute } = useRoutePrefetch();
 *
 * // Prefetch route data on hover
 * <RouterLink @mouseenter="prefetchRoute('/employees/123')">
 * ```
 */
export function useRoutePrefetch(
  routeDataFetchers: Record<string, (params: Record<string, string>) => Promise<void>>,
) {
  const prefetched = ref(new Set<string>());

  function prefetchRoute(path: string, params: Record<string, string> = {}) {
    if (prefetched.value.has(path)) return;

    // Find matching route pattern
    for (const [pattern, fetcher] of Object.entries(routeDataFetchers)) {
      const regex = new RegExp('^' + pattern.replace(/:\w+/g, '([^/]+)') + '$');
      const match = path.match(regex);

      if (match) {
        // Extract params from path
        const paramNames = pattern.match(/:\w+/g)?.map((p) => p.slice(1)) || [];
        const extractedParams: Record<string, string> = { ...params };

        paramNames.forEach((name, index) => {
          extractedParams[name] = match[index + 1] || '';
        });

        // Execute prefetch
        fetcher(extractedParams)
          .then(() => {
            prefetched.value.add(path);
          })
          .catch((error) => {
            console.error('Route prefetch failed:', error);
          });

        break;
      }
    }
  }

  return {
    prefetchRoute,
    prefetched,
  };
}
