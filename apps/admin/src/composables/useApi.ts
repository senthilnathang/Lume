/**
 * API Composable for Lume Frontend
 * Centralized API client with auth support
 */

import { ref, computed } from 'vue';
import { apiUrl } from '@/api/url';

// API Base URL


// Auth token storage key
const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';

// Reactive state
const token = ref(localStorage.getItem(TOKEN_KEY) || null);
const refreshToken = ref(localStorage.getItem(REFRESH_TOKEN_KEY) || null);
const user = ref(null);

/**
 * Set auth tokens
 */
const setAuth = (newToken: string, newRefreshToken: string) => {
  token.value = newToken;
  refreshToken.value = newRefreshToken;
  localStorage.setItem(TOKEN_KEY, newToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
};

/**
 * Clear auth tokens
 */
const clearAuth = () => {
  token.value = null;
  refreshToken.value = null;
  user.value = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

/**
 * Get auth headers
 */
const getAuthHeaders = (): Record<string, string> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (localStorage.getItem(TOKEN_KEY)) {
    headers['Authorization'] = `Bearer ${localStorage.getItem(TOKEN_KEY)}`;
  }
  
  return headers;
};

/**
 * API request handler
 */
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}, retried = false
): Promise<T> => {
  const url = apiUrl(endpoint);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Try to refresh token
      if (refreshToken.value && !retried) {
        const refreshed = await refreshAuthToken();
        if (refreshed) {
          // Retry request with new token
          return apiRequest<T>(endpoint, options, true);
        }
      }
      // Clear auth on failure
      clearAuth();
    }
    
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.error?.message || error.message || 'Request failed');
  }
  
  return response.json();
};

/**
 * Refresh auth token
 */
const refreshAuthToken = async (): Promise<boolean> => {
  if (!refreshToken.value) return false;
  
  try {
    const response = await fetch(apiUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshToken.value }),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        setAuth(data.data.accessToken, data.data.refreshToken || refreshToken.value);
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * API methods
 */
export const api = {
  // Generic GET method
  async get(endpoint: string, params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`${endpoint}${query}`);
  },
  
  // Generic POST method
  async post(endpoint: string, data?: any) {
    return apiRequest(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },
  
  // Generic PUT method
  async put(endpoint: string, data?: any) {
    return apiRequest(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },
  
  // Generic DELETE method
  async delete(endpoint: string) {
    return apiRequest(endpoint, { method: 'DELETE' });
  },
  
  // Auth endpoints
  async login(email: string, password: string) {
    return apiRequest<{ success: boolean; data: { user: any; accessToken: string; refreshToken: string } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
  },
  
  async register(userData: { email: string; password: string; first_name: string; last_name: string }) {
    return apiRequest('/users/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  
  async logout() {
    const result = await apiRequest('/auth/logout', { method: 'POST' });
    clearAuth();
    return result;
  },
  
  // User endpoints
  async getUsers(params?: { page?: number; limit?: number; search?: string }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest(`/api/users${query ? `?${query}` : ''}`);
  },
  
  async getUser(id: number) {
    return apiRequest(`/api/users/${id}`);
  },
  
  async updateUser(id: number, userData: any) {
    return apiRequest(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },
  
  // Activities endpoints
  async getActivities(params?: { page?: number; limit?: number; status?: string; category?: string }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest(`/activities${query ? `?${query}` : ''}`);
  },
  
  async getActivity(id: number) {
    return apiRequest(`/activities/${id}`);
  },
  
  async getUpcomingActivities(limit = 5) {
    return apiRequest(`/activities/upcoming?limit=${limit}`);
  },
  
  async createActivity(activityData: any) {
    return apiRequest('/activities', {
      method: 'POST',
      body: JSON.stringify(activityData),
    });
  },
  
  async updateActivity(id: number, activityData: any) {
    return apiRequest(`/activities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(activityData),
    });
  },
  
  async deleteActivity(id: number) {
    return apiRequest(`/activities/${id}`, { method: 'DELETE' });
  },
  
  async publishActivity(id: number) {
    return apiRequest(`/activities/${id}/publish`, { method: 'POST' });
  },
  
  // Team endpoints
  async getTeamMembers(params?: { page?: number; department?: string }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest(`/team${query ? `?${query}` : ''}`);
  },
  
  async getActiveTeamMembers() {
    return apiRequest('/team/active');
  },
  
  async getTeamDepartments() {
    return apiRequest('/team/departments');
  },
  
  // Messages endpoints
  async getMessages(params?: { page?: number; status?: string }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest(`/messages${query ? `?${query}` : ''}`);
  },
  
  async getMessage(id: number) {
    return apiRequest(`/messages/${id}`);
  },
  
  async createMessage(messageData: any) {
    return apiRequest('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  },
  
  async replyToMessage(id: number, replyData: any) {
    return apiRequest(`/messages/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify(replyData),
    });
  },
  
  async markMessageAsRead(id: number) {
    return apiRequest(`/messages/${id}/read`, { method: 'POST' });
  },
  
  // Settings endpoints
  async getSettings() {
    return apiRequest('/settings');
  },
  
  async getPublicSettings() {
    return apiRequest('/settings/public');
  },
  
  async updateSetting(key: string, value: any) {
    return apiRequest(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  },
  
  // Dashboard
  async getDashboardStats() {
    return apiRequest('/dashboard/stats');
  },
  
  // Modules
  async getModules() {
    return apiRequest('/admin/modules');
  },
  
  async getModule(name: string) {
    return apiRequest(`/admin/modules/${encodeURIComponent(name)}`);
  },
  
  async getMenus() {
    return apiRequest('/menus');
  },
  
  async getPermissions() {
    return apiRequest('/permissions');
  },
  
  // Donations
  async getDonations(params?: { page?: number; status?: string }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest(`/donations${query ? `?${query}` : ''}`);
  },
  
  async getDonors(params?: { page?: number }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest(`/donations/donors${query ? `?${query}` : ''}`);
  },
  
  async createDonation(donationData: any) {
    return apiRequest('/donations', {
      method: 'POST',
      body: JSON.stringify(donationData),
    });
  },
  
  async getDonationStats() {
    return apiRequest('/donations/stats');
  },
  
  // Documents
  async getDocuments(params?: { page?: number; type?: string }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest(`/documents${query ? `?${query}` : ''}`);
  },
  
  async getDocument(id: number) {
    return apiRequest(`/documents/${id}`);
  },
  
  async uploadDocument(documentData: any) {
    return apiRequest('/api/documents', {
      method: 'POST',
      body: JSON.stringify(documentData),
    });
  },
  
  async deleteDocument(id: number) {
    return apiRequest(`/api/documents/${id}`, { method: 'DELETE' });
  },
  
  // Audit
  async getAuditLogs(params?: { page?: number; action?: string }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest(`/api/audit${query ? `?${query}` : ''}`);
  },
};

/**
 * Create API composable
 */
export const useApi = () => {
  const isAuthenticated = computed(() => !!token.value);
  const currentToken = computed(() => token.value);
  
  return {
    // State
    token: currentToken,
    refreshToken,
    isAuthenticated,
    user,

    // Auth methods
    setAuth,
    clearAuth,
    refreshAuthToken,
    getAuthHeaders,

    // API
    ...api,
  };
};

export default useApi;
