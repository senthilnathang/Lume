import { RouteRecordRaw } from 'vue-router'
import { BackendMenuItem } from '@/stores/access'

interface MenuItemWithModule extends BackendMenuItem {
  module?: string
  viewName?: string
}

const layoutImports: Record<string, () => Promise<any>> = {
  BasicLayout: () => import('@/layouts/BasicLayout.vue')
}

const viewImports: Record<string, () => Promise<any>> = {
  ModuleView: () => import('@/components/module/ModuleView.vue')
}

export function generateModuleRoutes(menus: MenuItemWithModule[]): RouteRecordRaw[] {
  const routes: RouteRecordRaw[] = []

  function processMenuItems(
    items: MenuItemWithModule[],
    parentPath = ''
  ): RouteRecordRaw[] {
    const routeList: RouteRecordRaw[] = []

    items.forEach(menu => {
      if (menu.hideInMenu) {
        return
      }

      const fullPath = menu.path || parentPath
      const hasChildren = menu.children && menu.children.length > 0

      if (hasChildren) {
        // Group route with children
        const groupRoute: RouteRecordRaw = {
          path: fullPath,
          component: () => import('@/layouts/BasicLayout.vue'),
          children: processMenuItems(menu.children, fullPath),
          meta: {
            requiresAuth: true,
            title: menu.name
          }
        }
        routeList.push(groupRoute)
      } else if (menu.module && menu.viewName) {
        // Leaf route with ModuleView
        const leafRoute: RouteRecordRaw = {
          path: fullPath,
          name: menu.name,
          component: () => import('@/layouts/BasicLayout.vue'),
          children: [
            {
              path: '',
              name: `${menu.module}-${menu.viewName}`,
              component: () => import('@/components/module/ModuleView.vue'),
              props: {
                moduleName: menu.module,
                viewName: menu.viewName
              },
              meta: {
                requiresAuth: true,
                title: menu.name
              }
            }
          ],
          meta: {
            requiresAuth: true,
            title: menu.name
          }
        }
        routeList.push(leafRoute)
      }
    })

    return routeList
  }

  const processedRoutes = processMenuItems(menus)
  routes.push(...processedRoutes)

  return routes
}

export function flattenRoutes(
  routes: RouteRecordRaw[],
  parent = ''
): RouteRecordRaw[] {
  const flat: RouteRecordRaw[] = []

  routes.forEach(route => {
    const path = parent ? `${parent}${route.path}` : route.path

    if (route.children && route.children.length > 0) {
      flat.push(...flattenRoutes(route.children, path))
    } else {
      flat.push({
        ...route,
        path
      })
    }
  })

  return flat
}
