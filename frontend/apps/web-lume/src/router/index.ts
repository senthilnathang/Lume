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
 * Custom view registry
 * Maps route paths to dedicated Vue components instead of the generic ModuleView
 */
const customViews: Record<string, () => Promise<any>> = {
  'settings/modules': () => import('@/views/settings/modules.vue'),
  'settings/users': () => import('@/views/settings/users.vue'),
  'settings/roles': () => import('@/views/settings/roles.vue'),
  'settings/permissions': () => import('@/views/settings/permissions.vue'),
  'settings/groups': () => import('@/views/settings/groups.vue'),
  'settings/audit-logs': () => import('@/views/settings/audit-logs.vue'),
  'activities': () => import('@/views/activities/index.vue'),
  'team': () => import('@/views/team/index.vue'),
  'donations': () => import('@/views/donations/index.vue'),
  'donations/donors': () => import('@/views/donations/donors.vue'),
  'messages': () => import('@/views/messages/index.vue'),
  'audit': () => import('@/views/settings/audit-logs.vue'),
  // Documents
  'documents': () => import('@/views/documents/index.vue'),
  'documents/images': () => import('@/views/documents/index.vue'),
  'documents/videos': () => import('@/views/documents/index.vue'),
  // Media
  'media': () => import('@/views/media/index.vue'),
  'media/upload': () => import('@/views/media/index.vue'),
  'media/featured': () => import('@/views/media/index.vue'),
  // Settings (form)
  'settings/general': () => import('@/views/settings/app-settings.vue'),
  'settings/contact': () => import('@/views/settings/app-settings.vue'),
  'settings/localization': () => import('@/views/settings/app-settings.vue'),
  'settings/social': () => import('@/views/settings/app-settings.vue'),
  // Security
  'settings/security/access': () => import('@/views/settings/security/index.vue'),
  'settings/security/2fa': () => import('@/views/settings/security/index.vue'),
  'settings/security/sessions': () => import('@/views/settings/security/index.vue'),
  'settings/security/api-keys': () => import('@/views/settings/security/index.vue'),
  // Features & Data
  'settings/features/flags': () => import('@/views/settings/features/index.vue'),
  'settings/features/import': () => import('@/views/settings/features/index.vue'),
  'settings/features/export': () => import('@/views/settings/features/index.vue'),
  'settings/features/backups': () => import('@/views/settings/features/index.vue'),
  // Campaigns
  'donations/campaigns': () => import('@/views/donations/campaigns.vue'),
  // Donation Reports
  'donations/reports': () => import('@/views/donations/reports.vue'),
  // Automation
  'settings/automation/workflows': () => import('@/views/settings/automation/index.vue'),
  'settings/automation/flows': () => import('@/views/settings/automation/index.vue'),
  'settings/automation/business-rules': () => import('@/views/settings/automation/index.vue'),
  'settings/automation/approvals': () => import('@/views/settings/automation/index.vue'),
  'settings/automation/scheduled': () => import('@/views/settings/automation/index.vue'),
  // RBAC
  'settings/rbac/access-rules': () => import('@/views/settings/rbac/index.vue'),
  'settings/rbac/audit': () => import('@/views/settings/rbac/index.vue'),
  // Settings children
  'settings/menus': () => import('@/views/settings/menus.vue'),
  'settings/record-rules': () => import('@/views/settings/record-rules.vue'),
  'settings/sequences': () => import('@/views/settings/sequences.vue'),
  'settings/system': () => import('@/views/settings/system.vue'),
  // Audit cleanup
  'audit/cleanup': () => import('@/views/audit/cleanup.vue'),
  // Team sub-views
  'team/leadership': () => import('@/views/team/leadership.vue'),
  'team/departments': () => import('@/views/team/departments.vue'),
  // Activities sub-views
  'activities/upcoming': () => import('@/views/activities/upcoming.vue'),
  'activities/calendar': () => import('@/views/activities/calendar.vue'),
  // Messages sub-views
  'messages/sent': () => import('@/views/messages/sent.vue'),
};

/**
 * Dynamic module view loader
 * Checks custom views first, then backend static views, falls back to ModuleView
 * @param moduleName - The module owning this route
 * @param routeName - The display name of the route
 * @param fullPath - Optional full route path for exact custom view matching
 */
async function loadModuleView(moduleName: string, routeName: string, fullPath?: string) {
  // Check for a custom local view by exact path first (most reliable)
  if (fullPath) {
    const normalizedPath = fullPath.replace(/^\//, '').toLowerCase();
    for (const [key, loader] of Object.entries(customViews)) {
      if (normalizedPath === key.toLowerCase()) {
        const mod = await loader();
        return mod.default;
      }
    }
  }

  // Check by module/routeName combination
  const routePath = `${moduleName}/${routeName}`.replace(/^\//, '').toLowerCase();
  for (const [key, loader] of Object.entries(customViews)) {
    const lowerKey = key.toLowerCase();
    if (routePath === lowerKey || routePath.endsWith(lowerKey)) {
      const mod = await loader();
      return mod.default;
    }
  }

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
        if (vueContent.includes('<script setup') || vueContent.includes('<script>')) {
          console.log(`Found custom view at ${path} for ${moduleName}`);
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

      const moduleName = menu.module || routeName;

      // Register parent route
      if (!router.hasRoute(routeName as string)) {
        router.addRoute('App', {
          path: menu.path.startsWith('/') ? menu.path.slice(1) : menu.path,
          name: routeName,
          component: () => loadModuleView(moduleName as string, routeName as string, menu.path),
          props: {
            moduleName: moduleName,
          },
          meta: {
            title: menu.name || menu.title,
            icon: menu.icon,
            permission: menu.permission,
            requiresAuth: true,
            module: moduleName,
          },
        });
      }

      // Register child routes
      if (menu.children?.length) {
        for (const child of menu.children) {
          if (!child.path || child.hideInMenu) continue;
          // Use path-based name to avoid collisions (e.g., both RBAC and Settings have "Roles")
          const childBaseName = child.name || child.path.split('/').pop();
          const childRouteName = child.path.replace(/^\//, '').replace(/\//g, '-') || childBaseName;
          const childModule = child.module || moduleName;
          if (!router.hasRoute(childRouteName as string)) {
            router.addRoute('App', {
              path: child.path.startsWith('/') ? child.path.slice(1) : child.path,
              name: childRouteName,
              component: () => loadModuleView(childModule as string, childBaseName as string, child.path),
              props: {
                moduleName: childModule,
              },
              meta: {
                title: child.name || child.title,
                icon: child.icon,
                permission: child.permission,
                requiresAuth: true,
                module: childModule,
              },
            });
          }
        }
      }
    }

    // Redirect to dashboard if at root
    if (to.path === LOGIN_PATH || to.path === '/') {
      return { path: DEFAULT_HOME_PATH, replace: true };
    }

    // If route matched catch-all (NotFound) but we just added dynamic routes,
    // re-navigate to let the new routes be evaluated
    if (to.name === 'NotFound' || to.name === 'NotFoundPage') {
      const resolved = router.resolve(to.fullPath);
      if (resolved.name !== 'NotFound' && resolved.name !== 'NotFoundPage') {
        return { path: to.fullPath, replace: true };
      }
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
      const moduleName = menu.module || routeName;

      const route: RouteRecordRaw = {
        path: menu.path.startsWith('/') ? menu.path.slice(1) : menu.path,
        name: routeName,
        component: () => import('@/components/ModuleView.vue'),
        props: {
          moduleName,
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

      // Register child routes
      if (menu.children?.length) {
        for (const child of menu.children) {
          if (!child.path || child.hideInMenu) continue;
          const childRouteName = child.path.replace(/^\//, '').replace(/\//g, '-') || child.name || 'ChildRoute';
          const childModule = child.module || moduleName;

          const childRoute: RouteRecordRaw = {
            path: child.path.startsWith('/') ? child.path.slice(1) : child.path,
            name: childRouteName,
            component: () => import('@/components/ModuleView.vue'),
            props: {
              moduleName: childModule,
            },
            meta: {
              title: child.name || child.title,
              icon: child.icon,
              permission: child.permission,
              module: childModule,
            },
          };

          if (!router.hasRoute(childRouteName)) {
            router.addRoute('App', childRoute);
            addedRoutes.push(childRoute);
          }
        }
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
