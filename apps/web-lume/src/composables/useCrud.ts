/**
 * CRUD Composable for API Operations
 * Uses the centralized Axios client from @/api/request.ts
 * Response interceptor unwraps {success, data} → returns data directly
 */
import { ref, computed } from 'vue';
import { get as apiGet, post as apiPost, put as apiPut, del as apiDel } from '@/api/request';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CRUDOptions {
  endpoint: string;
}

export function useCrud<T extends { id: number | string }>(options: CRUDOptions) {
  const { endpoint } = options;

  // State
  const data = ref<T[]>([]) as { value: T[] };
  const total = ref(0);
  const page = ref(1);
  const limit = ref(20);
  const totalPages = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Computed
  const isEmpty = computed(() => !loading.value && data.value.length === 0);
  const hasData = computed(() => data.value.length > 0);

  // List with pagination
  const list = async (params?: Record<string, any>): Promise<T[]> => {
    loading.value = true;
    error.value = null;

    try {
      // Interceptor unwraps {success, data} → returns data
      // For search endpoint, data = { items, total, page, limit, totalPages }
      const result = await apiGet<PaginatedResult<T>>(endpoint, params);

      if (result && typeof result === 'object' && 'items' in result) {
        data.value = result.items;
        total.value = result.total;
        page.value = result.page;
        limit.value = result.limit;
        totalPages.value = result.totalPages;
      } else if (Array.isArray(result)) {
        data.value = result as unknown as T[];
        total.value = (result as unknown as T[]).length;
      }

      return data.value;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to fetch data';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Get single item
  const get = async (id: number | string): Promise<T> => {
    loading.value = true;
    error.value = null;

    try {
      // Interceptor unwraps → returns the record directly
      const record = await apiGet<T>(`${endpoint}/${id}`);
      return record;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to fetch item';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Create new item
  const create = async (payload: Partial<T>): Promise<T> => {
    loading.value = true;
    error.value = null;

    try {
      const newItem = await apiPost<T>(endpoint, payload);
      data.value.unshift(newItem);
      total.value++;
      return newItem;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to create item';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Update item
  const update = async (id: number | string, payload: Partial<T>): Promise<T> => {
    loading.value = true;
    error.value = null;

    try {
      const updatedItem = await apiPut<T>(`${endpoint}/${id}`, payload);
      const index = data.value.findIndex((item) => item.id === id);
      if (index > -1) {
        data.value[index] = updatedItem;
      }
      return updatedItem;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to update item';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Delete item
  const remove = async (id: number | string): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await apiDel(`${endpoint}/${id}`);
      data.value = data.value.filter((item) => item.id !== id);
      total.value--;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to delete item';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Bulk create
  const bulkCreate = async (records: Partial<T>[]): Promise<T[]> => {
    loading.value = true;
    error.value = null;

    try {
      const newItems = await apiPost<T[]>(`${endpoint}/bulk`, records);
      data.value.unshift(...newItems);
      total.value += newItems.length;
      return newItems;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to bulk create';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Bulk delete
  const bulkRemove = async (ids: (number | string)[]): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await apiDel(`${endpoint}/bulk`, { data: { ids } });
      data.value = data.value.filter((item) => !ids.includes(item.id));
      total.value -= ids.length;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to bulk delete';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Get model field definitions
  const fieldsGet = async (): Promise<Record<string, any>> => {
    try {
      return await apiGet(`${endpoint}/fields`);
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to fetch fields';
      throw err;
    }
  };

  // Refresh data
  const refresh = async () => list();

  // Reset state
  const reset = () => {
    data.value = [];
    total.value = 0;
    page.value = 1;
    totalPages.value = 0;
    error.value = null;
  };

  return {
    // State
    data,
    total,
    page,
    limit,
    totalPages,
    loading,
    error,

    // Computed
    isEmpty,
    hasData,

    // Methods
    list,
    get,
    create,
    update,
    remove,
    bulkCreate,
    bulkRemove,
    fieldsGet,
    refresh,
    reset,
  };
}
