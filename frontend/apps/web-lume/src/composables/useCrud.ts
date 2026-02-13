// CRUD Composable for API Operations
import { ref, computed } from 'vue';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '@/types/api';
import api from '@/api';

interface CRUDOptions {
  endpoint: string;
  pagination?: boolean;
}

export function useCrud<T>(options: CRUDOptions) {
  const { endpoint, pagination = true } = options;

  // State
  const data = ref<T[]>([]) as { value: T[] };
  const total = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Computed
  const isEmpty = computed(() => !loading.value && data.value.length === 0);
  const hasData = computed(() => data.value.length > 0);

  // List with pagination
  const list = async (params?: PaginationParams): Promise<T[]> => {
    loading.value = true;
    error.value = null;
    
    try {
      const res = await api.get<ApiResponse<T[]>>(endpoint, { params });
      
      if (pagination && 'items' in res) {
        // Handle paginated response
        const paginatedRes = res as ApiResponse<PaginatedResponse<T>>;
        data.value = paginatedRes.data.items;
        total.value = paginatedRes.data.total;
      } else {
        // Handle array response
        data.value = (res as any).data || res.items || res;
        total.value = data.value.length;
      }
      
      return data.value;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch data';
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
      const res = await api.get<ApiResponse<T>>(`${endpoint}/${id}`);
      return res.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch item';
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
      const res = await api.post<ApiResponse<T>>(endpoint, payload);
      const newItem = res.data;
      data.value.unshift(newItem);
      total.value++;
      return newItem;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to create item';
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
      const res = await api.put<ApiResponse<T>>(`${endpoint}/${id}`, payload);
      const updatedItem = res.data;
      const index = data.value.findIndex((item: any) => item.id === id);
      if (index > -1) {
        data.value[index] = updatedItem;
      }
      return updatedItem;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update item';
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
      await api.delete(`${endpoint}/${id}`);
      data.value = data.value.filter((item: any) => item.id !== id);
      total.value--;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to delete item';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Batch delete
  const batchRemove = async (ids: (number | string)[]): Promise<void> => {
    loading.value = true;
    error.value = null;
    
    try {
      await api.post(`${endpoint}/batch-delete`, { ids });
      data.value = data.value.filter((item: any) => !ids.includes(item.id));
      total.value -= ids.length;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to delete items';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Refresh data
  const refresh = async () => {
    return list();
  };

  // Reset state
  const reset = () => {
    data.value = [];
    total.value = 0;
    error.value = null;
  };

  return {
    // State
    data,
    total,
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
    batchRemove,
    refresh,
    reset
  };
}
