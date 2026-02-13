import { defineStore } from 'pinia';

export const PERMISSIONS = {
  USER_VIEW: 'user.read',
  USER_CREATE: 'user.create',
  USER_EDIT: 'user.update',
  USER_DELETE: 'user.delete',
  USER_MANAGE: 'user.manage',

  COMPANY_VIEW: 'company.read',
  COMPANY_CREATE: 'company.create',
  COMPANY_EDIT: 'company.update',
  COMPANY_DELETE: 'company.delete',
  COMPANY_MANAGE: 'company.manage',

  ROLE_VIEW: 'role.read',
  ROLE_CREATE: 'role.create',
  ROLE_EDIT: 'role.update',
  ROLE_DELETE: 'role.delete',
  ROLE_MANAGE: 'role.manage',

  PERMISSION_VIEW: 'permission.read',
  PERMISSION_MANAGE: 'permission.manage',

  GROUP_VIEW: 'group.read',
  GROUP_CREATE: 'group.create',
  GROUP_EDIT: 'group.update',
  GROUP_DELETE: 'group.delete',
  GROUP_MANAGE: 'group.manage',

  SYSTEM_SETTINGS: 'system.settings',
  SYSTEM_AUDIT: 'system.audit',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS] | string;

export const ROLES = {
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
  MEMBER: 'member',
} as const;

export type RoleCode = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_PERMISSIONS: Record<RoleCode, PermissionCode[]> = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.EDITOR]: [
    PERMISSIONS.USER_VIEW, PERMISSIONS.USER_CREATE, PERMISSIONS.USER_EDIT,
    PERMISSIONS.COMPANY_VIEW, PERMISSIONS.COMPANY_CREATE, PERMISSIONS.COMPANY_EDIT,
    PERMISSIONS.ROLE_VIEW, PERMISSIONS.GROUP_VIEW, PERMISSIONS.GROUP_CREATE,
    PERMISSIONS.GROUP_EDIT, PERMISSIONS.PERMISSION_VIEW,
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.USER_VIEW, PERMISSIONS.COMPANY_VIEW, PERMISSIONS.ROLE_VIEW,
    PERMISSIONS.GROUP_VIEW, PERMISSIONS.PERMISSION_VIEW,
  ],
  [ROLES.MEMBER]: [
    PERMISSIONS.USER_VIEW, PERMISSIONS.COMPANY_VIEW,
  ],
};

interface MenuItem {
  id: number;
  code: string;
  name: string;
  path: string;
  icon?: string;
  component?: string;
  parent_id: number | null;
  order: number;
  is_visible: boolean;
  module?: string;
  children?: MenuItem[];
  permissions?: {
    can_view: boolean;
    can_edit: boolean;
    can_delete: boolean;
    can_create: boolean;
  };
}

interface PermissionState {
  roles: RoleCode[];
  permissions: PermissionCode[];
  isSuperuser: boolean;
  menus: MenuItem[];
  isMenuLoaded: boolean;
}

export const usePermissionStore = defineStore('permission', {
  state: (): PermissionState => ({
    roles: [],
    permissions: [],
    isSuperuser: false,
    menus: [],
    isMenuLoaded: false,
  }),

  getters: {
    hasPermission: (state) => {
      return (permission: PermissionCode | PermissionCode[]): boolean => {
        if (state.isSuperuser) return true;
        if (Array.isArray(permission)) {
          return permission.some((p) => state.permissions.includes(p));
        }
        return state.permissions.includes(permission);
      };
    },

    hasAllPermissions: (state) => {
      return (permissionList: PermissionCode[]): boolean => {
        if (state.isSuperuser) return true;
        return permissionList.every((p) => state.permissions.includes(p));
      };
    },

    hasRole: (state) => {
      return (role: RoleCode | RoleCode[]): boolean => {
        if (Array.isArray(role)) {
          return role.some((r) => state.roles.includes(r));
        }
        return state.roles.includes(role);
      };
    },

    visibleMenus: (state) => {
      return state.menus.filter((m) => m.is_visible);
    },
  },

  actions: {
    setRoles(userRoles: RoleCode[]) {
      this.roles = userRoles;
      const allPerms = new Set<PermissionCode>();
      userRoles.forEach((role) => {
        (ROLE_PERMISSIONS[role] || []).forEach((p) => allPerms.add(p));
      });
      this.permissions = [...allPerms];
    },

    setPermissions(perms: PermissionCode[]) {
      this.permissions = perms;
    },

    setSuperuser(value: boolean) {
      this.isSuperuser = value;
    },

    async fetchMenus() {
      const authStore = useAuthStore();
      if (!authStore.accessToken) return;

      try {
        const data = await $fetch<{ data: MenuItem[] }>('/api/v1/rbac/menus', {
          headers: { Authorization: `Bearer ${authStore.accessToken}` },
        });
        this.menus = data.data;
        this.isMenuLoaded = true;
      } catch (error) {
        console.error('Failed to fetch menus:', error);
      }
    },

    async fetchPermissions() {
      const authStore = useAuthStore();
      if (!authStore.accessToken) return;

      try {
        const data = await $fetch<{ data: string[] }>('/api/v1/rbac/permissions', {
          headers: { Authorization: `Bearer ${authStore.accessToken}` },
        });
        this.permissions = data.data;
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
      }
    },

    canAccessRoute(permission?: PermissionCode | PermissionCode[]): boolean {
      if (this.isSuperuser) return true;
      if (!permission) return true;
      return this.hasPermission(permission);
    },

    $reset() {
      this.roles = [];
      this.permissions = [];
      this.isSuperuser = false;
      this.menus = [];
      this.isMenuLoaded = false;
    },
  },
});

function useAuthStore() {
  const { useAuthStore: _useAuthStore } = require('./auth');
  return _useAuthStore();
}
