import type { UseFetchOptions } from 'nuxt/app';

/**
 * Base API composable that wraps $fetch with auth headers.
 * All module-specific API composables use this under the hood.
 */
export function useApi() {
  function getAuthHeaders(): Record<string, string> {
    if (import.meta.client) {
      const token = localStorage.getItem('access_token');
      if (token) return { Authorization: `Bearer ${token}` };
    }
    return {};
  }

  async function get<T>(url: string, params?: Record<string, any>): Promise<T> {
    return $fetch<T>(url, {
      method: 'GET',
      headers: getAuthHeaders(),
      params,
    });
  }

  async function post<T>(url: string, body?: any): Promise<T> {
    return $fetch<T>(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body,
    });
  }

  async function put<T>(url: string, body?: any): Promise<T> {
    return $fetch<T>(url, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body,
    });
  }

  async function del<T>(url: string): Promise<T> {
    return $fetch<T>(url, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  }

  return { get, post, put, del, getAuthHeaders };
}

/** Standard paginated response from the API */
export interface PaginatedApiResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** Standard single-item response */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/** Pagination + search params */
export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: any;
}
