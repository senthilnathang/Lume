import { computed, onMounted, reactive, ref, watch, type Ref } from 'vue';
import { message } from 'ant-design-vue';

/**
 * Generic paginated API response structure
 */
export interface PaginatedResponse<T> {
  count: number;
  results: T[];
  next?: string | null;
  previous?: string | null;
}

/**
 * Configuration options for useListView
 */
export interface UseListViewOptions<T, F extends Record<string, any> = Record<string, any>> {
  /** Default page size */
  pageSize?: number;
  /** Page size options */
  pageSizeOptions?: string[];
  /** Label for total display (e.g., "employees", "candidates") */
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
 * Return type for useListView
 */
export interface UseListViewReturn<T, F extends Record<string, any>> {
  // Data
  items: Ref<T[]>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;

  // Pagination
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger: boolean;
    showQuickJumper: boolean;
    pageSizeOptions: string[];
    showTotal: (total: number) => string;
  };

  // Search
  searchText: Ref<string>;
  isSearching: Ref<boolean>;

  // Filters
  filters: Ref<F>;
  hasActiveFilters: Ref<boolean>;
  activeFilterCount: Ref<number>;

  // Selection
  selectedRowKeys: Ref<Array<number | string>>;
  selectedItems: Ref<T[]>;
  hasSelection: Ref<boolean>;
  selectionCount: Ref<number>;

  // Methods
  fetch: (extraParams?: Record<string, any>) => Promise<void>;
  refresh: () => Promise<void>;
  handleTableChange: (
    pag: { current?: number; pageSize?: number },
    filters?: any,
    sorter?: any,
  ) => void;
  handleSearch: (value?: string) => void;
  setFilter: <K extends keyof F>(key: K, value: F[K]) => void;
  resetFilters: () => void;
  clearSelection: () => void;
  selectAll: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // Computed helpers
  isEmpty: Ref<boolean>;
  getParams: () => Record<string, any>;
}

/**
 * Composable for managing list views with pagination, search, filters, and selection.
 * Consolidates common patterns from employee list, candidate list, etc.
 *
 * @example
 * ```ts
 * const {
 *   items: employees,
 *   loading,
 *   pagination,
 *   searchText,
 *   handleTableChange,
 *   handleSearch,
 *   fetch,
 * } = useListView(getEmployeesApi, {
 *   pageSize: 20,
 *   itemLabel: 'employees',
 *   immediate: true,
 * });
 * ```
 */
export function useListView<
  T extends { id: number | string },
  F extends Record<string, any> = Record<string, any>,
>(
  fetcher: (params: Record<string, any>) => Promise<PaginatedResponse<T>>,
  options: UseListViewOptions<T, F> = {},
): UseListViewReturn<T, F> {
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

  // Pagination state
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
      page_size: pagination.pageSize,
    };

    // Add search if present
    if (debouncedSearchText.value) {
      params.search = debouncedSearchText.value;
    }

    // Add filters
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

      let results = response.results || [];
      if (transform) {
        results = transform(results);
      }

      items.value = results;
      pagination.total = response.count || 0;
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
   * Refresh current data
   */
  async function refresh(): Promise<void> {
    return fetch(lastExtraParams);
  }

  /**
   * Handle Ant Table change event
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

    // If called directly without value, trigger immediate search
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
   * Set a specific filter value
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

  /**
   * Clear all selections
   */
  function clearSelection(): void {
    selectedRowKeys.value = [];
  }

  /**
   * Select all items in current page
   */
  function selectAll(): void {
    selectedRowKeys.value = items.value.map((item) => item.id);
  }

  /**
   * Set current page
   */
  function setPage(page: number): void {
    pagination.current = page;
    fetch();
  }

  /**
   * Set page size
   */
  function setPageSize(size: number): void {
    pagination.pageSize = size;
    pagination.current = 1;
    fetch();
  }

  // Fetch on mount if immediate is true
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

    // Pagination
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
