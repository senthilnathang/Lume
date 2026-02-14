/**
 * Vue Router Configuration
 * Main router setup with lazy loading and route guards
 * Follows FastVue patterns with dynamic menu loading
 */

import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { usePermissionStore, type MenuItem } from '@/store/permission';

const LOGIN_PATH = '/login';
const DEFAULT_HOME_PATH = '/dashboard';

/**
 * Custom view registry
 * Maps route paths to dedicated Vue components instead of the generic ModuleView
 */
const customViews: Record<string, () => Promise<any>> = {
  // Base module
  'settings/modules': () => import('@modules/base/static/views/modules-view.vue'),
  'settings/menus': () => import('@modules/base/static/views/menus-view.vue'),
  'settings/record-rules': () => import('@modules/base/static/views/record-rules.vue'),
  'settings/sequences': () => import('@modules/base/static/views/sequences.vue'),
  'settings/system': () => import('@modules/base/static/views/system.vue'),
  // User module
  'settings/users': () => import('@modules/user/static/views/users.vue'),
  // RBAC module
  'settings/roles': () => import('@modules/rbac/static/views/roles-view.vue'),
  'settings/permissions': () => import('@modules/rbac/static/views/permissions-view.vue'),
  'settings/groups': () => import('@modules/rbac/static/views/groups.vue'),
  'settings/rbac/access-rules': () => import('@modules/rbac/static/views/rbac-index.vue'),
  'settings/rbac/audit': () => import('@modules/rbac/static/views/rbac-index.vue'),
  // Audit module
  'settings/audit-logs': () => import('@modules/audit/static/views/audit-logs.vue'),
  'audit': () => import('@modules/audit/static/views/audit-logs.vue'),
  'audit/cleanup': () => import('@modules/audit/static/views/cleanup.vue'),
  // Activities module
  'activities': () => import('@modules/activities/static/views/index.vue'),
  'activities/upcoming': () => import('@modules/activities/static/views/upcoming.vue'),
  'activities/calendar': () => import('@modules/activities/static/views/calendar.vue'),
  // Team module
  'team': () => import('@modules/team/static/views/index.vue'),
  'team/leadership': () => import('@modules/team/static/views/leadership.vue'),
  'team/departments': () => import('@modules/team/static/views/departments.vue'),
  // Donations module
  'donations': () => import('@modules/donations/static/views/index.vue'),
  'donations/donors': () => import('@modules/donations/static/views/donors.vue'),
  'donations/campaigns': () => import('@modules/donations/static/views/campaigns.vue'),
  'donations/reports': () => import('@modules/donations/static/views/reports.vue'),
  // Messages module
  'messages': () => import('@modules/messages/static/views/index.vue'),
  'messages/sent': () => import('@modules/messages/static/views/sent.vue'),
  // Documents module
  'documents': () => import('@modules/documents/static/views/index.vue'),
  'documents/images': () => import('@modules/documents/static/views/index.vue'),
  'documents/videos': () => import('@modules/documents/static/views/index.vue'),
  // Media module
  'media': () => import('@modules/media/static/views/index.vue'),
  'media/upload': () => import('@modules/media/static/views/index.vue'),
  'media/featured': () => import('@modules/media/static/views/index.vue'),
  // Settings module
  'settings/general': () => import('@modules/settings/static/views/app-settings.vue'),
  'settings/contact': () => import('@modules/settings/static/views/app-settings.vue'),
  'settings/localization': () => import('@modules/settings/static/views/app-settings.vue'),
  'settings/social': () => import('@modules/settings/static/views/app-settings.vue'),
  // Security module
  'settings/security/access': () => import('@modules/base_security/static/views/security.vue'),
  'settings/security/2fa': () => import('@modules/base_security/static/views/security.vue'),
  'settings/security/sessions': () => import('@modules/base_security/static/views/security.vue'),
  'settings/security/api-keys': () => import('@modules/base_security/static/views/security.vue'),
  // Data Management module
  'base-features-data/data-import': () => import('@modules/base_features_data/static/views/data-import.vue'),
  'base-features-data/data-export': () => import('@modules/base_features_data/static/views/data-export.vue'),
  // Automation module
  'settings/automation/workflows': () => import('@modules/base_automation/static/views/automation.vue'),
  'settings/automation/flows': () => import('@modules/base_automation/static/views/automation.vue'),
  'settings/automation/business-rules': () => import('@modules/base_automation/static/views/automation.vue'),
  'settings/automation/approvals': () => import('@modules/base_automation/static/views/automation.vue'),
  'settings/automation/scheduled': () => import('@modules/base_automation/static/views/automation.vue'),
  // Customization module
  'settings/customization/fields': () => import('@modules/base_customization/static/views/custom-fields.vue'),
  'settings/customization/views': () => import('@modules/base_customization/static/views/custom-views.vue'),
  'settings/customization/forms': () => import('@modules/base_customization/static/views/form-builder.vue'),
  'settings/customization/lists': () => import('@modules/base_customization/static/views/list-configs.vue'),
  'settings/customization/widgets': () => import('@modules/base_customization/static/views/dashboard-widgets.vue'),
  // Advanced Features module
  'settings/advanced/webhooks': () => import('@modules/advanced_features/static/views/webhooks.vue'),
  'settings/advanced/notifications': () => import('@modules/advanced_features/static/views/notifications.vue'),
  'settings/advanced/notification-channels': () => import('@modules/advanced_features/static/views/notification-channels.vue'),
  'settings/advanced/tags': () => import('@modules/advanced_features/static/views/tags.vue'),
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
  router.beforeEach(async (to, _from) => {
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
