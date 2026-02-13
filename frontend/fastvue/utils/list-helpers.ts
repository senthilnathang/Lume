/**
 * List Helper Utilities
 *
 * Provides computed helpers for common list operations that should NOT
 * be done in templates (to avoid re-computation on every render).
 *
 * ANTI-PATTERN (creates new array on every render):
 * ```vue
 * <div v-for="item in items.slice(0, 5)" :key="item.id">
 * ```
 *
 * CORRECT PATTERN (computed once, cached):
 * ```ts
 * const limitedItems = useLimitedList(items, 5);
 * ```
 * ```vue
 * <div v-for="item in limitedItems" :key="item.id">
 * ```
 */

import { computed, type Ref, type ComputedRef } from 'vue';

/**
 * Create a computed ref that limits an array to a max number of items
 * Memoized - only recalculates when source array changes
 */
export function useLimitedList<T>(
  source: Ref<T[]>,
  limit: number,
): ComputedRef<T[]> {
  return computed(() => source.value.slice(0, limit));
}

/**
 * Create a computed ref with offset and limit (pagination-style)
 */
export function useSlicedList<T>(
  source: Ref<T[]>,
  offset: number,
  limit: number,
): ComputedRef<T[]> {
  return computed(() => source.value.slice(offset, offset + limit));
}

/**
 * Create a computed ref that filters and limits
 */
export function useFilteredLimitedList<T>(
  source: Ref<T[]>,
  filterFn: (item: T) => boolean,
  limit: number,
): ComputedRef<T[]> {
  return computed(() => source.value.filter(filterFn).slice(0, limit));
}

/**
 * Create a computed ref that sorts and limits
 */
export function useSortedLimitedList<T>(
  source: Ref<T[]>,
  sortFn: (a: T, b: T) => number,
  limit: number,
): ComputedRef<T[]> {
  return computed(() => [...source.value].sort(sortFn).slice(0, limit));
}

/**
 * Get the last N items from a list (useful for "recent" displays)
 */
export function useLastItems<T>(source: Ref<T[]>, count: number): ComputedRef<T[]> {
  return computed(() => source.value.slice(-count));
}

/**
 * Group items by a key and return as object
 * Useful for grouped displays (by category, status, etc.)
 */
export function useGroupedList<T, K extends string | number>(
  source: Ref<T[]>,
  keyFn: (item: T) => K,
): ComputedRef<Record<K, T[]>> {
  return computed(() => {
    const groups = {} as Record<K, T[]>;
    for (const item of source.value) {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    }
    return groups;
  });
}

/**
 * Create entries from grouped data for v-for with proper keys
 * Returns array of [key, items] tuples
 */
export function useGroupedEntries<T, K extends string | number>(
  source: Ref<T[]>,
  keyFn: (item: T) => K,
): ComputedRef<[K, T[]][]> {
  return computed(() => {
    const groups = {} as Record<K, T[]>;
    for (const item of source.value) {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    }
    return Object.entries(groups) as [K, T[]][];
  });
}

/**
 * Capitalize first letter of a string
 * Use this instead of doing it in template
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert snake_case to Title Case
 */
export function snakeToTitle(str: string): string {
  if (!str) return '';
  return str
    .split('_')
    .map((word) => capitalize(word))
    .join(' ');
}

/**
 * Create a computed map of items by ID for O(1) lookup
 */
export function useItemMap<T extends { id: number | string }>(
  source: Ref<T[]>,
): ComputedRef<Map<number | string, T>> {
  return computed(() => new Map(source.value.map((item) => [item.id, item])));
}

/**
 * Create a computed set of IDs for O(1) existence check
 */
export function useIdSet<T extends { id: number | string }>(
  source: Ref<T[]>,
): ComputedRef<Set<number | string>> {
  return computed(() => new Set(source.value.map((item) => item.id)));
}

/**
 * Create computed stats from a list
 */
export function useListStats<T>(
  source: Ref<T[]>,
  valueFn: (item: T) => number,
): ComputedRef<{
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
}> {
  return computed(() => {
    const items = source.value;
    if (items.length === 0) {
      return { count: 0, sum: 0, avg: 0, min: 0, max: 0 };
    }

    let sum = 0;
    let min = Infinity;
    let max = -Infinity;

    for (const item of items) {
      const value = valueFn(item);
      sum += value;
      if (value < min) min = value;
      if (value > max) max = value;
    }

    return {
      count: items.length,
      sum,
      avg: sum / items.length,
      min: min === Infinity ? 0 : min,
      max: max === -Infinity ? 0 : max,
    };
  });
}

/**
 * Create a unique key generator for v-for with grouped data
 * Handles the case where you're iterating over Object.entries
 */
export function createGroupKey(groupName: string | number, index: number): string {
  return `group-${groupName}-${index}`;
}

/**
 * Memoized filter by status
 */
export function useFilteredByStatus<T extends { status?: string }>(
  source: Ref<T[]>,
  status: string,
): ComputedRef<T[]> {
  return computed(() => source.value.filter((item) => item.status === status));
}

/**
 * Get count by status (for stats cards)
 */
export function useCountByStatus<T extends { status?: string }>(
  source: Ref<T[]>,
): ComputedRef<Record<string, number>> {
  return computed(() => {
    const counts: Record<string, number> = {};
    for (const item of source.value) {
      const status = item.status || 'unknown';
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  });
}
