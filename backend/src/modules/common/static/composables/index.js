/**
 * Common Composables for Dynamic Module Views
 *
 * These are loaded at runtime by vue3-sfc-loader.
 * Uses Vue 3 Composition API.
 */

import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { message, notification, Modal } from 'ant-design-vue';

// ============================================================================
// useNotification - Toast notifications
// ============================================================================
export function useNotification() {
  const success = (msg, description) => {
    notification.success({ message: msg, description });
  };
  const error = (msg, description) => {
    notification.error({ message: msg, description });
  };
  const warning = (msg, description) => {
    notification.warning({ message: msg, description });
  };
  const info = (msg, description) => {
    notification.info({ message: msg, description });
  };

  return {
    // Original names
    success,
    error,
    warning,
    info,
    // Alias names for compatibility
    showSuccess: success,
    showError: error,
    showWarning: warning,
    showInfo: info,
  };
}

// ============================================================================
// useClipboard - Copy to clipboard
// ============================================================================
export function useClipboard() {
  const copied = ref(false);

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      copied.value = true;
      message.success('Copied to clipboard');
      setTimeout(() => { copied.value = false; }, 2000);
      return true;
    } catch (err) {
      message.error('Failed to copy');
      return false;
    }
  }

  return { copied, copy };
}

// ============================================================================
// useBreakpoints - Responsive breakpoints
// ============================================================================

// Throttle utility to limit function execution frequency
function throttle(fn, delay) {
  let lastCall = 0;
  let timeoutId = null;
  return function(...args) {
    const now = Date.now();
    const remaining = delay - (now - lastCall);

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn.apply(this, args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}

export function useBreakpoints() {
  const width = ref(window.innerWidth);

  const isMobile = computed(() => width.value < 768);
  const isTablet = computed(() => width.value >= 768 && width.value < 1024);
  const isDesktop = computed(() => width.value >= 1024);

  // Throttle resize handler to prevent excessive reactive updates
  const updateWidth = throttle(() => {
    width.value = window.innerWidth;
  }, 100);

  onMounted(() => {
    window.addEventListener('resize', updateWidth);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', updateWidth);
  });

  return { width, isMobile, isTablet, isDesktop };
}

// ============================================================================
// useEventBus - Simple event bus
// ============================================================================
const eventBus = new Map();

export function useEventBus() {
  function emit(event, payload) {
    const handlers = eventBus.get(event) || [];
    handlers.forEach(handler => handler(payload));
  }

  function on(event, handler) {
    if (!eventBus.has(event)) {
      eventBus.set(event, []);
    }
    eventBus.get(event).push(handler);
  }

  function off(event, handler) {
    const handlers = eventBus.get(event) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) handlers.splice(index, 1);
  }

  return { emit, on, off };
}

// ============================================================================
// usePagination - Pagination state management
// ============================================================================
export function usePagination(defaultPageSize = 20) {
  const pagination = reactive({
    current: 1,
    pageSize: defaultPageSize,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
  });

  function setTotal(total) {
    pagination.total = total;
  }

  function setPage(page) {
    pagination.current = page;
  }

  function setPageSize(size) {
    pagination.pageSize = size;
    pagination.current = 1;
  }

  function handleChange(page, pageSize) {
    pagination.current = page;
    pagination.pageSize = pageSize;
  }

  function reset() {
    pagination.current = 1;
    pagination.total = 0;
  }

  return {
    pagination,
    setTotal,
    setPage,
    setPageSize,
    handleChange,
    reset,
  };
}

// ============================================================================
// useModal - Modal dialog state
// ============================================================================
export function useModal() {
  const visible = ref(false);
  const loading = ref(false);
  const data = ref(null);

  function open(initialData = null) {
    data.value = initialData;
    visible.value = true;
  }

  function close() {
    visible.value = false;
    loading.value = false;
    data.value = null;
  }

  function setLoading(value) {
    loading.value = value;
  }

  return {
    visible,
    loading,
    data,
    open,
    close,
    setLoading,
  };
}

// ============================================================================
// useDebounce - Debounced ref for search/filter inputs
// ============================================================================
export function useDebounce(initialValue = '', delay = 300) {
  const value = ref(initialValue);
  const debouncedValue = ref(initialValue);
  let timeoutId = null;

  watch(value, (newVal) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      debouncedValue.value = newVal;
    }, delay);
  });

  onUnmounted(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });

  return { value, debouncedValue };
}

// ============================================================================
// useFilter - Filter state management (with memoized activeFilters)
// ============================================================================
export function useFilter(fields = []) {
  const filters = reactive({});

  // Initialize filters from field definitions
  fields.forEach(field => {
    filters[field.key] = field.defaultValue ?? null;
  });

  function setFilter(key, value) {
    filters[key] = value;
  }

  function resetFilters() {
    Object.keys(filters).forEach(key => {
      filters[key] = null;
    });
  }

  // Memoized computed - only recalculates when filters change
  const activeFilters = computed(() => {
    const active = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        active[key] = value;
      }
    });
    return active;
  });

  // Keep backward-compatible function form
  function getActiveFilters() {
    return activeFilters.value;
  }

  return {
    filters,
    activeFilters,
    setFilter,
    resetFilters,
    getActiveFilters,
  };
}

// ============================================================================
// createFilterFields - Helper to create filter field definitions
// ============================================================================
export function createFilterFields(fields) {
  return fields.map(field => ({
    key: field.key || field.name,
    label: field.label || field.name,
    type: field.type || 'text',
    options: field.options || [],
    defaultValue: field.defaultValue ?? null,
    placeholder: field.placeholder || `Filter by ${field.label || field.name}`,
    ...field,
  }));
}

// ============================================================================
// useTableView - Table state management
// ============================================================================
export function useTableView() {
  const loading = ref(false);
  const dataSource = ref([]);
  const selectedRowKeys = ref([]);
  const sorter = reactive({ field: null, order: null });

  function setLoading(value) {
    loading.value = value;
  }

  function setDataSource(data) {
    dataSource.value = data;
  }

  function setSelectedRowKeys(keys) {
    selectedRowKeys.value = keys;
  }

  function handleSorterChange(s) {
    sorter.field = s.field;
    sorter.order = s.order;
  }

  function clearSelection() {
    selectedRowKeys.value = [];
  }

  return {
    loading,
    dataSource,
    selectedRowKeys,
    sorter,
    setLoading,
    setDataSource,
    setSelectedRowKeys,
    handleSorterChange,
    clearSelection,
  };
}

// ============================================================================
// useListView - Combined list view state (table + pagination + filters)
// ============================================================================
export function useListView(options = {}) {
  const { defaultPageSize = 20, filterFields = [], debounceMs = 300 } = options;

  const table = useTableView();
  const paging = usePagination(defaultPageSize);
  const filter = useFilter(filterFields);
  const modal = useModal();

  const searchText = ref('');

  // Memoized query params - only recalculates when dependencies change
  const queryParams = computed(() => {
    return {
      page: paging.pagination.current,
      page_size: paging.pagination.pageSize,
      search: searchText.value || undefined,
      ordering: table.sorter?.field
        ? `${table.sorter.order === 'descend' ? '-' : ''}${table.sorter.field}`
        : undefined,
      ...filter.activeFilters.value,
    };
  });

  // Backward-compatible function form
  function getQueryParams() {
    return queryParams.value;
  }

  function handleTableChange(pagination, filters, sorter) {
    paging.handleChange(pagination.current, pagination.pageSize);
    table.handleSorterChange(sorter);
  }

  return {
    ...table,
    ...paging,
    ...filter,
    modal,
    searchText,
    queryParams,
    getQueryParams,
    handleTableChange,
  };
}

// ============================================================================
// useFetchData - Reusable async data fetching with loading/error state
// ============================================================================
export function useFetchData(fetchFn, options = {}) {
  const { immediate = false, defaultData = null, onSuccess, onError } = options;

  const data = ref(defaultData);
  const loading = ref(false);
  const error = ref(null);

  async function execute(...args) {
    loading.value = true;
    error.value = null;
    try {
      const result = await fetchFn(...args);
      data.value = result;
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      error.value = err.message || 'Request failed';
      if (onError) onError(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function refresh(...args) {
    return execute(...args);
  }

  if (immediate) {
    execute();
  }

  return { data, loading, error, execute, refresh };
}

// ============================================================================
// defineColumns - Column definition helper
// ============================================================================
export function defineColumns(columns) {
  return columns.map(col => ({
    title: col.title,
    dataIndex: col.dataIndex || col.key,
    key: col.key || col.dataIndex,
    width: col.width,
    fixed: col.fixed,
    sorter: col.sorter ?? false,
    ellipsis: col.ellipsis ?? true,
    resizable: col.resizable ?? true,
    visible: col.visible ?? true,
    ...col,
  }));
}

// ============================================================================
// useFormView - Configurable form view mode (page/modal/drawer)
// ============================================================================
const FORM_VIEW_VALID_MODES = ['page', 'modal', 'drawer'];

export function useFormView(viewKey, options = {}) {
  const {
    defaultMode = 'page',
    pageRoute = '',
    modalWidth = 720,
    drawerWidth = 620,
    onClose = null,
  } = options;

  // Get vue-router instance (must be called during setup)
  let router = null;
  try { router = useRouter(); } catch (e) { /* not in component context */ }

  // --- Mode state with localStorage persistence ---
  const storageKey = `formView_${viewKey}_mode`;

  function loadMode() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && FORM_VIEW_VALID_MODES.includes(saved)) return saved;
    } catch (e) { /* localStorage unavailable */ }
    return defaultMode;
  }

  const mode = ref(loadMode());

  function setMode(newMode) {
    if (!FORM_VIEW_VALID_MODES.includes(newMode)) return;
    mode.value = newMode;
    try { localStorage.setItem(storageKey, newMode); } catch (e) { /* */ }
  }

  // --- Form state ---
  const formId = ref(null);
  const formData = ref(null);
  const modalVisible = ref(false);
  const drawerVisible = ref(false);

  // --- Computed helpers ---
  const isPageMode = computed(() => mode.value === 'page');
  const isModalMode = computed(() => mode.value === 'modal');
  const isDrawerMode = computed(() => mode.value === 'drawer');
  const isOpen = computed(() => modalVisible.value || drawerVisible.value);

  // --- Actions ---
  function openForm(id = null, data = null) {
    formId.value = id;
    formData.value = data;

    if (mode.value === 'page') {
      if (!pageRoute) {
        console.warn('[useFormView] pageRoute not configured, falling back to modal');
        modalVisible.value = true;
        return;
      }
      if (router) {
        const query = id ? { id: String(id) } : {};
        router.push({ path: pageRoute, query });
      } else {
        console.warn('[useFormView] router not available');
      }
    } else if (mode.value === 'modal') {
      modalVisible.value = true;
    } else if (mode.value === 'drawer') {
      drawerVisible.value = true;
    }
  }

  function closeForm() {
    modalVisible.value = false;
    drawerVisible.value = false;
    formId.value = null;
    formData.value = null;
    if (onClose) onClose();
  }

  return {
    mode, setMode, isPageMode, isModalMode, isDrawerMode,
    formId, formData, modalVisible, drawerVisible, isOpen,
    openForm, closeForm, modalWidth, drawerWidth,
  };
}

// ============================================================================
// useColumnSettings - Column visibility/order management
// ============================================================================
export function useColumnSettings(initialColumns, options = {}) {
  // Handle both old API (string) and new API (object)
  const storageKey = typeof options === 'string' ? options : options?.storageKey || null;

  const columns = ref([...initialColumns]);
  const columnSettings = reactive({});

  // Initialize settings - create columnConfigs with visible property
  const columnConfigs = computed(() => {
    return columns.value.map(col => {
      const key = col.key || col.dataIndex;
      return {
        ...col,
        visible: columnSettings[key]?.visible !== false,
        required: col.required || false,
      };
    });
  });

  // Initialize settings
  initialColumns.forEach(col => {
    const key = col.key || col.dataIndex;
    columnSettings[key] = {
      visible: col.defaultVisible !== false && col.visible !== false,
      order: initialColumns.indexOf(col),
    };
  });

  // Load from localStorage if key provided
  if (storageKey) {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(columnSettings, parsed);
      }
    } catch (e) {
      console.warn('Failed to load column settings', e);
    }
  }

  const visibleColumns = computed(() => {
    return columns.value
      .filter(col => {
        const key = col.key || col.dataIndex;
        return columnSettings[key]?.visible !== false;
      })
      .sort((a, b) => {
        const keyA = a.key || a.dataIndex;
        const keyB = b.key || b.dataIndex;
        return (columnSettings[keyA]?.order ?? 0) - (columnSettings[keyB]?.order ?? 0);
      });
  });

  function toggleColumn(key) {
    if (columnSettings[key]) {
      columnSettings[key].visible = !columnSettings[key].visible;
      saveSettings();
    }
  }

  function setColumnOrder(orderedKeys) {
    orderedKeys.forEach((key, index) => {
      if (columnSettings[key]) {
        columnSettings[key].order = index;
      }
    });
    saveSettings();
  }

  // updateColumns - update column visibility from array of configs
  function updateColumns(configs) {
    configs.forEach(config => {
      const key = config.key || config.dataIndex;
      if (columnSettings[key]) {
        columnSettings[key].visible = config.visible !== false;
      }
    });
    saveSettings();
  }

  function resetColumns() {
    initialColumns.forEach((col, index) => {
      const key = col.key || col.dataIndex;
      columnSettings[key] = {
        visible: col.defaultVisible !== false && col.visible !== false,
        order: index,
      };
    });
    saveSettings();
  }

  function saveSettings() {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(columnSettings));
      } catch (e) {
        console.warn('Failed to save column settings', e);
      }
    }
  }

  return {
    columns,
    columnConfigs,
    columnSettings,
    visibleColumns,
    toggleColumn,
    setColumnOrder,
    updateColumns,
    resetColumns,
  };
}
