/**
 * Authentication Store
 * Manages user authentication state and operations
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { post, get, del } from '@/api/request';

interface UserInfo {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string | { name: string };
  role_id?: number;
  avatar?: string;
}

interface LoginParams {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  refreshToken?: string;
  user: UserInfo;
}

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter();
  
  // State
  const token = ref<string | null>(localStorage.getItem('token'));
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'));
  const userInfo = ref<UserInfo | null>(null);
  const loading = ref(false);

  // Getters
  const isAuthenticated = computed(() => !!token.value);
  
  const userName = computed(() => {
    if (userInfo.value?.first_name || userInfo.value?.last_name) {
      return `${userInfo.value.first_name} ${userInfo.value.last_name}`.trim();
    }
    return userInfo.value?.email?.split('@')[0] || 'User';
  });

  const userAvatar = computed(() => userInfo.value?.avatar);

  const roleName = computed(() => {
    const role = userInfo.value?.role;
    if (!role) return '';
    return typeof role === 'string' ? role : role.name || '';
  });

  const tokenClaims = computed<Record<string, unknown>>(() => {
    try {
      const payload = (token.value || '').split('.')[1];
      if (!payload) return {};
      return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
      return {};
    }
  });

  const tokenRole = computed(() => String(tokenClaims.value.role || tokenClaims.value.roleName || ''));
  const tokenRoleId = computed(() => Number(tokenClaims.value.role_id ?? tokenClaims.value.roleId ?? 0));

  const isAdmin = computed(() => {
    if (roleName.value === 'admin' || roleName.value === 'super_admin') return true;
    if (tokenRole.value === 'admin' || tokenRole.value === 'super_admin') return true;
    return tokenRoleId.value === 1;
  });

  // Actions
  async function login(params: LoginParams): Promise<boolean> {
    loading.value = true;
    try {
      const response = await post<LoginResponse>('/users/login', params);
      
      if (response) {
        token.value = response.token;
        refreshToken.value = response.refreshToken || null;
        userInfo.value = response.user;
        
        localStorage.setItem('token', response.token);
        if (response.refreshToken) {
          localStorage.setItem('refreshToken', response.refreshToken);
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function logout(): Promise<void> {
    try {
      await del('/users/logout');
    } catch {
      // Ignore logout errors
    } finally {
      token.value = null;
      refreshToken.value = null;
      userInfo.value = null;
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userInfo');
      router.push('/login');
    }
  }

  async function getUserInfo(): Promise<boolean> {
    if (!token.value) return false;
    
    try {
      const response = await get<{ user: UserInfo }>('/users/me');
      if (response) {
        userInfo.value = response.user;
        localStorage.setItem('userInfo', JSON.stringify(response.user));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to get user info:', error);
      return false;
    }
  }

  async function doRefreshToken(): Promise<boolean> {
    if (!refreshToken.value) return false;
    
    try {
      const response = await post<{ token: string; refreshToken?: string }>('/auth/refresh-token', {
        refresh_token: refreshToken.value,
      });
      
      if (response?.token) {
        token.value = response.token;
        if (response.refreshToken) {
          refreshToken.value = response.refreshToken;
          localStorage.setItem('refreshToken', response.refreshToken);
        }
        localStorage.setItem('token', response.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      refreshToken.value = null;
      localStorage.removeItem('refreshToken');
      return false;
    }
  }

  function initializeAuth(): void {
    const storedUser = localStorage.getItem('userInfo');
    if (storedUser && token.value) {
      try {
        userInfo.value = JSON.parse(storedUser);
      } catch {
        userInfo.value = null;
      }
    }
  }

  return {
    // State
    token,
    refreshToken,
    userInfo,
    loading,
    // Getters
    isAuthenticated,
    userName,
    userAvatar,
    roleName,
    isAdmin,
    // Actions
    login,
    logout,
    getUserInfo,
    doRefreshToken,
    initializeAuth,
  };
});
