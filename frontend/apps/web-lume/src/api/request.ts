/**
 * Axios Request Configuration
 * Centralized HTTP client for all API requests
 */

import axios, { type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance
const request = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore();
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const { code, message, data, success } = response.data;
    
    // Handle custom API response format with code
    if (code !== undefined) {
      if (code === 200 || code === 0) {
        return data;
      }
      return Promise.reject(new Error(message || 'Request failed'));
    }
    
    // Handle API response format with success flag
    if (success !== undefined) {
      if (success === true) {
        return data;
      }
      return Promise.reject(new Error(message || 'Request failed'));
    }
    
    return response.data;
  },
  async (error) => {
    const { response } = error;
    
    if (response) {
      switch (response.status) {
        case 401: {
          // Token expired - try to refresh
          const authStore = useAuthStore();
          if (authStore.refreshToken) {
            try {
              await authStore.doRefreshToken();
              // Retry original request
              return request(error.config);
            } catch {
              authStore.logout();
              window.location.href = '/login';
            }
          } else {
            authStore.logout();
            window.location.href = '/login';
          }
          break;
        }
        case 403:
          window.location.href = '/forbidden';
          break;
        case 404:
          window.location.href = '/not-found';
          break;
        case 500:
          window.location.href = '/server-error';
          break;
        default:
          break;
      }
    }
    
    return Promise.reject(error);
  }
);

export default request;

/**
 * GET request
 */
export function get<T = any>(
  url: string,
  params?: Record<string, any>,
  config?: AxiosRequestConfig
): Promise<T> {
  return request.get(url, { params, ...config });
}

/**
 * POST request
 */
export function post<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  return request.post(url, data, config);
}

/**
 * PUT request
 */
export function put<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  return request.put(url, data, config);
}

/**
 * PATCH request
 */
export function patch<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  return request.patch(url, data, config);
}

/**
 * DELETE request
 */
export function del<T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  return request.delete(url, config);
}

/**
 * Upload file
 */
export function upload<T = any>(
  url: string,
  formData: FormData,
  onProgress?: (progress: number) => void
): Promise<T> {
  return request.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  });
}
