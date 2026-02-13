/**
 * Async Helper Utilities
 *
 * Provides utilities for optimizing async operations, including
 * parallel fetching and proper error handling.
 *
 * Common Anti-patterns to avoid:
 * ```ts
 * // BAD: Sequential fetches (slow)
 * await fetchA();
 * await fetchB();
 * await fetchC();
 *
 * // GOOD: Parallel fetches (fast)
 * await Promise.all([fetchA(), fetchB(), fetchC()]);
 *
 * // BETTER: With error handling
 * await parallelFetch([fetchA, fetchB, fetchC]);
 * ```
 */

import { ref, type Ref } from 'vue';
import { message } from 'ant-design-vue';

/**
 * Result of a parallel fetch operation
 */
export interface ParallelFetchResult<T> {
  data: T | null;
  error: Error | null;
  success: boolean;
}

/**
 * Execute multiple async functions in parallel with individual error handling
 * Unlike Promise.all, this doesn't fail fast - all operations complete
 */
export async function parallelFetch<T extends readonly (() => Promise<any>)[]>(
  fetchers: T,
): Promise<{ [K in keyof T]: ParallelFetchResult<Awaited<ReturnType<T[K]>>> }> {
  const results = await Promise.allSettled(fetchers.map((fn) => fn()));

  return results.map((result) => {
    if (result.status === 'fulfilled') {
      return { data: result.value, error: null, success: true };
    }
    return { data: null, error: result.reason, success: false };
  }) as any;
}

/**
 * Execute multiple async functions in parallel, collecting all results
 * Fails only if all fetches fail; partial success returns partial data
 */
export async function parallelFetchAll<T>(
  fetchers: Array<() => Promise<T>>,
  options: {
    errorMessage?: string;
    showPartialErrors?: boolean;
  } = {},
): Promise<{
  results: Array<T | null>;
  errors: Error[];
  hasErrors: boolean;
  allSucceeded: boolean;
}> {
  const { errorMessage = 'Some data failed to load', showPartialErrors = true } = options;

  const settled = await Promise.allSettled(fetchers.map((fn) => fn()));

  const results: Array<T | null> = [];
  const errors: Error[] = [];

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      results.push(null);
      errors.push(result.reason);
    }
  }

  if (errors.length > 0 && showPartialErrors) {
    console.error('Parallel fetch errors:', errors);
    if (errors.length === fetchers.length) {
      message.error(errorMessage);
    } else {
      message.warning(`${errorMessage} (${errors.length} failed)`);
    }
  }

  return {
    results,
    errors,
    hasErrors: errors.length > 0,
    allSucceeded: errors.length === 0,
  };
}

/**
 * Create a loading wrapper for multiple parallel fetches
 * Returns a loading ref and a fetch function
 */
export function useParallelLoader<T extends Record<string, () => Promise<any>>>(
  fetchers: T,
): {
  loading: Ref<boolean>;
  results: Ref<{ [K in keyof T]: Awaited<ReturnType<T[K]>> | null }>;
  errors: Ref<{ [K in keyof T]: Error | null }>;
  load: () => Promise<void>;
  reload: () => Promise<void>;
} {
  const loading = ref(false);
  const results = ref({}) as Ref<{ [K in keyof T]: Awaited<ReturnType<T[K]>> | null }>;
  const errors = ref({}) as Ref<{ [K in keyof T]: Error | null }>;

  // Initialize results and errors
  for (const key of Object.keys(fetchers)) {
    (results.value as any)[key] = null;
    (errors.value as any)[key] = null;
  }

  async function load() {
    loading.value = true;

    const keys = Object.keys(fetchers) as Array<keyof T>;
    const promises = keys.map((key) => fetchers[key]!());
    const settled = await Promise.allSettled(promises);

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]!;
      const result = settled[i]!;

      if (result.status === 'fulfilled') {
        (results.value as any)[key] = result.value;
        (errors.value as any)[key] = null;
      } else {
        (results.value as any)[key] = null;
        (errors.value as any)[key] = result.reason;
        console.error(`Failed to fetch ${String(key)}:`, result.reason);
      }
    }

    loading.value = false;
  }

  return {
    loading,
    results,
    errors,
    load,
    reload: load,
  };
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {},
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000, onRetry } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
        onRetry?.(attempt + 1, lastError);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Execute an async function with timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out',
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs),
    ),
  ]);
}

/**
 * Debounced async function that cancels previous calls
 */
export function debouncedAsync<T, A extends any[]>(
  fn: (...args: A) => Promise<T>,
  delay: number,
): (...args: A) => Promise<T | null> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let currentPromise: Promise<T> | null = null;

  return async (...args: A): Promise<T | null> => {
    // Cancel previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Wait for debounce delay
    return new Promise((resolve) => {
      timeoutId = setTimeout(async () => {
        currentPromise = fn(...args);
        try {
          const result = await currentPromise;
          resolve(result);
        } catch (error) {
          resolve(null);
        }
      }, delay);
    });
  };
}

/**
 * Sequential execution helper (when order matters)
 * Use this when operations must run in sequence
 */
export async function sequentialExecute<T>(
  operations: Array<() => Promise<T>>,
  options: {
    stopOnError?: boolean;
    onProgress?: (completed: number, total: number) => void;
  } = {},
): Promise<{
  results: Array<T | null>;
  errors: Error[];
  completedCount: number;
}> {
  const { stopOnError = false, onProgress } = options;

  const results: Array<T | null> = [];
  const errors: Error[] = [];
  let completedCount = 0;

  for (let i = 0; i < operations.length; i++) {
    try {
      const result = await operations[i]!();
      results.push(result);
      completedCount++;
      onProgress?.(completedCount, operations.length);
    } catch (error) {
      results.push(null);
      errors.push(error as Error);

      if (stopOnError) {
        break;
      }
    }
  }

  return { results, errors, completedCount };
}

/**
 * Batch operations into chunks for rate limiting
 */
export async function batchExecute<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  options: {
    batchSize?: number;
    delayBetweenBatches?: number;
    onBatchComplete?: (batchIndex: number, results: Array<R | null>) => void;
  } = {},
): Promise<Array<R | null>> {
  const { batchSize = 5, delayBetweenBatches = 100, onBatchComplete } = options;

  const results: Array<R | null> = [];
  const batches: T[][] = [];

  // Split into batches
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  // Process each batch
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]!;

    const batchResults = await Promise.allSettled(batch.map((item) => operation(item)));

    const batchParsed = batchResults.map((result) =>
      result.status === 'fulfilled' ? result.value : null,
    );

    results.push(...batchParsed);
    onBatchComplete?.(batchIndex, batchParsed);

    // Delay between batches (except for last batch)
    if (batchIndex < batches.length - 1 && delayBetweenBatches > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return results;
}
