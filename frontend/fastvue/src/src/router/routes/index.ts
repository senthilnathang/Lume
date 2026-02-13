import type { RouteRecordRaw } from 'vue-router';

import { mergeRouteModules, traverseTreeValues } from '@vben/utils';

import { coreRoutes, fallbackForbiddenRoute, fallbackNotFoundRoute } from './core';

/**
 * Load CORE route files.
 *
 * Core modules: settings, profile, configurations
 *   - These don't have backend manifests, so menus come from static route files
 *   - Inbox/notifications routes are now loaded dynamically from the inbox module
 *
 * Business modules (lms, quiz, hrms, etc.):
 *   - Routes and menus are loaded dynamically from backend via generateModuleRoutes()
 *   - Views are loaded at runtime via ModuleView.vue component
 *   - DO NOT add business module routes here - they're handled dynamically!
 *
 * configurations.ts contains the Frappe-inspired enterprise features:
 *   - Entity Builder, Custom Fields, Form Builder
 *   - Workflows, Business Rules, Approval Chains
 *   - Security Profiles, Permission Sets, Sharing Rules
 *   - Data Import/Export, Activity Timeline
 *   - Migration Management, etc.
 */
const coreRouteFiles = import.meta.glob(
  './modules/{settings,profile,configurations}.ts',
  { eager: true },
);

/** Core module routes (settings, profile, configurations) */
const coreModuleRoutes: RouteRecordRaw[] = mergeRouteModules(coreRouteFiles);

/** Static routes (no permission check) */
const staticRoutes: RouteRecordRaw[] = [];
const externalRoutes: RouteRecordRaw[] = [];

/** Route list: core routes + external routes + fallback routes */
const routes: RouteRecordRaw[] = [
  ...coreRoutes,
  ...externalRoutes,
  fallbackForbiddenRoute,
  fallbackNotFoundRoute,
];

/** Core route names (no permission check needed) */
const coreRouteNames = [
  ...traverseTreeValues(coreRoutes, (route) => route.name as string),
  fallbackForbiddenRoute.name as string,
  fallbackNotFoundRoute.name as string,
].filter(Boolean);

/**
 * Routes with permission check.
 * Core module routes (settings, profile, etc.) are loaded statically here.
 * Business module routes are loaded dynamically from backend via generateModuleRoutes().
 */
const accessRoutes = [...coreModuleRoutes, ...staticRoutes];

export { accessRoutes, coreRouteNames, routes };
