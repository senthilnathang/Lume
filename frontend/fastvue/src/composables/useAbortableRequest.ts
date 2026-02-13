/**
 * Abortable Request Composable
 *
 * Provides request cancellation capabilities using AbortController.
 * Useful for:
 * - Search-as-you-type (cancel previous search when new one starts)
 * - Navigation away (cancel pending requests)
 * - Filter changes (cancel outdated filter requests)
 *
 * Benefits:
 * - Prevents race conditions from stale responses
 * - Reduces unnecessary network traffic
 * - Improves perceived performance
 * - Cleans up on component unmount
 *
 * @example
 * ```ts
 * const { execute, abort, isAborted } = useAbortableRequest();
 *
 * // In search handler - automatically cancels previous request
 * async function handleSearch(query: string) {
 *   const result = await execute(
 *     (signal) => searchApi(query, { signal }),
 *     { cancelPrevious: true }
 *   );
 * }
 * ```
 */

import { onUnmounted, ref, type Ref } from 'vue';

export interface AbortableRequestOptions {
  /** Cancel any previous pending request before starting new one */
  cancelPrevious?: boolean;
  /** Timeout in milliseconds (auto-abort after timeout) */
  timeout?: number;
  /** Callback when request is aborted */
  onAbort?: () => void;
  /** Callback on error (non-abort errors) */
  onError?: (error: Error) => void;
}

export interface UseAbortableRequestReturn<T> {
  /** Execute an abortable request */
  execute: (
    fetcher: (signal: AbortSignal) => Promise<T>,
    options?: AbortableRequestOptions,
  ) => Promise<T | null>;
  /** Abort current request */
  abort: (reason?: string) => void;
  /** Whether last request was aborted */
  isAborted: Ref<boolean>;
  /** Whether request is currently pending */
  isPending: Ref<boolean>;
  /** Current abort controller (for external use) */
  controller: Ref<AbortController | null>;
}

/**
 * Composable for managing abortable HTTP requests
 */
export function useAbortableRequest<T = any>(): UseAbortableRequestReturn<T> {
  const controller = ref<AbortController | null>(null);
  const isAborted = ref(false);
  const isPending = ref(false);

  /**
   * Abort the current request
   */
  function abort(reason = 'Request cancelled') {
    if (controller.value) {
      controller.value.abort(reason);
      controller.value = null;
      isAborted.value = true;
      isPending.value = false;
    }
  }

  /**
   * Execute an abortable request
   */
  async function execute(
    fetcher: (signal: AbortSignal) => Promise<T>,
    options: AbortableRequestOptions = {},
  ): Promise<T | null> {
    const { cancelPrevious = true, timeout, onAbort, onError } = options;

    // Cancel previous request if configured
    if (cancelPrevious && controller.value) {
      abort('Superseded by new request');
    }

    // Create new controller
    const newController = new AbortController();
    controller.value = newController;
    isAborted.value = false;
    isPending.value = true;

    // Setup timeout if specified
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    if (timeout) {
      timeoutId = setTimeout(() => {
        newController.abort('Request timeout');
      }, timeout);
    }

    try {
      const result = await fetcher(newController.signal);
      return result;
    } catch (error) {
      // Check if this was an abort
      if (error instanceof DOMException && error.name === 'AbortError') {
        isAborted.value = true;
        onAbort?.();
        return null;
      }

      // Handle other errors
      onError?.(error as Error);
      throw error;
    } finally {
      // Cleanup
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      isPending.value = false;

      // Clear controller if it's still the current one
      if (controller.value === newController) {
        controller.value = null;
      }
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    abort('Component unmounted');
  });

  return {
    execute,
    abort,
    isAborted,
    isPending,
    controller,
  };
}

/**
 * Create a search handler with automatic request cancellation
 *
 * @example
 * ```ts
 * const search = useAbortableSearch(
 *   async (query, signal) => {
 *     return await searchEmployeesApi({ search: query }, { signal });
 *   },
 *   {
 *     debounce: 300,
 *     minLength: 2,
 *     onResults: (results) => { items.value = results; },
 *   }
 * );
 *
 * // In template
 * <Input @input="search" />
 * ```
 */
export function useAbortableSearch<T>(
  searchFn: (query: string, signal: AbortSignal) => Promise<T>,
  options: {
    debounce?: number;
    minLength?: number;
    onResults?: (results: T) => void;
    onError?: (error: Error) => void;
    onEmpty?: () => void;
  } = {},
) {
  const { debounce = 300, minLength = 0, onResults, onError, onEmpty } = options;

  const { execute, abort, isPending, isAborted } = useAbortableRequest<T>();
  const searchText = ref('');
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function search(query: string) {
    searchText.value = query;

    // Clear previous debounce
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Handle empty/short queries
    if (!query || query.length < minLength) {
      abort('Query too short');
      onEmpty?.();
      return;
    }

    // Debounce the search
    debounceTimer = setTimeout(async () => {
      try {
        const result = await execute((signal) => searchFn(query, signal));

        if (result !== null) {
          onResults?.(result);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          onError?.(error as Error);
        }
      }
    }, debounce);
  }

  // Cleanup
  onUnmounted(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
  });

  return {
    search,
    abort,
    isPending,
    isAborted,
    searchText,
  };
}

/**
 * Hook for making axios/fetch requests abortable
 *
 * @example
 * ```ts
 * // With axios
 * const { signal } = useRequestSignal();
 * await axios.get('/api/data', { signal });
 *
 * // With fetch
 * await fetch('/api/data', { signal });
 * ```
 */
export function useRequestSignal() {
  const controller = ref(new AbortController());

  function reset() {
    controller.value = new AbortController();
  }

  function abort(reason?: string) {
    controller.value.abort(reason);
    reset();
  }

  onUnmounted(() => {
    controller.value.abort('Component unmounted');
  });

  return {
    signal: controller.value.signal,
    controller,
    abort,
    reset,
  };
}

/**
 * Create a pool of abortable requests for managing multiple concurrent operations
 *
 * @example
 * ```ts
 * const pool = useRequestPool();
 *
 * // Add requests with unique keys
 * pool.add('search', searchApi(query, { signal: pool.getSignal('search') }));
 * pool.add('filter', filterApi(filters, { signal: pool.getSignal('filter') }));
 *
 * // Cancel specific request
 * pool.abort('search');
 *
 * // Cancel all
 * pool.abortAll();
 * ```
 */
export function useRequestPool() {
  const controllers = new Map<string, AbortController>();
  const pending = ref(new Set<string>());

  function getSignal(key: string): AbortSignal {
    // Abort existing request with same key
    if (controllers.has(key)) {
      controllers.get(key)!.abort('Superseded');
    }

    // Create new controller
    const controller = new AbortController();
    controllers.set(key, controller);
    pending.value.add(key);

    return controller.signal;
  }

  async function add<T>(key: string, promise: Promise<T>): Promise<T | null> {
    try {
      const result = await promise;
      return result;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return null;
      }
      throw error;
    } finally {
      pending.value.delete(key);
      controllers.delete(key);
    }
  }

  function abort(key: string, reason = 'Cancelled') {
    const controller = controllers.get(key);
    if (controller) {
      controller.abort(reason);
      controllers.delete(key);
      pending.value.delete(key);
    }
  }

  function abortAll(reason = 'All cancelled') {
    for (const [_key, controller] of controllers) {
      controller.abort(reason);
    }
    controllers.clear();
    pending.value.clear();
  }

  function isPending(key: string): boolean {
    return pending.value.has(key);
  }

  function hasPending(): boolean {
    return pending.value.size > 0;
  }

  onUnmounted(() => {
    abortAll('Component unmounted');
  });

  return {
    getSignal,
    add,
    abort,
    abortAll,
    isPending,
    hasPending,
    pendingKeys: pending,
  };
}
