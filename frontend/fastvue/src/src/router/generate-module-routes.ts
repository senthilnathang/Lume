import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';

/**
 * Backend menu item structure from /modules/installed/menus API
 */
interface BackendMenuItem {
  name: string;
  path: string;
  icon?: string;
  sequence?: number;
  module?: string;
  viewName?: string;
  hideInMenu?: boolean;
  children?: BackendMenuItem[];
}

/**
 * Convert backend menu items to Vue Router routes using ModuleView.
 * This enables truly dynamic routing where routes are loaded at runtime
 * based on installed modules, not statically defined in frontend files.
 */
export function generateModuleRoutes(
  menus: BackendMenuItem[],
): RouteRecordRaw[] {
  return menus
    .filter((menu) => menu.module)
    .map((menu) => convertMenuToModuleRoute(menu));
}

/**
 * Convert a single menu item (and its children) to a Vue Router route.
 * Top-level routes use BasicLayout, leaf nodes use ModuleView.
 */
function convertMenuToModuleRoute(
  menu: BackendMenuItem,
  parentPath?: string,
): RouteRecordRaw {
  const moduleName = menu.module!;
  const isTopLevel = !parentPath;

  // Calculate relative path for children
  let routePath = menu.path;
  if (parentPath && menu.path.startsWith(parentPath + '/')) {
    routePath = menu.path.substring(parentPath.length + 1);
  }

  // Generate unique route name: MODULE_MenuName
  const routeName = `${moduleName.toUpperCase()}_${menu.name.replace(/\s+/g, '')}`;

  // Determine if this is a leaf node (has viewName and no children)
  const isLeafNode =
    menu.viewName && (!menu.children || menu.children.length === 0);

  const hasChildren = menu.children && menu.children.length > 0;

  // Build children first to determine redirect
  let children: RouteRecordRaw[] | undefined;
  let redirect: string | undefined;

  if (hasChildren) {
    children = menu.children!.map((child) =>
      convertMenuToModuleRoute({ ...child, module: moduleName }, menu.path),
    );

    // Add redirect to first child for parent routes
    if (children.length > 0) {
      const firstChild = children[0];
      if (firstChild && firstChild.path) {
        redirect = firstChild.path.startsWith('/')
          ? firstChild.path
          : `${menu.path}/${firstChild.path}`;
      }
    }
  }

  // Base route structure
  const baseRoute = {
    name: routeName,
    path: routePath,
    meta: {
      title: menu.name,
      icon: menu.icon || 'lucide:circle',
      order: menu.sequence || 10,
      module: moduleName,
      ...(menu.hideInMenu ? { hideInMenu: true } : {}),
    },
  };

  // Build the route based on its type
  if (isTopLevel) {
    // Top-level routes use BasicLayout
    return {
      ...baseRoute,
      component: BasicLayout,
      redirect,
      children,
    } as RouteRecordRaw;
  } else if (isLeafNode) {
    // Leaf nodes use ModuleView to dynamically load views from backend
    const leafRoute = {
      ...baseRoute,
      component: () => import('#/components/module/ModuleView.vue'),
      props: {
        moduleName,
        viewName: menu.viewName,
      },
    } as RouteRecordRaw;

    // For form/detail views, add a child route with :id parameter
    // so that /module/form/123 is also matched
    const viewName = menu.viewName || '';
    if (['form', 'detail'].includes(viewName)) {
      leafRoute.children = [
        {
          path: ':id',
          name: `${routeName}_WithId`,
          component: () => import('#/components/module/ModuleView.vue'),
          props: {
            moduleName,
            viewName: menu.viewName,
          },
          meta: {
            title: menu.name,
            hideInMenu: true,
            module: moduleName,
          },
        },
      ];
    }

    return leafRoute;
  } else {
    // Intermediate parent routes (have children but are not top-level)
    return {
      ...baseRoute,
      redirect,
      children,
    } as RouteRecordRaw;
  }
}
