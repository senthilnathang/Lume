import { computed } from 'vue';

import { useBreakpoints, breakpointsTailwind } from '@vueuse/core';

export function useIsMobile() {
  const breakpoints = useBreakpoints(breakpointsTailwind);

  const isMobile = computed(() => breakpoints.smaller('md'));

  return {
    isMobile,
  };
}
