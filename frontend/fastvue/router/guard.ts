import type { Router } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';
import { startProgress, stopProgress } from '@vben/utils';

import { accessRoutes, coreRouteNames } from '#/router/routes';
import { useAuthStore, usePermissionStore } from '#/store';
import { useTrustStore } from '#/store/trust';
import type { PermissionCode } from '#/store/permission';

import { generateAccess } from './access';

/**
 * Trust level mapping for route guards
 */
const TRUST_LEVEL_ORDER = ['none', 'low', 'medium', 'high', 'critical'] as const;
type TrustLevel = (typeof TRUST_LEVEL_ORDER)[number];

/**
 * Common guard configuration
 */
function setupCommonGuard(router: Router) {
  const loadedPaths = new Set<string>();

  router.beforeEach((to) => {
    to.meta.loaded = loadedPaths.has(to.path);

    // Page loading progress bar
    if (!to.meta.loaded && preferences.transition.progress) {
      startProgress();
    }
    return true;
  });

  router.afterEach((to) => {
    loadedPaths.add(to.path);

    // Close page loading progress bar
    if (preferences.transition.progress) {
      stopProgress();
    }
  });
}

/**
 * Access guard configuration
 */
function setupAccessGuard(router: Router) {
  router.beforeEach(async (to, from) => {
    const accessStore = useAccessStore();
    const userStore = useUserStore();
    const authStore = useAuthStore();

    // Core routes don't need access check (except fallback routes which need route generation)
    const isFallbackRoute = to.name === 'FallbackNotFound' || to.name === 'FallbackForbidden';
    if (coreRouteNames.includes(to.name as string) && !isFallbackRoute) {
      if (to.path === LOGIN_PATH && accessStore.accessToken) {
        const targetPath = decodeURIComponent(
          (to.query?.redirect as string) ||
            userStore.userInfo?.homePath ||
            preferences.app.defaultHomePath,
        );
        // Verify the path resolves to a valid route before redirecting
        const resolved = router.resolve(targetPath);
        if (resolved.name === 'FallbackNotFound' || resolved.matched.length === 0) {
          // Path doesn't exist - let routes generate first by continuing navigation
          return preferences.app.defaultHomePath;
        }
        return targetPath;
      }
      return true;
    }

    // Access token check
    if (!accessStore.accessToken) {
      // Routes with ignoreAccess can be accessed
      if (to.meta.ignoreAccess) {
        return true;
      }

      // No access permission, redirect to login
      if (to.fullPath !== LOGIN_PATH) {
        return {
          path: LOGIN_PATH,
          query:
            to.fullPath === preferences.app.defaultHomePath
              ? {}
              : { redirect: encodeURIComponent(to.fullPath) },
          replace: true,
        };
      }
      return to;
    }

    // Check if routes have been generated
    if (accessStore.isAccessChecked) {
      return true;
    }

    // Generate route table
    const userInfo = userStore.userInfo || (await authStore.fetchUserInfo());
    const userRoles = userInfo.roles ?? [];

    // Generate menus and routes
    const { accessibleMenus, accessibleRoutes } = await generateAccess({
      roles: userRoles,
      router,
      routes: accessRoutes,
    });

    // Save menu and route info
    accessStore.setAccessMenus(accessibleMenus);
    accessStore.setAccessRoutes(accessibleRoutes);
    accessStore.setIsAccessChecked(true);

    // Determine redirect path, falling back to first menu item if default doesn't exist
    let redirectPath = (from.query.redirect ??
      (to.path === preferences.app.defaultHomePath
        ? userInfo.homePath || preferences.app.defaultHomePath
        : to.fullPath)) as string;

    // Verify the redirect path resolves to a valid route
    const resolved = router.resolve(decodeURIComponent(redirectPath));
    if (resolved.name === 'FallbackNotFound' || resolved.matched.length === 0) {
      // Default path doesn't exist - use first accessible menu item
      const firstMenu = accessibleMenus[0];
      if (firstMenu) {
        redirectPath = (firstMenu as any).path || preferences.app.defaultHomePath;
      }
    }

    return {
      ...router.resolve(decodeURIComponent(redirectPath)),
      replace: true,
    };
  });
}

/**
 * Permission guard configuration
 * Checks route meta.permission to ensure user has required permission
 */
function setupPermissionGuard(router: Router) {
  router.beforeEach(async (to) => {
    const permissionStore = usePermissionStore();

    // Check if route has permission requirement
    const requiredPermission = to.meta.permission as
      | PermissionCode
      | PermissionCode[]
      | undefined;

    if (requiredPermission) {
      const hasAccess = permissionStore.canAccessRoute(requiredPermission);

      if (!hasAccess) {
        // Redirect to forbidden page or dashboard
        return {
          name: 'FallbackForbidden',
          replace: true,
        };
      }
    }

    return true;
  });
}

/**
 * Check if current trust level meets the required level
 */
function meetsRequiredTrustLevel(
  current: TrustLevel,
  required: TrustLevel,
): boolean {
  const currentIndex = TRUST_LEVEL_ORDER.indexOf(current);
  const requiredIndex = TRUST_LEVEL_ORDER.indexOf(required);
  return currentIndex >= requiredIndex;
}

/**
 * Trust level guard configuration (Zero Trust)
 * Checks route meta.trustLevel to ensure user meets required trust level
 */
function setupTrustLevelGuard(router: Router) {
  router.beforeEach(async (to) => {
    const accessStore = useAccessStore();

    // Skip trust check if not authenticated
    if (!accessStore.accessToken) {
      return true;
    }

    // Check if route has trust level requirement
    const requiredTrustLevel = to.meta.trustLevel as TrustLevel | undefined;

    if (requiredTrustLevel) {
      try {
        const trustStore = useTrustStore();

        // Initialize trust store if needed
        if (!trustStore.isInitialized) {
          await trustStore.initialize();
        }

        const currentLevel = trustStore.currentTrustLevel as TrustLevel;

        if (!meetsRequiredTrustLevel(currentLevel, requiredTrustLevel)) {
          // Set step-up required with the route's reason
          const reason =
            (to.meta.trustLevelReason as string) ||
            `This page requires ${requiredTrustLevel} trust level`;

          trustStore.setStepUpRequired(true, reason, 'mfa');

          // Don't block navigation, let the page handle showing step-up modal
          // Or redirect to a step-up page if preferred
          return true;
        }
      } catch (error) {
        console.error('Failed to check trust level:', error);
        // Allow navigation on error, let backend enforce
        return true;
      }
    }

    return true;
  });
}

/**
 * Create router guards
 */
function createRouterGuard(router: Router) {
  setupCommonGuard(router);
  setupAccessGuard(router);
  setupPermissionGuard(router);
  setupTrustLevelGuard(router);
}

export { createRouterGuard };
