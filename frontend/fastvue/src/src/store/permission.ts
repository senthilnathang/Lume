import { computed, ref } from 'vue';

import { useAccessStore } from '@vben/stores';

import { defineStore } from 'pinia';

/**
 * Permission codes for FastVue modules
 * These match the backend permission codenames (dot notation)
 */
export const PERMISSIONS = {
  // User module
  USER_VIEW: 'user.read',
  USER_CREATE: 'user.create',
  USER_EDIT: 'user.update',
  USER_DELETE: 'user.delete',
  USER_MANAGE: 'user.manage',

  // Company module
  COMPANY_VIEW: 'company.read',
  COMPANY_CREATE: 'company.create',
  COMPANY_EDIT: 'company.update',
  COMPANY_DELETE: 'company.delete',
  COMPANY_MANAGE: 'company.manage',

  // Role module
  ROLE_VIEW: 'role.read',
  ROLE_CREATE: 'role.create',
  ROLE_EDIT: 'role.update',
  ROLE_DELETE: 'role.delete',
  ROLE_MANAGE: 'role.manage',

  // Permission module
  PERMISSION_VIEW: 'permission.read',
  PERMISSION_MANAGE: 'permission.manage',

  // Group module
  GROUP_VIEW: 'group.read',
  GROUP_CREATE: 'group.create',
  GROUP_EDIT: 'group.update',
  GROUP_DELETE: 'group.delete',
  GROUP_MANAGE: 'group.manage',

  // System/Settings module
  SYSTEM_SETTINGS: 'system.settings',
  SYSTEM_AUDIT: 'system.audit',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS] | string;

/**
 * Role definitions with their default permissions
 * These match the backend SystemRole enum
 */
export const ROLES = {
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
  MEMBER: 'member',
} as const;

export type RoleCode = (typeof ROLES)[keyof typeof ROLES];

/**
 * Default permissions by role
 */
export const ROLE_PERMISSIONS: Record<RoleCode, PermissionCode[]> = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.EDITOR]: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_EDIT,
    PERMISSIONS.COMPANY_VIEW,
    PERMISSIONS.COMPANY_CREATE,
    PERMISSIONS.COMPANY_EDIT,
    PERMISSIONS.ROLE_VIEW,
    PERMISSIONS.GROUP_VIEW,
    PERMISSIONS.GROUP_CREATE,
    PERMISSIONS.GROUP_EDIT,
    PERMISSIONS.PERMISSION_VIEW,
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.COMPANY_VIEW,
    PERMISSIONS.ROLE_VIEW,
    PERMISSIONS.GROUP_VIEW,
    PERMISSIONS.PERMISSION_VIEW,
  ],
  [ROLES.MEMBER]: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.COMPANY_VIEW,
  ],
};

export const usePermissionStore = defineStore('permission', () => {
  const accessStore = useAccessStore();

  // User's roles
  const roles = ref<RoleCode[]>([]);

  // Is superuser flag
  const isSuperuser = ref(false);

  // Computed permissions from accessCodes
  const permissions = computed(() => accessStore.accessCodes as PermissionCode[]);

  // Check if user has specific permission
  function hasPermission(permission: PermissionCode | PermissionCode[]): boolean {
    // Superuser has all permissions
    if (isSuperuser.value) {
      return true;
    }

    const codes = permissions.value;

    if (Array.isArray(permission)) {
      // Check if user has ANY of the permissions
      return permission.some((p) => codes.includes(p));
    }

    return codes.includes(permission);
  }

  // Check if user has ALL specified permissions
  function hasAllPermissions(permissionList: PermissionCode[]): boolean {
    // Superuser has all permissions
    if (isSuperuser.value) {
      return true;
    }

    const codes = permissions.value;
    return permissionList.every((p) => codes.includes(p));
  }

  // Check if user has specific role
  function hasRole(role: RoleCode | RoleCode[]): boolean {
    if (Array.isArray(role)) {
      return role.some((r) => roles.value.includes(r));
    }
    return roles.value.includes(role);
  }

  // Set user roles and update permissions
  function setRoles(userRoles: RoleCode[]) {
    roles.value = userRoles;

    // Compute permissions from roles
    const allPermissions = new Set<PermissionCode>();
    userRoles.forEach((role) => {
      const rolePerms = ROLE_PERMISSIONS[role] || [];
      rolePerms.forEach((p) => allPermissions.add(p));
    });

    accessStore.setAccessCodes([...allPermissions]);
  }

  // Set permissions directly (from API)
  function setPermissions(perms: PermissionCode[]) {
    accessStore.setAccessCodes(perms);
  }

  // Set superuser status
  function setSuperuser(value: boolean) {
    isSuperuser.value = value;
  }

  // Check if user can access a route based on meta.permission
  function canAccessRoute(permission?: PermissionCode | PermissionCode[]): boolean {
    // Superuser can access everything
    if (isSuperuser.value) {
      return true;
    }

    if (!permission) {
      return true;
    }

    return hasPermission(permission);
  }

  function $reset() {
    roles.value = [];
    isSuperuser.value = false;
  }

  return {
    // State
    roles,
    permissions,
    isSuperuser,
    // Getters
    hasPermission,
    hasAllPermissions,
    hasRole,
    canAccessRoute,
    // Actions
    setRoles,
    setPermissions,
    setSuperuser,
    $reset,
  };
});
