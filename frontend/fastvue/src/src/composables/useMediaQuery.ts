/**
 * Media Query Composable
 *
 * Provides reactive media query matching for responsive design.
 *
 * Usage:
 * ```ts
 * import { useMediaQuery, useBreakpoints } from '#/composables';
 *
 * // Custom query
 * const isDark = useMediaQuery('(prefers-color-scheme: dark)');
 *
 * // Breakpoints
 * const { isMobile, isTablet, isDesktop, current } = useBreakpoints();
 *
 * if (isMobile.value) {
 *   showMobileLayout();
 * }
 * ```
 */

import { ref, computed, onMounted, onUnmounted, type Ref, type ComputedRef } from 'vue';

/**
 * Single media query composable
 */
export function useMediaQuery(query: string): Ref<boolean> {
  const matches = ref(false);

  let mediaQuery: MediaQueryList | null = null;

  function updateMatches(event?: MediaQueryListEvent): void {
    matches.value = event?.matches ?? mediaQuery?.matches ?? false;
  }

  onMounted(() => {
    if (typeof window !== 'undefined') {
      mediaQuery = window.matchMedia(query);
      matches.value = mediaQuery.matches;

      // Modern API
      if ('addEventListener' in mediaQuery) {
        mediaQuery.addEventListener('change', updateMatches);
      } else {
        // Legacy API
        (mediaQuery as any).addListener(updateMatches);
      }
    }
  });

  onUnmounted(() => {
    if (mediaQuery) {
      if ('removeEventListener' in mediaQuery) {
        mediaQuery.removeEventListener('change', updateMatches);
      } else {
        (mediaQuery as any).removeListener(updateMatches);
      }
    }
  });

  return matches;
}

/**
 * Breakpoint definitions
 */
export interface Breakpoints {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

export const defaultBreakpoints: Breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export type BreakpointKey = keyof Breakpoints;

export interface UseBreakpointsReturn {
  /** Current breakpoint name */
  current: ComputedRef<BreakpointKey>;
  /** Current window width */
  width: Ref<number>;
  /** Is mobile (< sm) */
  isMobile: ComputedRef<boolean>;
  /** Is tablet (sm - lg) */
  isTablet: ComputedRef<boolean>;
  /** Is desktop (>= lg) */
  isDesktop: ComputedRef<boolean>;
  /** Greater than breakpoint */
  greater: (bp: BreakpointKey) => ComputedRef<boolean>;
  /** Greater or equal to breakpoint */
  greaterOrEqual: (bp: BreakpointKey) => ComputedRef<boolean>;
  /** Smaller than breakpoint */
  smaller: (bp: BreakpointKey) => ComputedRef<boolean>;
  /** Smaller or equal to breakpoint */
  smallerOrEqual: (bp: BreakpointKey) => ComputedRef<boolean>;
  /** Between breakpoints (inclusive) */
  between: (min: BreakpointKey, max: BreakpointKey) => ComputedRef<boolean>;
  /** Is specific breakpoint */
  isBreakpoint: (bp: BreakpointKey) => ComputedRef<boolean>;
}

/**
 * Breakpoints composable
 */
export function useBreakpoints(
  breakpoints: Breakpoints = defaultBreakpoints,
): UseBreakpointsReturn {
  const width = ref(typeof window !== 'undefined' ? window.innerWidth : 0);

  // Update width on resize
  function updateWidth(): void {
    width.value = window.innerWidth;
  }

  onMounted(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateWidth, { passive: true });
      updateWidth();
    }
  });

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', updateWidth);
    }
  });

  // Get breakpoint value
  function getBpValue(bp: BreakpointKey): number {
    return breakpoints[bp];
  }

  // Get sorted breakpoints
  const sortedBreakpoints = Object.entries(breakpoints)
    .sort(([, a], [, b]) => b - a) as [BreakpointKey, number][];

  // Current breakpoint
  const current = computed<BreakpointKey>(() => {
    for (const [name, value] of sortedBreakpoints) {
      if (width.value >= value) {
        return name;
      }
    }
    return 'xs';
  });

  // Convenience flags
  const isMobile = computed(() => width.value < breakpoints.sm);
  const isTablet = computed(() => width.value >= breakpoints.sm && width.value < breakpoints.lg);
  const isDesktop = computed(() => width.value >= breakpoints.lg);

  // Query functions
  function greater(bp: BreakpointKey): ComputedRef<boolean> {
    return computed(() => width.value > getBpValue(bp));
  }

  function greaterOrEqual(bp: BreakpointKey): ComputedRef<boolean> {
    return computed(() => width.value >= getBpValue(bp));
  }

  function smaller(bp: BreakpointKey): ComputedRef<boolean> {
    return computed(() => width.value < getBpValue(bp));
  }

  function smallerOrEqual(bp: BreakpointKey): ComputedRef<boolean> {
    return computed(() => width.value <= getBpValue(bp));
  }

  function between(min: BreakpointKey, max: BreakpointKey): ComputedRef<boolean> {
    return computed(
      () => width.value >= getBpValue(min) && width.value < getBpValue(max),
    );
  }

  function isBreakpoint(bp: BreakpointKey): ComputedRef<boolean> {
    return computed(() => current.value === bp);
  }

  return {
    current,
    width,
    isMobile,
    isTablet,
    isDesktop,
    greater,
    greaterOrEqual,
    smaller,
    smallerOrEqual,
    between,
    isBreakpoint,
  };
}

/**
 * Prefer reduced motion
 */
export function usePrefersReducedMotion(): Ref<boolean> {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * Prefer color scheme
 */
export function usePrefersColorScheme(): ComputedRef<'light' | 'dark'> {
  const isDark = useMediaQuery('(prefers-color-scheme: dark)');
  return computed(() => (isDark.value ? 'dark' : 'light'));
}

export default useMediaQuery;
