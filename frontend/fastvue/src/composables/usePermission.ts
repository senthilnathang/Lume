import { computed } from 'vue';

import type { PermissionCode, RoleCode } from '#/store/permission';

import { PERMISSIONS, ROLES, usePermissionStore } from '#/store/permission';

/**
 * Composable for checking permissions in components
 *
 * Usage:
 * const { hasPermission, hasRole, isAdmin, isManager } = usePermission();
 *
 * if (hasPermission('employee:create')) {
 *   // show create button
 * }
 */
export function usePermission() {
  const permissionStore = usePermissionStore();

  // Check single or multiple permissions (OR logic)
  const hasPermission = (permission: PermissionCode | PermissionCode[]) => {
    return permissionStore.hasPermission(permission);
  };

  // Check if user has ALL permissions (AND logic)
  const hasAllPermissions = (permissions: PermissionCode[]) => {
    return permissionStore.hasAllPermissions(permissions);
  };

  // Check role
  const hasRole = (role: RoleCode | RoleCode[]) => {
    return permissionStore.hasRole(role);
  };

  // Computed helpers for common checks
  const isAdmin = computed(() => hasRole(ROLES.ADMIN));
  const isHR = computed(() => hasRole(ROLES.ADMIN));
  const isManager = computed(() => hasRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.EDITOR]));

  // Module-specific permission checks
  const canManageEmployees = computed(() =>
    hasPermission([PERMISSIONS.USER_CREATE, PERMISSIONS.USER_EDIT, PERMISSIONS.USER_DELETE]),
  );

  const canApproveLeave = computed(() => hasPermission(PERMISSIONS.USER_MANAGE as PermissionCode));

  const canManageAttendance = computed(() => hasPermission(PERMISSIONS.USER_MANAGE as PermissionCode));

  const canManagePayroll = computed(() => hasPermission(PERMISSIONS.ROLE_MANAGE as PermissionCode));

  const canManageAssets = computed(() =>
    hasPermission([PERMISSIONS.USER_MANAGE, PERMISSIONS.COMPANY_MANAGE]),
  );

  const canManageRecruitment = computed(() => hasPermission(PERMISSIONS.USER_MANAGE as PermissionCode));

  const canManageSettings = computed(() => hasPermission(PERMISSIONS.SYSTEM_SETTINGS as PermissionCode));

  const canExportReports = computed(() => hasPermission(PERMISSIONS.SYSTEM_AUDIT as PermissionCode));

  return {
    // Methods
    hasPermission,
    hasAllPermissions,
    hasRole,
    // Computed checks
    isAdmin,
    isHR,
    isManager,
    canManageEmployees,
    canApproveLeave,
    canManageAttendance,
    canManagePayroll,
    canManageAssets,
    canManageRecruitment,
    canManageSettings,
    canExportReports,
    // Constants for convenience
    PERMISSIONS,
    ROLES,
  };
}
