/**
 * Module System Types
 *
 * TypeScript interfaces for the FastVue module system.
 */

import type { RouteRecordRaw } from 'vue-router';
import type { Component } from 'vue';

/**
 * Frontend configuration for a module
 */
export interface ModuleFrontendConfig {
  /** Technical module name */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Path to routes configuration file */
  routes?: string;
  /** Paths to Pinia store files */
  stores?: string[];
  /** Paths to Vue component files */
  components?: string[];
  /** Paths to Vue view files */
  views?: string[];
  /** Paths to locale/i18n files */
  locales?: string[];
  /** Menu items defined by this module */
  menus?: ModuleMenuItem[];
}

/**
 * Menu item defined by a module
 */
export interface ModuleMenuItem {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Route path */
  path?: string;
  /** Icon name */
  icon?: string;
  /** Parent menu id for nesting */
  parentId?: string;
  /** Sort order */
  sequence?: number;
  /** Source module */
  module?: string;
  /** Child menu items */
  children?: ModuleMenuItem[];
}

/**
 * Module info from backend
 */
export interface ModuleInfo {
  id: number;
  name: string;
  displayName: string;
  version: string;
  summary?: string;
  description?: string;
  author?: string;
  website?: string;
  category?: string;
  license?: string;
  application: boolean;
  state: ModuleState;
  installedAt?: string;
  updatedAt?: string;
  depends?: string[];
  autoInstall: boolean;
}

/**
 * Module state
 */
export type ModuleState =
  | 'installed'
  | 'uninstalled'
  | 'to_install'
  | 'to_upgrade'
  | 'to_remove';

/**
 * Module installation result
 */
export interface ModuleInstallResult {
  success: boolean;
  module?: ModuleInfo;
  message?: string;
  installedDependencies?: string[];
}

/**
 * Loaded module with runtime data
 */
export interface LoadedModule {
  config: ModuleFrontendConfig;
  routes: RouteRecordRaw[];
  components: Map<string, Component>;
  stores: string[];
  loaded: boolean;
  loadedAt: Date;
}

/**
 * Module loader events
 */
export type ModuleLoaderEvent =
  | 'module:discovered'
  | 'module:loading'
  | 'module:loaded'
  | 'module:error'
  | 'routes:registered'
  | 'stores:registered';

/**
 * Module loader event handler
 */
export type ModuleLoaderEventHandler = (
  event: ModuleLoaderEvent,
  data: unknown,
) => void;
