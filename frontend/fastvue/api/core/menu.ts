import type { RouteRecordStringComponent } from '@vben/types';

import { requestClient } from '#/api/request';

interface BackendMenuItem {
  name: string;
  path: string;
  icon?: string;
  sequence?: number;
  children?: BackendMenuItem[];
  module?: string;
}

/**
 * Convert menu path to component path
 * Business module views are loaded dynamically via ModuleView component,
 * not via static file paths. This function is only used for fallback.
 *
 * Examples:
 *   /crm/dashboard -> /crm/dashboard/index.vue
 *   /settings/general -> /settings/general/index.vue
 */
function pathToComponent(menuPath: string): string {
  // Remove leading slash for consistency
  const cleanPath = menuPath.startsWith('/') ? menuPath.slice(1) : menuPath;
  const parts = cleanPath.split('/');

  // Check if this is a settings-type path or specific page
  if (parts.length > 2 && parts[parts.length - 2] === 'settings') {
    // /crm/settings/pipelines -> /crm/settings/pipelines.vue
    return `/${cleanPath}.vue`;
  }

  // Default: /crm/dashboard -> /crm/dashboard/index.vue
  return `/${cleanPath}/index.vue`;
}

/**
 * Convert backend menu format to Vue Router format
 */
function convertMenuToRoute(
  menu: BackendMenuItem,
  parentPath?: string,
): RouteRecordStringComponent {
  // For children, convert absolute path to relative path
  let routePath = menu.path;
  if (parentPath && menu.path.startsWith(parentPath + '/')) {
    routePath = menu.path.substring(parentPath.length + 1);
  }

  const route = {
    name: menu.name.replace(/\s+/g, ''),
    path: routePath,
    meta: {
      title: menu.name,
      icon: menu.icon || 'lucide:circle',
      order: menu.sequence || 10,
    },
  } as RouteRecordStringComponent;

  // For top-level menus, use BasicLayout
  if (!parentPath) {
    route.component = 'BasicLayout';
  } else {
    // For child menus, set the component path to the Vue file
    route.component = pathToComponent(menu.path);
  }

  // Convert children recursively
  if (menu.children && menu.children.length > 0) {
    route.children = menu.children.map((child) =>
      convertMenuToRoute(child, menu.path),
    );
    // If has children and is top-level, redirect to first child
    if (!parentPath && route.children.length > 0) {
      route.redirect = route.children[0]?.path;
    }
  }

  return route;
}

/**
 * Get all menus from backend for installed modules
 * Returns menus in Vue Router compatible format
 */
export async function getAllMenusApi(): Promise<RouteRecordStringComponent[]> {
  try {
    const menus = await requestClient.get<BackendMenuItem[]>(
      '/modules/installed/menus',
    );

    if (!menus || menus.length === 0) {
      return [];
    }

    // Convert backend menu format to route format
    return menus.map((menu) => convertMenuToRoute(menu));
  } catch (error) {
    console.warn('Failed to fetch menus from backend:', error);
    return [];
  }
}
