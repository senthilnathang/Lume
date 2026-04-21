/**
 * Permission Store
 * Manages user permissions and access control
 * Follows FastVue patterns with dynamic menu loading
 */

import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { get } from '@/api/request';
import { useAuthStore } from './auth';

export interface MenuItem {
  id?: number;
  name: string;
  path: string;
  title?: string;
  icon?: string;
  permission?: string;
  parent_id?: number;
  sort?: number;
  sequence?: number;
  children?: MenuItem[];
  module?: string;
  viewName?: string;
  hideInMenu?: boolean;
}

export interface RouteRecord {
  path: string;
  name: string;
  component?: string;
  props?: Record<string, any>;
  meta?: {
    title?: string;
    icon?: string;
    permission?: string;
    requiresAuth?: boolean;
    order?: number;
    module?: string;
    hideInMenu?: boolean;
  };
  children?: RouteRecord[];
  redirect?: string;
}

export interface BackendMenuItem {
  name: string;
  path: string;
  icon?: string;
  sequence?: number;
  permission?: string;
  children?: BackendMenuItem[];
  module?: string;
  viewName?: string;
  hideInMenu?: boolean;
}

export const usePermissionStore = defineStore('permission', () => {
  const authStore = useAuthStore();
  
  // State
  const permissions = ref<string[]>([]);
  const menus = ref<MenuItem[]>([]);
  const accessRoutes = ref<RouteRecord[]>([]);
  const loading = ref(false);
  const menusLoaded = ref(false);

  // Watch for auth changes and fetch menus automatically
  const unwatch = watch(() => authStore.isAuthenticated, (isAuth) => {
    if (isAuth && !menusLoaded.value) {
      fetchMenus();
    }
  }, { immediate: true });

  // Getters
  const hasPermission = computed(() => {
    return (permission: string): boolean => {
      if (!authStore.isAuthenticated) return false;
      // Admin has all permissions
      if (permissions.value.includes('*')) return true;
      return permissions.value.includes(permission);
    };
  });

  const hasAnyPermission = computed(() => {
    return (permList: string[]): boolean => {
      if (!authStore.isAuthenticated) return false;
      if (authStore.userInfo?.role === 'admin') return true;
      return permList.some(p => permissions.value.includes(p));
    };
  });

  const hasAllPermissions = computed(() => {
    return (permList: string[]): boolean => {
      if (!authStore.isAuthenticated) return false;
      if (authStore.userInfo?.role === 'admin') return true;
      return permList.every(p => permissions.value.includes(p));
    };
  });

  const filteredMenus = computed(() => {
    return menus.value.filter(menu => {
      if (menu.hideInMenu) return false;
      if (menu.permission && !hasPermission.value(menu.permission)) return false;
      return true;
    });
  });

  // Actions
  async function fetchPermissions(): Promise<boolean> {
    // Check both token and userInfo
    const hasToken = !!authStore.token;
    const isAdmin = authStore.userInfo?.role === 'admin' || authStore.userInfo?.role_id === 1;
    
    if (!hasToken) return false;
    
    loading.value = true;
    try {
      // API returns { success: true, data: [...] }
      const response = await get<string[]>('/permissions');
      if (response && Array.isArray(response)) {
        // Grant all permissions to admin users
        if (isAdmin) {
          // Add wildcard permissions for admin
          permissions.value = [...response, '*'];
        } else {
          permissions.value = response;
        }
        return true;
      }
      // If response is empty but we have admin, grant all
      if (isAdmin) {
        permissions.value = ['*'];
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      // Grant all permissions on error for admin
      if (isAdmin) {
        permissions.value = ['*'];
        return true;
      }
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function fetchMenus(): Promise<boolean> {
    // Check if has token
    if (!authStore.token) return false;
    if (menusLoaded.value) return true;
    
    loading.value = true;
    try {
      const response = await get<BackendMenuItem[]>('/menus');
      if (response && Array.isArray(response)) {
        // Deduplicate menus - keep the one with children if duplicates exist
        const menuMap = new Map<string, BackendMenuItem>();
        
        for (const menu of response) {
          const existing = menuMap.get(menu.path);
          if (!existing) {
            menuMap.set(menu.path, menu);
          } else if (menu.children && menu.children.length > 0) {
            // Prefer menu with children over flat menu
            menuMap.set(menu.path, menu);
          }
        }
        
        menus.value = Array.from(menuMap.values()) as unknown as MenuItem[];
        menusLoaded.value = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to fetch menus:', error);
      return false;
    } finally {
      loading.value = false;
    }
  }

  function filterRoutes(routes: RouteRecord[]): RouteRecord[] {
    return routes.filter(route => {
      const { permission } = route.meta || {};
      
      if (permission && !hasPermission.value(permission)) {
        return false;
      }
      
      if (route.children) {
        route.children = filterRoutes(route.children);
      }
      
      return true;
    });
  }

  function generateMenusFromRoutes(routes: RouteRecord[]): MenuItem[] {
    const menus: MenuItem[] = [];
    
    for (const route of routes) {
      if (route.meta?.title) {
        menus.push({
          name: route.name,
          path: route.path,
          title: route.meta.title,
          icon: route.meta.icon,
          permission: route.meta.permission,
          module: route.meta.module,
          hideInMenu: route.meta.hideInMenu,
        });
      }
      
      if (route.children) {
        const children = generateMenusFromRoutes(route.children);
        menus.push(...children);
      }
    }
    
    return menus;
  }

  function convertMenusToRoutes(menus: BackendMenuItem[]): RouteRecord[] {
    return menus
      .filter(menu => menu.module)
      .map(menu => convertMenuToRoute(menu));
  }

  function convertMenuToRoute(menu: BackendMenuItem, parentPath?: string): RouteRecord {
    const moduleName = menu.module || '';
    const isTopLevel = !parentPath;
    
    let routePath = menu.path;
    if (parentPath && menu.path.startsWith(parentPath + '/')) {
      routePath = menu.path.substring(parentPath.length + 1);
    }

    const routeName = `${moduleName.toUpperCase()}_${menu.name.replace(/\s+/g, '')}`;
    const isLeafNode = menu.viewName && (!menu.children || menu.children.length === 0);
    const hasChildren = menu.children && menu.children.length > 0;

    let children: RouteRecord[] | undefined;
    let redirect: string | undefined;

    if (hasChildren) {
      children = menu.children!.map(child =>
        convertMenuToRoute({ ...child, module: moduleName }, menu.path)
      );
      
      if (children.length > 0) {
        const firstChild = children[0];
        if (firstChild && firstChild.path) {
          redirect = firstChild.path.startsWith('/')
            ? firstChild.path
            : `${menu.path}/${firstChild.path}`;
        }
      }
    }

    const baseRoute: RouteRecord = {
      name: routeName,
      path: routePath,
      meta: {
        title: menu.name,
        icon: menu.icon || 'lucide:circle',
        order: menu.sequence || 10,
        module: moduleName,
        permission: menu.permission,
        hideInMenu: menu.hideInMenu,
      },
    };

    if (isTopLevel) {
      return {
        ...baseRoute,
        component: 'BasicLayout',
        redirect,
        children,
      };
    } else if (isLeafNode) {
      return {
        ...baseRoute,
        component: 'ModuleView',
        props: {
          moduleName,
          viewName: menu.viewName,
        },
        children: (['form', 'detail'].includes(menu.viewName || '')) ? [
          {
            path: ':id',
            name: `${routeName}_WithId`,
            component: 'ModuleView',
            props: { moduleName, viewName: menu.viewName },
            meta: {
              title: menu.name,
              hideInMenu: true,
              module: moduleName,
            },
          },
        ] : undefined,
      };
    } else {
      return {
        ...baseRoute,
        redirect,
        children,
      };
    }
  }

  function setAccessRoutes(routes: RouteRecord[]): void {
    accessRoutes.value = routes;
  }

  function clearPermissions(): void {
    permissions.value = [];
    menus.value = [];
    accessRoutes.value = [];
    menusLoaded.value = false;
    unwatch();
  }

  return {
    // State
    permissions,
    menus,
    accessRoutes,
    loading,
    menusLoaded,
    // Getters
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    filteredMenus,
    // Actions
    fetchPermissions,
    fetchMenus,
    filterRoutes,
    generateMenusFromRoutes,
    convertMenusToRoutes,
    setAccessRoutes,
    clearPermissions,
  };
});
