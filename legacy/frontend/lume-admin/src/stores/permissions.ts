import { defineStore } from 'pinia';
import type { Permission } from '@/types/api';
import { useApi } from '@/composables';

export const usePermissionsStore = defineStore('permissions', () => {
  const state = () => ({
    permissions: [],
    loading: false,
    error: null,
    lastSyncTime: null,
    syncStatus: false
  });

  const getters = {
    hasPermission: (state: { permissions }) => {
      return state.permissions.includes(permissions);
    }
  };

  const actions = {
    fetchPermissions: async () => {
      const { get } = useApi();
      
      try {
        state.loading = true;
        state.error = null;
        
        const response = await get('/admin/permissions');
        
        if (response.success) {
          state.permissions = response.data.permissions || [];
          state.lastSyncTime = new Date().toISOString();
          return true;
        }
        
        state.loading = false;
      } catch (error) {
        state.loading = false;
        state.error = state.error || error.message || 'Failed to fetch permissions';
        console.error('Permissions fetch error:', state.error);
        return false;
      }
    },

    refreshPermissions: async (): Promise<boolean> => {
      const { post } = useApi();
      
      try {
        state.loading = true;
        state.error = null;
        
        const response = await post('/admin/permissions/refresh', {});
        
        if (response.success) {
          state.permissions = response.data.permissions || [];
          state.lastSyncTime = new Date().toISOString();
          return true;
        }
        
        state.loading = false;
      } catch (error) {
        state.loading = false;
        state.error = state.error || error.message || 'Failed to refresh permissions';
        console.error('Permissions refresh error:', state.error);
          return false;
      }
    },

    updatePermission: async (userId: number, permission: Permission): Promise<boolean> => {
      const { put } = useApi();
      
      try {
        state.loading = true;
        state.error = null;
        
        const response = await put(`/admin/permissions/${userId}`, {
          action: 'update_permission',
          permission: permission
        });
        
        if (response.success) {
          return true;
        }
        
        state.loading = false;
      } catch (error) {
        state.loading = false;
        state.error = state.error || error.message || 'Failed to update permission';
        return false;
      }
    }
  };

  return {
    state, actions, getters
  };
});