/**
 * Storage Composables
 *
 * Provides reactive localStorage and sessionStorage with type safety.
 *
 * Usage:
 * ```ts
 * import { useLocalStorage, useSessionStorage } from '#/composables';
 *
 * // Persists to localStorage
 * const theme = useLocalStorage('theme', 'light');
 * theme.value = 'dark'; // Auto-saves
 *
 * // Session only
 * const token = useSessionStorage('auth-token', '');
 * ```
 */

import { ref, watch, type Ref } from 'vue';

export interface UseStorageOptions<T> {
  /** Custom serializer */
  serializer?: {
    read: (value: string) => T;
    write: (value: T) => string;
  };
  /** Merge default with stored value (for objects) */
  mergeDefaults?: boolean;
  /** Listen for storage events from other tabs */
  listenToStorageChanges?: boolean;
  /** Error handler */
  onError?: (error: Error) => void;
}

/**
 * Default JSON serializer
 */
const defaultSerializer = {
  read: <T>(value: string): T => JSON.parse(value),
  write: <T>(value: T): string => JSON.stringify(value),
};

/**
 * Create a reactive storage value
 */
function useStorage<T>(
  key: string,
  defaultValue: T,
  storage: Storage | undefined,
  options: UseStorageOptions<T> = {},
): Ref<T> {
  const {
    serializer = defaultSerializer,
    mergeDefaults = false,
    listenToStorageChanges = true,
    onError = console.error,
  } = options;

  const data = ref<T>(defaultValue) as Ref<T>;

  // Read initial value
  function read(): T {
    if (!storage) return defaultValue;

    try {
      const rawValue = storage.getItem(key);
      if (rawValue === null) {
        return defaultValue;
      }

      const value = serializer.read(rawValue);

      // Merge with defaults for objects
      if (mergeDefaults && typeof defaultValue === 'object' && !Array.isArray(defaultValue)) {
        return { ...defaultValue, ...value };
      }

      return value;
    } catch (error) {
      onError(error as Error);
      return defaultValue;
    }
  }

  // Write value to storage
  function write(value: T): void {
    if (!storage) return;

    try {
      if (value === null || value === undefined) {
        storage.removeItem(key);
      } else {
        storage.setItem(key, serializer.write(value));
      }
    } catch (error) {
      onError(error as Error);
    }
  }

  // Initialize with stored value
  data.value = read();

  // Watch for changes and persist
  watch(
    data,
    (newValue) => {
      write(newValue);
    },
    { deep: true },
  );

  // Listen for changes from other tabs
  if (listenToStorageChanges && typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key === key && event.storageArea === storage) {
        data.value = event.newValue ? serializer.read(event.newValue) : defaultValue;
      }
    });
  }

  return data;
}

/**
 * Reactive localStorage
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options?: UseStorageOptions<T>,
): Ref<T> {
  const storage = typeof window !== 'undefined' ? window.localStorage : undefined;
  return useStorage(key, defaultValue, storage, options);
}

/**
 * Reactive sessionStorage
 */
export function useSessionStorage<T>(
  key: string,
  defaultValue: T,
  options?: UseStorageOptions<T>,
): Ref<T> {
  const storage = typeof window !== 'undefined' ? window.sessionStorage : undefined;
  return useStorage(key, defaultValue, storage, options);
}

/**
 * Remove item from localStorage
 */
export function removeLocalStorage(key: string): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(key);
  }
}

/**
 * Remove item from sessionStorage
 */
export function removeSessionStorage(key: string): void {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(key);
  }
}

/**
 * Clear all localStorage
 */
export function clearLocalStorage(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.clear();
  }
}

/**
 * Clear all sessionStorage
 */
export function clearSessionStorage(): void {
  if (typeof window !== 'undefined') {
    window.sessionStorage.clear();
  }
}

export default { useLocalStorage, useSessionStorage };
