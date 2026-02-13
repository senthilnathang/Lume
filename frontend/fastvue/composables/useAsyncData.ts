import { ref, type Ref } from 'vue';
import { message } from 'ant-design-vue';

export interface UseAsyncDataOptions {
  immediate?: boolean;
  showErrorMessage?: boolean;
  errorMessage?: string;
}

export interface UseAsyncDataReturn<T> {
  data: Ref<T | null>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  execute: () => Promise<T | null>;
  refresh: () => Promise<T | null>;
  reset: () => void;
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  options: UseAsyncDataOptions = {}
): UseAsyncDataReturn<T> {
  const {
    immediate = false,
    showErrorMessage = true,
    errorMessage = 'Failed to load data',
  } = options;

  const data = ref<T | null>(null) as Ref<T | null>;
  const loading = ref(false);
  const error = ref<Error | null>(null);

  async function execute(): Promise<T | null> {
    loading.value = true;
    error.value = null;

    try {
      const result = await fetcher();
      data.value = result;
      return result;
    } catch (e) {
      error.value = e as Error;
      if (showErrorMessage) {
        message.error(errorMessage);
      }
      console.error('useAsyncData error:', e);
      return null;
    } finally {
      loading.value = false;
    }
  }

  function refresh(): Promise<T | null> {
    return execute();
  }

  function reset() {
    data.value = null;
    loading.value = false;
    error.value = null;
  }

  if (immediate) {
    execute();
  }

  return {
    data,
    loading,
    error,
    execute,
    refresh,
    reset,
  };
}

/**
 * Composable for handling list data with pagination
 */
export interface PaginatedResponse<T> {
  count: number;
  results: T[];
  next?: string | null;
  previous?: string | null;
}

export interface UsePaginatedDataOptions {
  defaultPageSize?: number;
  showErrorMessage?: boolean;
  errorMessage?: string;
}

export interface UsePaginatedDataReturn<T> {
  items: Ref<T[]>;
  total: Ref<number>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  page: Ref<number>;
  pageSize: Ref<number>;
  fetch: (params?: Record<string, any>) => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  refresh: () => Promise<void>;
}

export function usePaginatedData<T>(
  fetcher: (params: { page: number; page_size: number } & Record<string, any>) => Promise<PaginatedResponse<T>>,
  options: UsePaginatedDataOptions = {}
): UsePaginatedDataReturn<T> {
  const {
    defaultPageSize = 20,
    showErrorMessage = true,
    errorMessage = 'Failed to load data',
  } = options;

  const items = ref<T[]>([]) as Ref<T[]>;
  const total = ref(0);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const page = ref(1);
  const pageSize = ref(defaultPageSize);
  const lastParams = ref<Record<string, any>>({});

  async function fetch(params: Record<string, any> = {}): Promise<void> {
    loading.value = true;
    error.value = null;
    lastParams.value = params;

    try {
      const response = await fetcher({
        page: page.value,
        page_size: pageSize.value,
        ...params,
      });
      items.value = response.results || [];
      total.value = response.count || 0;
    } catch (e) {
      error.value = e as Error;
      if (showErrorMessage) {
        message.error(errorMessage);
      }
      console.error('usePaginatedData error:', e);
    } finally {
      loading.value = false;
    }
  }

  function setPage(newPage: number) {
    page.value = newPage;
  }

  function setPageSize(size: number) {
    pageSize.value = size;
    page.value = 1; // Reset to first page when changing page size
  }

  async function refresh(): Promise<void> {
    return fetch(lastParams.value);
  }

  return {
    items,
    total,
    loading,
    error,
    page,
    pageSize,
    fetch,
    setPage,
    setPageSize,
    refresh,
  };
}
