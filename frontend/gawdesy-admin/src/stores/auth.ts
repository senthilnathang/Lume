import { defineStore } from 'pinia';
import type { User } from '@/types/api';
import { useApi } from '@/composables';

export const useAuthStore = defineStore('auth', () => {
  const state = () => ({
    user: null as User | null,
    token: null as string | null,
    permissions: [],
    loading: false,
    error: null as string | null,
    messages: []
  });

  const getters = {
    isAuthenticated: (state) => !!state.user && !!state.token,
    user: (state) => state.user,
    userInfo: (state) => ({
      fullName: state.user ? `${state.user.first_name} ${state.user.last_name}` : '',
      email: state.user?.email || '',
      role: state.user?.role || 'user',
      avatar: state.user?.avatar || null,
      userId: state.user?.id
    }),
    permissions: (state) => state.permissions,
    hasPermission: (state) => (permission: any) => {
      if (!state.user || !state.token) return false;
      return state.permissions.includes(permission);
    }
  };

  const actions = {
    login: async (email: string, password: string): Promise<boolean> => {
      const { post } = useApi();
      
      try {
        state.loading = true;
        state.error = null;
        
        const response = await post('/auth/login', {
          email,
          password
        });
          
        if (response.token && response.user) {
          state.token = response.token;
          state.user = response.user;
          state.loading = false;
          
          // Store user info in localStorage
          localStorage.setItem('token', state.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          
          return true;
        }
        
        state.error = response.error || 'Invalid credentials';
        
        return false;
      } catch (error) {
        state.loading = false;
        state.error = error;
        console.error('Login error:', error);
        return false;
      }
    },

    logout: () => {
      state.token = null;
      state.user = null;
      state.loading = false;
      state.error = null;
      
      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Clear all auth state
      Object.keys(state).forEach(key => {
        state[key] = null;
      });
      
      state.messages = [];
      
      return true;
    },

    getUserInfo: () => {
      return state.user || {
        id: state.user?.id || 0,
        email: state.user?.email || '',
        firstName: state.user?.first_name || '',
        lastName: state.user?.last_name || '',
        phone: state.user?.phone || '',
        role: state.user?.role || '',
        avatar: state.user?.avatar || '',
        created_at: state.user?.created_at || '',
        last_login: state.user?.last_login || '',
        updated_at: state.user?.updated_at || ''
      };
    }
  },

    updateUser: async (data: Partial<User>): Promise<boolean> => {
      const { put } = useApi();
      
      try {
        state.loading = true;
        state.error = null;
        
        const response = await put(`/admin/users/${state.user.id}`, data);
        
        if (response.success) {
          // Update user in store
          state.user = response.user;
          localStorage.setItem('user', JSON.stringify(response.user));
          
          state.loading = false;
          state.error = null;
          return true;
        }
        
        state.error = response.error || 'Failed to update user';
        console.error('Update error:', state.error);
        return false;
      } catch (error) {
        state.loading = false;
        state.error = state.error || error.message || 'Update failed';
        return false;
      }
    },

    refreshToken: async (): Promise<boolean> => {
      const { post } = useApi();
      
      try {
        const response = await post('/auth/refresh-token', {
          headers: { 
            'Authorization': `Bearer ${state.token}`
          }
        });
        
        if (response.success) {
          state.token = response.token;
          return true;
        }
        
        state.error = response.error || 'Failed to refresh token';
        console.error('Token refresh error:', state.error);
        return false;
      } catch (error) {
        state.error = state.error || error.message || 'Token refresh failed';
          return false;
      }
    }
  },

    hasPermission: (permission: string): boolean => {
      if (!state.user || !state.token) return false;
      
      // Check against user permissions or backend
      const userPermissions = state.permissions;
      if (userPermissions.includes(permission)) {
        return true;
      }
      
      return false;
    }
  };

  return {
    state, actions, getters
  };
});