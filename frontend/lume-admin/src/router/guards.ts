import { Router, RouteLocationNormalized } from 'vue-router'
import { useAccessStore } from '@/stores/access'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { getInstalledMenus } from '@/api/modules'
import { generateModuleRoutes } from './generate-routes'

export function setupAuthGuard(router: Router) {
  router.beforeEach((to: RouteLocationNormalized, from, next) => {
    const accessStore = useAccessStore()

    const requiresAuth = to.matched.some(record => record.meta?.requiresAuth)

    if (requiresAuth && !accessStore.isAuthenticated) {
      next('/login')
    } else if (to.path === '/login' && accessStore.isAuthenticated) {
      next('/')
    } else {
      next()
    }
  })
}

export async function setupAccessGuard(router: Router) {
  router.beforeEach(async (to: RouteLocationNormalized, from, next) => {
    const accessStore = useAccessStore()
    const authStore = useAuthStore()
    const userStore = useUserStore()

    const requiresAuth = to.matched.some(record => record.meta?.requiresAuth)

    if (!requiresAuth) {
      next()
      return
    }

    // If not yet checked access, fetch menus and register routes
    if (!accessStore.isAccessChecked && accessStore.isAuthenticated) {
      try {
        const menus = await getInstalledMenus()
        accessStore.setMenus(menus)

        // Generate routes from menus
        const routes = generateModuleRoutes(menus)
        routes.forEach(route => {
          router.addRoute(route)
        })

        // Fetch current user info
        if (!userStore.userInfo) {
          try {
            await authStore.fetchUserInfo()
          } catch (err) {
            console.warn('Failed to fetch user info:', err)
          }
        }

        accessStore.setAccessChecked(true)

        // Retry navigation with the newly added routes
        next(to.fullPath)
      } catch (err) {
        console.error('Failed to setup access:', err)
        next('/login')
      }
    } else {
      next()
    }
  })
}
