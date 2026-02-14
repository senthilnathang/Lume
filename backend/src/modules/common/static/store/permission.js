/**
 * Permission Store for Dynamic Module Views
 * Provides permission checking utilities
 */

import { ref, computed } from 'vue';

// Permission constants
export const PERMISSIONS = {
  // User permissions
  USER_VIEW: 'base.users.read',
  USER_CREATE: 'base.users.create',
  USER_EDIT: 'base.users.update',
  USER_DELETE: 'base.users.delete',
  // Role permissions
  ROLE_VIEW: 'base.roles.read',
  ROLE_MANAGE: 'base.roles.manage',
  // Settings permissions
  SETTINGS_VIEW: 'settings.read',
  SETTINGS_MANAGE: 'settings.manage',
  // Module permissions
  MODULE_VIEW: 'base.modules.read',
  MODULE_MANAGE: 'base.modules.manage',
  // Audit permissions
  AUDIT_VIEW: 'audit.read',
  // Activities permissions
  ACTIVITIES_VIEW: 'activities.read',
  ACTIVITIES_MANAGE: 'activities.manage',
  // Team permissions
  TEAM_VIEW: 'team.read',
  TEAM_MANAGE: 'team.manage',
  // Donations permissions
  DONATIONS_VIEW: 'donations.read',
  DONATIONS_MANAGE: 'donations.manage',
  // Documents permissions
  DOCUMENTS_VIEW: 'documents.read',
  DOCUMENTS_MANAGE: 'documents.manage',
  // Media permissions
  MEDIA_VIEW: 'media.read',
  MEDIA_MANAGE: 'media.manage',
  // Messages permissions
  MESSAGES_VIEW: 'messages.read',
  MESSAGES_MANAGE: 'messages.manage',
  // Dashboard permissions
  DASHBOARD_VIEW: 'dashboard.view',
  DASHBOARD_CREATE: 'dashboard.create',
  DASHBOARD_EDIT: 'dashboard.edit',
  DASHBOARD_DELETE: 'dashboard.delete',
};

// Store state
const userPermissions = ref(new Set());
const isLoaded = ref(false);

/**
 * Permission store composable
 */
export function usePermissionStore() {
  // Check if user has a specific permission
  function hasPermission(permission) {
    // Admin and super_admin roles have all permissions
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = user.role || user.roleName || '';
    if (role === 'admin' || role === 'super_admin') return true;

    return userPermissions.value.has(permission);
  }

  // Check if user has any of the given permissions
  function hasAnyPermission(permissions) {
    return permissions.some(p => hasPermission(p));
  }

  // Check if user has all of the given permissions
  function hasAllPermissions(permissions) {
    return permissions.every(p => hasPermission(p));
  }

  // Load permissions from API or localStorage
  async function loadPermissions() {
    try {
      // Try to get from localStorage first
      const cached = localStorage.getItem('userPermissions');
      if (cached) {
        const perms = JSON.parse(cached);
        userPermissions.value = new Set(perms);
        isLoaded.value = true;
        return;
      }

      // No cached permissions - start with empty set (secure default)
      // Permissions should be loaded via setPermissions() after authentication
      userPermissions.value = new Set();
      isLoaded.value = true;
    } catch (err) {
      console.error('Failed to load permissions:', err);
      // SECURITY: Default to NO permissions on error (fail-secure)
      userPermissions.value = new Set();
      isLoaded.value = true;
    }
  }

  // Set permissions directly
  function setPermissions(permissions) {
    userPermissions.value = new Set(permissions);
    localStorage.setItem('userPermissions', JSON.stringify(permissions));
    isLoaded.value = true;
  }

  // Clear permissions
  function clearPermissions() {
    userPermissions.value = new Set();
    localStorage.removeItem('userPermissions');
    isLoaded.value = false;
  }

  // Initialize on first use
  if (!isLoaded.value) {
    loadPermissions();
  }

  return {
    permissions: userPermissions,
    isLoaded,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    loadPermissions,
    setPermissions,
    clearPermissions,
  };
}
