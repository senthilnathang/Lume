/**
 * Debounce and Throttle Utilities
 *
 * Provides debounce and throttle functions for performance optimization.
 *
 * Usage:
 * ```ts
 * import { debounce, throttle, useDebounce, useThrottle } from '#/utils/debounce';
 *
 * // Function debouncing
 * const debouncedSearch = debounce((query) => search(query), 300);
 *
 * // Reactive value debouncing
 * const searchTerm = ref('');
 * const debouncedTerm = useDebounce(searchTerm, 300);
 * ```
 */

import { ref, watch, type Ref } from 'vue';

/**
 * Debounce a function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean; maxWait?: number } = {},
): T & { cancel: () => void; flush: () => void } {
  const { leading = false, trailing = true, maxWait } = options;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let maxTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;
  let lastCallTime: number | null = null;
  let lastInvokeTime = 0;
  let result: ReturnType<T>;

  function invokeFunc(time: number): ReturnType<T> {
    const args = lastArgs!;
    const thisArg = lastThis;

    lastArgs = null;
    lastThis = null;
    lastInvokeTime = time;
    result = fn.apply(thisArg, args);
    return result;
  }

  function shouldInvoke(time: number): boolean {
    const timeSinceLastCall = lastCallTime ? time - lastCallTime : 0;
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === null ||
      timeSinceLastCall >= delay ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }

  function timerExpired(): void {
    const time = Date.now();
    if (shouldInvoke(time)) {
      trailingEdge(time);
    } else {
      const timeSinceLastCall = time - (lastCallTime || 0);
      const timeSinceLastInvoke = time - lastInvokeTime;
      const timeWaiting = delay - timeSinceLastCall;
      const maxRemaining =
        maxWait !== undefined ? maxWait - timeSinceLastInvoke : timeWaiting;

      timeoutId = setTimeout(timerExpired, Math.min(timeWaiting, maxRemaining));
    }
  }

  function leadingEdge(time: number): ReturnType<T> | undefined {
    lastInvokeTime = time;
    timeoutId = setTimeout(timerExpired, delay);
    return leading ? invokeFunc(time) : result;
  }

  function trailingEdge(time: number): ReturnType<T> | undefined {
    timeoutId = null;
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = null;
    lastThis = null;
    return result;
  }

  function cancel(): void {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (maxTimeoutId) {
      clearTimeout(maxTimeoutId);
    }
    lastInvokeTime = 0;
    lastArgs = null;
    lastCallTime = null;
    lastThis = null;
    timeoutId = null;
    maxTimeoutId = null;
  }

  function flush(): ReturnType<T> | undefined {
    if (timeoutId === null) {
      return result;
    }
    return trailingEdge(Date.now());
  }

  function debounced(this: any, ...args: Parameters<T>): ReturnType<T> | undefined {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeoutId === null) {
        return leadingEdge(time);
      }
      if (maxWait !== undefined) {
        timeoutId = setTimeout(timerExpired, delay);
        return invokeFunc(time);
      }
    }

    if (timeoutId === null) {
      timeoutId = setTimeout(timerExpired, delay);
    }

    return result;
  }

  debounced.cancel = cancel;
  debounced.flush = flush;

  return debounced as T & { cancel: () => void; flush: () => void };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number,
  options: { leading?: boolean; trailing?: boolean } = {},
): T & { cancel: () => void } {
  const { leading = true, trailing = true } = options;

  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime = 0;
  let result: ReturnType<T>;

  function invokeFunc(): ReturnType<T> {
    const args = lastArgs!;
    const thisArg = lastThis;
    lastArgs = null;
    lastThis = null;
    result = fn.apply(thisArg, args);
    return result;
  }

  function shouldInvoke(): boolean {
    const timeSinceLastCall = Date.now() - lastCallTime;
    return timeSinceLastCall >= limit;
  }

  function trailingEdge(): void {
    timeoutId = null;
    if (trailing && lastArgs) {
      throttled.apply(lastThis, lastArgs);
    }
  }

  function cancel(): void {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
    lastThis = null;
    lastCallTime = 0;
  }

  function throttled(this: any, ...args: Parameters<T>): ReturnType<T> | undefined {
    const now = Date.now();
    const isInvoking = shouldInvoke();

    lastArgs = args;
    lastThis = this;

    if (isInvoking) {
      if (timeoutId === null) {
        lastCallTime = now;
        if (leading) {
          return invokeFunc();
        }
      }
    }

    if (timeoutId === null && trailing) {
      timeoutId = setTimeout(trailingEdge, limit - (now - lastCallTime));
    }

    return result;
  }

  throttled.cancel = cancel;

  return throttled as T & { cancel: () => void };
}

/**
 * Reactive debounced value
 */
export function useDebounce<T>(value: Ref<T>, delay: number): Ref<T> {
  const debouncedValue = ref(value.value) as Ref<T>;

  const updateValue = debounce((newValue: T) => {
    debouncedValue.value = newValue;
  }, delay);

  watch(value, (newValue) => {
    updateValue(newValue);
  });

  return debouncedValue;
}

/**
 * Reactive throttled value
 */
export function useThrottle<T>(value: Ref<T>, limit: number): Ref<T> {
  const throttledValue = ref(value.value) as Ref<T>;

  const updateValue = throttle((newValue: T) => {
    throttledValue.value = newValue;
  }, limit);

  watch(value, (newValue) => {
    updateValue(newValue);
  });

  return throttledValue;
}

/**
 * Debounced callback composable
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
  options?: { leading?: boolean; trailing?: boolean; maxWait?: number },
) {
  return debounce(fn, delay, options);
}

/**
 * Throttled callback composable
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  fn: T,
  limit: number,
  options?: { leading?: boolean; trailing?: boolean },
) {
  return throttle(fn, limit, options);
}

export default { debounce, throttle, useDebounce, useThrottle };
