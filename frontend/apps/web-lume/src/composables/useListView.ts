/**
 * List View Composable
 * Manages paginated list views with search, filters, and row selection.
 * Designed to work with Lume's CRUD router response format.
 *
 * After Axios interceptor unwrapping, the fetcher receives:
 *   { items: T[], total: number, page: number, limit: number, totalPages: number }
 */
import { computed, onMounted, reactive, ref, watch, type Ref } from 'vue';
import { message } from 'ant-design-vue';

/**
 * Paginated response shape after Axios interceptor unwrapping
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Configuration options for useListView
 */
export interface UseListViewOptions<T, F extends Record<string, any> = Record<string, any>> {
  /** Default page size */
  pageSize?: number;
  /** Page size options */
  pageSizeOptions?: string[];
  /** Label for total display (e.g., "employees", "records") */
  itemLabel?: string;
  /** Debounce time for search in ms */
  searchDebounce?: number;
  /** Minimum search length before triggering */
  minSearchLength?: number;
  /** Whether to fetch data immediately on mount */
  immediate?: boolean;
  /** Default filter values */
  defaultFilters?: Partial<F>;
  /** Transform data after fetch */
  transform?: (items: T[]) => T[];
  /** Custom error message */
  errorMessage?: string;
  /** Whether to show error message toast */
  showErrorMessage?: boolean;
}

/**
 * Composable for managing list views with pagination, search, filters, and selection.
 *
 * @example
 * ```ts
 * import { get } from '@/api/request';
 *
 * const {
 *   items,
 *   loading,
 *   pagination,
 *   searchText,
 *   handleTableChange,
 *   handleSearch,
 *   fetch,
 * } = useListView(
 *   (params) => get('/activities', params),
 *   { pageSize: 20, itemLabel: 'activities' }
 * );
 *
 * // In template:
 * // <a-table :data-source="items" :pagination="pagination" @change="handleTableChange" />
 * ```
 */
export function useListView<
  T extends { id: number | string },
  F extends Record<string, any> = Record<string, any>,
>(
  fetcher: (params: Record<string, any>) => Promise<PaginatedResult<T>>,
  options: UseListViewOptions<T, F> = {},
) {
  const {
    pageSize = 20,
    pageSizeOptions = ['10', '20', '50', '100'],
    itemLabel = 'items',
    searchDebounce = 300,
    minSearchLength = 0,
    immediate = true,
    defaultFilters = {} as Partial<F>,
    transform,
    errorMessage = 'Failed to load data',
    showErrorMessage = true,
  } = options;

  // Data state
  const items = ref<T[]>([]) as Ref<T[]>;
  const loading = ref(false);
  const error = ref<Error | null>(null);

  // Pagination state (reactive object bindable to a-table's :pagination)
  const pagination = reactive({
    current: 1,
    pageSize,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions,
    showTotal: (total: number) => `Total ${total} ${itemLabel}`,
  });

  // Search state
  const searchText = ref('');
  const debouncedSearchText = ref('');
  const isSearching = ref(false);
  let searchTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Filter state
  const filters = ref({ ...defaultFilters } as F) as Ref<F>;
  const hasActiveFilters = computed(() => {
    return Object.entries(filters.value).some(([_, value]) => {
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    });
  });
  const activeFilterCount = computed(() => {
    return Object.entries(filters.value).filter(([_, value]) => {
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    }).length;
  });

  // Selection state
  const selectedRowKeys = ref<Array<number | string>>([]);
  const selectedItems = computed(() => {
    return items.value.filter((item) => selectedRowKeys.value.includes(item.id));
  });
  const hasSelection = computed(() => selectedRowKeys.value.length > 0);
  const selectionCount = computed(() => selectedRowKeys.value.length);

  // Computed helpers
  const isEmpty = computed(() => !loading.value && items.value.length === 0);

  // Store last params for refresh
  let lastExtraParams: Record<string, any> = {};

  /**
   * Build API parameters from current state
   */
  function getParams(): Record<string, any> {
    const params: Record<string, any> = {
      page: pagination.current,
      limit: pagination.pageSize,
    };

    if (debouncedSearchText.value) {
      params.search = debouncedSearchText.value;
    }

    // Add non-empty filters
    Object.entries(filters.value).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value) && value.length === 0) return;
        params[key] = value;
      }
    });

    return { ...params, ...lastExtraParams };
  }

  /**
   * Fetch data from API
   */
  async function fetch(extraParams: Record<string, any> = {}): Promise<void> {
    loading.value = true;
    error.value = null;
    lastExtraParams = extraParams;

    try {
      const params = { ...getParams(), ...extraParams };
      const response = await fetcher(params);

      // Lume CRUD router returns { items, total, page, limit, totalPages }
      let results = response.items || [];
      if (transform) {
        results = transform(results);
      }

      items.value = results;
      pagination.total = response.total || 0;
    } catch (e) {
      error.value = e as Error;
      if (showErrorMessage) {
        message.error(errorMessage);
      }
      console.error('useListView fetch error:', e);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Refresh current data (re-fetch with same params)
   */
  async function refresh(): Promise<void> {
    return fetch(lastExtraParams);
  }

  /**
   * Handle Ant Design Table change event (pagination, filters, sorter)
   */
  function handleTableChange(
    pag: { current?: number; pageSize?: number },
    _filters?: any,
    _sorter?: any,
  ): void {
    if (pag.current !== undefined) {
      pagination.current = pag.current;
    }
    if (pag.pageSize !== undefined) {
      pagination.pageSize = pag.pageSize;
    }
    fetch();
  }

  /**
   * Handle search with debouncing
   */
  function handleSearch(value?: string): void {
    if (value !== undefined) {
      searchText.value = value;
    }

    // Immediate search when called without value
    if (value === undefined) {
      isSearching.value = true;
      if (searchTimeoutId) {
        clearTimeout(searchTimeoutId);
      }
      debouncedSearchText.value = searchText.value;
      pagination.current = 1;
      fetch().finally(() => {
        isSearching.value = false;
      });
    }
  }

  // Watch search text for debounced search
  watch(searchText, (newValue) => {
    isSearching.value = true;

    if (searchTimeoutId) {
      clearTimeout(searchTimeoutId);
    }

    searchTimeoutId = setTimeout(() => {
      if (newValue.length >= minSearchLength || newValue.length === 0) {
        debouncedSearchText.value = newValue;
        pagination.current = 1;
        fetch();
      }
      isSearching.value = false;
    }, searchDebounce);
  });

  /**
   * Set a specific filter value (resets to page 1)
   */
  function setFilter<K extends keyof F>(key: K, value: F[K]): void {
    filters.value[key] = value;
    pagination.current = 1;
    fetch();
  }

  /**
   * Reset all filters to default values
   */
  function resetFilters(): void {
    Object.assign(filters.value, defaultFilters);
    pagination.current = 1;
    fetch();
  }

  function clearSelection(): void {
    selectedRowKeys.value = [];
  }

  function selectAll(): void {
    selectedRowKeys.value = items.value.map((item) => item.id);
  }

  function setPage(page: number): void {
    pagination.current = page;
    fetch();
  }

  function setPageSize(size: number): void {
    pagination.pageSize = size;
    pagination.current = 1;
    fetch();
  }

  // Fetch on mount if immediate
  onMounted(() => {
    if (immediate) {
      fetch();
    }
  });

  return {
    // Data
    items,
    loading,
    error,

    // Pagination (bind directly to a-table :pagination)
    pagination,

    // Search
    searchText,
    isSearching,

    // Filters
    filters,
    hasActiveFilters,
    activeFilterCount,

    // Selection
    selectedRowKeys,
    selectedItems,
    hasSelection,
    selectionCount,

    // Methods
    fetch,
    refresh,
    handleTableChange,
    handleSearch,
    setFilter,
    resetFilters,
    clearSelection,
    selectAll,
    setPage,
    setPageSize,

    // Computed helpers
    isEmpty,
    getParams,
  };
}
