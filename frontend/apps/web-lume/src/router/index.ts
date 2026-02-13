/**
 * Vue Router Configuration
 * Main router setup with lazy loading and route guards
 * Follows FastVue patterns with dynamic menu loading
 */

import { createRouter, createWebHistory, RouteRecordRaw, defineAsyncComponent } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { usePermissionStore, type MenuItem } from '@/store/permission';

const LOGIN_PATH = '/login';
const DEFAULT_HOME_PATH = '/dashboard';

/**
 * Dynamic module view loader
 * Tries to load Vue component from backend static views first,
 * falls back to ModuleView if not found
 */
async function loadModuleView(moduleName: string, routeName: string) {
  const possiblePaths = [
    `/modules/${moduleName}/static/views/${routeName}.vue`,
    `/modules/${moduleName}/static/views/list.vue`,
    `/modules/${moduleName}/static/views/index.vue`,
  ];

  // Try to load from backend static views
  for (const path of possiblePaths) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        const vueContent = await response.text();
        
        // If we found a valid Vue file with our custom views, return a wrapper
        // that displays a message that this custom view is available
        if (vueContent.includes('<script setup') || vueContent.includes('<script>')) {
          console.log(`✅ Found custom view at ${path} for ${moduleName}`);
          // Use the ModuleView but with moduleName set properly
          const { default: ModuleView } = await import('@/components/ModuleView.vue');
          return ModuleView;
        }
      }
    } catch (e) {
      // Continue to next path
    }
  }
  
  // Fallback to ModuleView
  const { default: ModuleView } = await import('@/components/ModuleView.vue');
  return ModuleView;
}

const routes: RouteRecordRaw[] = [
  // Public routes
  {
    path: LOGIN_PATH,
    name: 'Login',
    component: () => import('@/views/_core/authentication/login.vue'),
    meta: { public: true, title: 'Login', ignoreAccess: true },
  },

  // Authenticated routes with BasicLayout
  {
    path: '/',
    name: 'App',
    component: () => import('@/layouts/BasicLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: 'Dashboard', requiresAuth: true },
      },
    ],
  },

  // 403 Forbidden - wrapped in layout when authenticated
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/layouts/BasicLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'ForbiddenPage',
        component: () => import('@/views/_core/fallback/forbidden.vue'),
        meta: { title: 'Access Denied', requiresAuth: true },
      },
    ],
  },

  // 404 - wrapped in layout when authenticated
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/layouts/BasicLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'NotFoundPage',
        component: () => import('@/views/_core/fallback/not-found.vue'),
        meta: { title: 'Page Not Found', requiresAuth: true },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

// Track which paths have been loaded
const loadedPaths = new Set<string>();

/**
 * Common guard - track loaded paths for transition effects
 */
function setupCommonGuard() {
  router.beforeEach((to) => {
    to.meta.loaded = loadedPaths.has(to.path);
    return true;
  });

  router.afterEach((to) => {
    loadedPaths.add(to.path);
  });
}

/**
 * Access guard - handles authentication and initial route generation
 */
function setupAccessGuard() {
  router.beforeEach(async (to, from) => {
    const authStore = useAuthStore();
    const permissionStore = usePermissionStore();

    // Initialize auth state
    authStore.initializeAuth();

    // Core routes don't need access check
    const isCoreRoute = ['Login', 'NotFound', 'Forbidden'].includes(to.name as string);
    if (isCoreRoute && !to.meta.requiresAuth) {
      // Redirect from login if already authenticated
      if (to.path === LOGIN_PATH && authStore.isAuthenticated) {
        return { path: DEFAULT_HOME_PATH, replace: true };
      }
      return true;
    }

    // Check authentication for protected routes
    if (!authStore.isAuthenticated) {
      return {
        path: LOGIN_PATH,
        query: { redirect: to.fullPath !== DEFAULT_HOME_PATH ? to.fullPath : undefined },
        replace: true,
      };
    }

    // Fetch menus if not loaded yet - this is needed for ALL routes
    if (!permissionStore.menusLoaded || permissionStore.menus.length === 0) {
      try {
        await Promise.all([
          permissionStore.fetchPermissions(),
          permissionStore.fetchMenus(),
        ]);
      } catch (error) {
        console.error('Failed to fetch menus:', error);
      }
    }

    // Add dynamic routes from menus if not already added
    const menus = permissionStore.menus;
    const staticRoutes = ['Dashboard', 'Login', 'Forbidden', 'NotFound', 'App'];
    
    for (const menu of menus) {
      if (!menu.path || menu.hideInMenu) continue;
      
      const routeName = menu.name || menu.path.split('/').pop();
      if (staticRoutes.includes(routeName as string)) continue;
      
      // Only add if route doesn't exist
      if (!router.hasRoute(routeName as string)) {
        // Try to load from backend static views first
        const moduleName = menu.module || routeName;
        const viewPath = `/modules/${moduleName}/static/views/list.vue`;
        
        // Check if static view exists, use DynamicViewLoader if it does
        router.addRoute('App', {
          path: menu.path.startsWith('/') ? menu.path.slice(1) : menu.path,
          name: routeName,
          component: () => loadModuleView(moduleName, routeName as string),
          meta: {
            title: menu.name || menu.title,
            icon: menu.icon,
            permission: menu.permission,
            requiresAuth: true,
          },
        });
      }
    }

    // Redirect to dashboard if at root
    if (to.path === LOGIN_PATH || to.path === '/') {
      return { path: DEFAULT_HOME_PATH, replace: true };
    }

    return true;
  });
}

/**
 * Permission guard - checks route permissions
 */
function setupPermissionGuard() {
  router.beforeEach((to) => {
    const permissionStore = usePermissionStore();

    const requiredPermission = to.meta.permission as string | undefined;
    if (requiredPermission && !permissionStore.hasPermission(requiredPermission)) {
      return { name: 'Forbidden', replace: true };
    }

    return true;
  });
}

// Initialize guards
setupCommonGuard();
setupAccessGuard();
setupPermissionGuard();

/**
 * Add dynamic routes from module menus
 */
export function addDynamicRoutes(menus: MenuItem[]): RouteRecordRaw[] {
  const addedRoutes: RouteRecordRaw[] = [];

  for (const menu of menus) {
    if (menu.path && !menu.hideInMenu) {
      const routeName = menu.name || menu.path.split('/').pop() || 'Route';
      
      const route: RouteRecordRaw = {
        path: menu.path.startsWith('/') ? menu.path.slice(1) : menu.path,
        name: routeName,
        component: () => import('@/components/ModuleView.vue'),
        props: {
          moduleName: menu.module || routeName,
        },
        meta: {
          title: menu.name || menu.title,
          icon: menu.icon,
          permission: menu.permission,
          order: menu.sequence,
          module: menu.module,
        },
      };

      if (!router.hasRoute(routeName)) {
        router.addRoute('App', route);
        addedRoutes.push(route);
      }
    }
  }

  return addedRoutes;
}

/**
 * Get all registered routes
 */
export function getAllRoutes() {
  return router
    .getRoutes()
    .filter((route) => route.path !== '/:pathMatch(.*)*')
    .map((route) => ({
      path: route.path,
      name: route.name,
      meta: route.meta,
    }));
}

export { routes };
export default router;
