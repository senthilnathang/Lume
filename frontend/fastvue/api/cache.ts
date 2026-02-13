/**
 * Cached API Layer
 *
 * This module provides cached versions of commonly-used API calls.
 * Reference data like companies rarely change and can be safely cached
 * for extended periods.
 *
 * Benefits:
 * - Reduces redundant API calls across views
 * - Improves perceived performance
 * - Automatic deduplication of in-flight requests
 * - Stale-while-revalidate support
 *
 * Usage:
 * ```ts
 * // In component
 * import { useCachedCompanies } from '#/api/cache';
 *
 * const { data: companies, loading } = useCachedCompanies();
 * ```
 */

import { createCachedApi } from '#/composables/useApiCache';
import { getCompaniesApi } from '#/api/core/base';

// =============================================================================
// CACHE DURATION CONSTANTS
// =============================================================================

/** Reference data that rarely changes - 30 minutes */
const REFERENCE_DATA_TTL = 30 * 60 * 1000;

// =============================================================================
// CACHED REFERENCE DATA APIs
// =============================================================================

/**
 * Cached companies list
 * TTL: 30 minutes
 */
export const useCachedCompanies = createCachedApi(
  'companies',
  getCompaniesApi,
  {
    ttl: REFERENCE_DATA_TTL,
    immediate: true,
  },
);

// =============================================================================
// UTILITY: PRELOAD COMMON DATA
// =============================================================================

/**
 * Preload commonly used reference data
 * Call this on app initialization or dashboard load
 *
 * @example
 * ```ts
 * // In App.vue or main layout
 * onMounted(() => {
 *   preloadReferenceData();
 * });
 * ```
 */
export async function preloadReferenceData(): Promise<void> {
  // Preload companies for multi-company support
  await Promise.allSettled([
    useCachedCompanies().fetch(),
  ]);
}

/**
 * Invalidate all reference data caches
 * Call this when bulk operations might have changed reference data
 */
export function invalidateAllReferenceData(): void {
  useCachedCompanies().invalidate();
}
