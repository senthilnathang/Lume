import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  watch,
  type Ref,
  type ShallowRef,
} from 'vue';

/**
 * Options for useVirtualList
 */
export interface UseVirtualListOptions<T> {
  /** Height of each item in pixels */
  itemHeight: number | ((item: T, index: number) => number);
  /** Number of items to render above/below visible area */
  overscan?: number;
  /** Container height (if not auto-detected) */
  containerHeight?: number;
  /** Unique key extractor for items */
  keyExtractor?: (item: T, index: number) => string | number;
  /** Horizontal scrolling mode */
  horizontal?: boolean;
}

/**
 * Virtual list item with positioning info
 */
export interface VirtualItem<T> {
  /** Original item data */
  data: T;
  /** Index in source array */
  index: number;
  /** Unique key */
  key: string | number;
  /** Offset from start (px) */
  offset: number;
  /** Item size (px) */
  size: number;
}

/**
 * Return type for useVirtualList
 */
export interface UseVirtualListReturn<T> {
  /** Container element ref - bind to scrollable container */
  containerRef: Ref<HTMLElement | undefined>;
  /** Wrapper element ref - bind to content wrapper */
  wrapperRef: Ref<HTMLElement | undefined>;
  /** Virtual items to render */
  virtualItems: ShallowRef<VirtualItem<T>[]>;
  /** Total content height/width */
  totalSize: Ref<number>;
  /** Current scroll offset */
  scrollOffset: Ref<number>;
  /** Visible range [start, end] */
  visibleRange: Ref<[number, number]>;
  /** Whether currently scrolling */
  isScrolling: Ref<boolean>;
  /** Wrapper style (apply to content wrapper) */
  wrapperStyle: Ref<Record<string, string>>;
  /** Container style (apply to scroll container) */
  containerStyle: Ref<Record<string, string>>;

  // Methods
  /** Scroll to specific index */
  scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' }) => void;
  /** Scroll to specific offset */
  scrollToOffset: (offset: number) => void;
  /** Force recalculation of sizes */
  measure: () => void;
  /** Get item offset by index */
  getItemOffset: (index: number) => number;
  /** Get item at offset */
  getItemAtOffset: (offset: number) => number;
}

/**
 * Composable for efficiently rendering large lists with virtual scrolling.
 * Only renders items visible in the viewport + overscan buffer.
 *
 * @example
 * ```vue
 * <script setup>
 * const items = ref(Array.from({ length: 10000 }, (_, i) => ({ id: i, name: `Item ${i}` })));
 *
 * const {
 *   containerRef,
 *   wrapperRef,
 *   virtualItems,
 *   wrapperStyle,
 *   containerStyle,
 *   scrollToIndex,
 * } = useVirtualList(items, {
 *   itemHeight: 50,
 *   overscan: 5,
 * });
 * </script>
 *
 * <template>
 *   <div ref="containerRef" :style="containerStyle" class="h-[400px] overflow-auto">
 *     <div ref="wrapperRef" :style="wrapperStyle">
 *       <div
 *         v-for="item in virtualItems"
 *         :key="item.key"
 *         :style="{ transform: `translateY(${item.offset}px)`, height: `${item.size}px` }"
 *         class="absolute left-0 right-0"
 *       >
 *         {{ item.data.name }}
 *       </div>
 *     </div>
 *   </div>
 * </template>
 * ```
 */
export function useVirtualList<T>(
  items: Ref<T[]>,
  options: UseVirtualListOptions<T>,
): UseVirtualListReturn<T> {
  const {
    itemHeight,
    overscan = 3,
    containerHeight: initialContainerHeight,
    keyExtractor = (_, index) => index,
    horizontal = false,
  } = options;

  // Refs
  const containerRef = ref<HTMLElement>();
  const wrapperRef = ref<HTMLElement>();
  const scrollOffset = ref(0);
  const containerSize = ref(initialContainerHeight || 0);
  const isScrolling = ref(false);

  // Scroll timeout for isScrolling state
  let scrollingTimeout: ReturnType<typeof setTimeout> | null = null;

  // Size cache for variable height items
  const sizeCache = new Map<number, number>();

  /**
   * Get size for an item
   */
  function getItemSize(item: T, index: number): number {
    if (typeof itemHeight === 'number') {
      return itemHeight;
    }

    // Check cache first
    const cached = sizeCache.get(index);
    if (cached !== undefined) {
      return cached;
    }

    // Calculate and cache
    const size = itemHeight(item, index);
    sizeCache.set(index, size);
    return size;
  }

  /**
   * Calculate total content size
   */
  const totalSize = computed(() => {
    if (typeof itemHeight === 'number') {
      return items.value.length * itemHeight;
    }

    let total = 0;
    for (let i = 0; i < items.value.length; i++) {
      total += getItemSize(items.value[i]!, i);
    }
    return total;
  });

  /**
   * Get offset for item at index
   */
  function getItemOffset(index: number): number {
    if (typeof itemHeight === 'number') {
      return index * itemHeight;
    }

    let offset = 0;
    for (let i = 0; i < index && i < items.value.length; i++) {
      offset += getItemSize(items.value[i]!, i);
    }
    return offset;
  }

  /**
   * Get item index at offset
   */
  function getItemAtOffset(offset: number): number {
    if (typeof itemHeight === 'number') {
      return Math.floor(offset / itemHeight);
    }

    let accumulated = 0;
    for (let i = 0; i < items.value.length; i++) {
      const size = getItemSize(items.value[i]!, i);
      if (accumulated + size > offset) {
        return i;
      }
      accumulated += size;
    }
    return items.value.length - 1;
  }

  /**
   * Calculate visible range
   */
  const visibleRange = computed<[number, number]>(() => {
    const itemCount = items.value.length;
    if (itemCount === 0 || containerSize.value === 0) {
      return [0, 0];
    }

    // Find start index
    const startIndex = Math.max(0, getItemAtOffset(scrollOffset.value) - overscan);

    // Find end index
    const endOffset = scrollOffset.value + containerSize.value;
    let endIndex = getItemAtOffset(endOffset) + overscan;
    endIndex = Math.min(itemCount - 1, endIndex);

    return [startIndex, endIndex];
  });

  /**
   * Generate virtual items for rendering
   */
  const virtualItems = shallowRef<VirtualItem<T>[]>([]);

  function updateVirtualItems() {
    const [start, end] = visibleRange.value;
    const newItems: VirtualItem<T>[] = [];

    for (let i = start; i <= end && i < items.value.length; i++) {
      const item = items.value[i]!;
      newItems.push({
        data: item,
        index: i,
        key: keyExtractor(item, i),
        offset: getItemOffset(i),
        size: getItemSize(item, i),
      });
    }

    virtualItems.value = newItems;
  }

  // Watch for changes
  watch([visibleRange, items], () => {
    updateVirtualItems();
  }, { immediate: true });

  /**
   * Wrapper style for positioning
   */
  const wrapperStyle = computed(() => {
    const size = `${totalSize.value}px`;
    return {
      position: 'relative' as const,
      [horizontal ? 'width' : 'height']: size,
      [horizontal ? 'height' : 'width']: '100%',
    };
  });

  /**
   * Container style
   */
  const containerStyle = computed(() => ({
    overflow: 'auto',
    [horizontal ? 'overflowY' : 'overflowX']: 'hidden',
  }));

  /**
   * Handle scroll event
   */
  function handleScroll() {
    if (!containerRef.value) return;

    scrollOffset.value = horizontal
      ? containerRef.value.scrollLeft
      : containerRef.value.scrollTop;

    isScrolling.value = true;

    if (scrollingTimeout) {
      clearTimeout(scrollingTimeout);
    }

    scrollingTimeout = setTimeout(() => {
      isScrolling.value = false;
    }, 150);
  }

  /**
   * Update container size
   */
  function updateContainerSize() {
    if (!containerRef.value) return;

    containerSize.value = horizontal
      ? containerRef.value.clientWidth
      : containerRef.value.clientHeight;
  }

  /**
   * Scroll to specific index
   */
  function scrollToIndex(
    index: number,
    scrollOptions: { align?: 'start' | 'center' | 'end' } = {},
  ): void {
    const { align = 'start' } = scrollOptions;

    const clampedIndex = Math.max(0, Math.min(index, items.value.length - 1));
    let offset = getItemOffset(clampedIndex);

    if (align === 'center') {
      const itemSize = getItemSize(items.value[clampedIndex]!, clampedIndex);
      offset = offset - containerSize.value / 2 + itemSize / 2;
    } else if (align === 'end') {
      const itemSize = getItemSize(items.value[clampedIndex]!, clampedIndex);
      offset = offset - containerSize.value + itemSize;
    }

    scrollToOffset(Math.max(0, offset));
  }

  /**
   * Scroll to specific offset
   */
  function scrollToOffset(offset: number): void {
    if (!containerRef.value) return;

    if (horizontal) {
      containerRef.value.scrollLeft = offset;
    } else {
      containerRef.value.scrollTop = offset;
    }
  }

  /**
   * Force recalculation of sizes
   */
  function measure(): void {
    sizeCache.clear();
    updateVirtualItems();
  }

  // Setup event listeners
  let resizeObserver: ResizeObserver | null = null;

  onMounted(() => {
    if (containerRef.value) {
      containerRef.value.addEventListener('scroll', handleScroll, { passive: true });
      updateContainerSize();

      // Watch for container resize
      resizeObserver = new ResizeObserver(() => {
        updateContainerSize();
      });
      resizeObserver.observe(containerRef.value);
    }
  });

  onUnmounted(() => {
    if (containerRef.value) {
      containerRef.value.removeEventListener('scroll', handleScroll);
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    if (scrollingTimeout) {
      clearTimeout(scrollingTimeout);
    }
  });

  return {
    containerRef,
    wrapperRef,
    virtualItems,
    totalSize,
    scrollOffset,
    visibleRange,
    isScrolling,
    wrapperStyle,
    containerStyle,
    scrollToIndex,
    scrollToOffset,
    measure,
    getItemOffset,
    getItemAtOffset,
  };
}

/**
 * Simple virtual list for fixed-height items with simpler API
 *
 * @example
 * ```ts
 * const { visibleItems, containerProps, wrapperProps } = useSimpleVirtualList(items, {
 *   itemHeight: 50,
 *   containerHeight: 400,
 * });
 * ```
 */
export function useSimpleVirtualList<T>(
  items: Ref<T[]>,
  options: {
    itemHeight: number;
    containerHeight: number;
    overscan?: number;
  },
) {
  const { itemHeight, containerHeight, overscan = 3 } = options;

  const scrollTop = ref(0);

  const visibleRange = computed(() => {
    const start = Math.max(0, Math.floor(scrollTop.value / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.value.length - 1, start + visibleCount + overscan * 2);
    return { start, end };
  });

  const visibleItems = computed(() => {
    const { start, end } = visibleRange.value;
    return items.value.slice(start, end + 1).map((item, i) => ({
      item,
      index: start + i,
      style: {
        position: 'absolute' as const,
        top: `${(start + i) * itemHeight}px`,
        height: `${itemHeight}px`,
        left: 0,
        right: 0,
      },
    }));
  });

  const totalHeight = computed(() => items.value.length * itemHeight);

  const containerProps = {
    style: {
      height: `${containerHeight}px`,
      overflow: 'auto',
    },
    onScroll: (e: Event) => {
      scrollTop.value = (e.target as HTMLElement).scrollTop;
    },
  };

  const wrapperProps = computed(() => ({
    style: {
      height: `${totalHeight.value}px`,
      position: 'relative' as const,
    },
  }));

  return {
    visibleItems,
    visibleRange,
    totalHeight,
    containerProps,
    wrapperProps,
    scrollTop,
  };
}

/**
 * Hook for infinite scroll loading
 *
 * @example
 * ```ts
 * const { loadMoreRef, isLoadingMore } = useInfiniteScroll({
 *   onLoadMore: async () => {
 *     const nextPage = await fetchNextPage();
 *     items.value.push(...nextPage);
 *   },
 *   hasMore: () => hasMorePages.value,
 * });
 * ```
 */
export function useInfiniteScroll(options: {
  onLoadMore: () => Promise<void>;
  hasMore: () => boolean;
  threshold?: number;
  rootMargin?: string;
}) {
  const { onLoadMore, hasMore, threshold = 0.1, rootMargin = '100px' } = options;

  const loadMoreRef = ref<HTMLElement>();
  const isLoadingMore = ref(false);

  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    observer = new IntersectionObserver(
      async (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && hasMore() && !isLoadingMore.value) {
          isLoadingMore.value = true;
          try {
            await onLoadMore();
          } finally {
            isLoadingMore.value = false;
          }
        }
      },
      {
        threshold,
        rootMargin,
      },
    );

    nextTick(() => {
      if (loadMoreRef.value) {
        observer?.observe(loadMoreRef.value);
      }
    });
  });

  onUnmounted(() => {
    observer?.disconnect();
  });

  watch(loadMoreRef, (el, oldEl) => {
    if (oldEl) {
      observer?.unobserve(oldEl);
    }
    if (el) {
      observer?.observe(el);
    }
  });

  return {
    loadMoreRef,
    isLoadingMore,
  };
}
