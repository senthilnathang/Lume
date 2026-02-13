/**
 * Module Loader
 *
 * Handles discovering, loading, and registering frontend modules.
 * Fetches module configuration from the backend and dynamically imports assets.
 *
 * Configuration is now externalized to config.ts for modularity.
 */

import type { RouteRecordRaw } from 'vue-router';
import type { Component } from 'vue';
import type {
  ModuleFrontendConfig,
  ModuleMenuItem,
  ModuleLoaderEvent,
  ModuleLoaderEventHandler,
} from './types';
import { moduleRegistry } from './registry';
import { requestClient } from '#/api/request';
import { getModuleConfig, isModuleSystemEnabled } from './config';

class ModuleLoader {
  /** Get base URL for module static files from config */
  private get staticBaseUrl(): string {
    return getModuleConfig().staticBaseUrl;
  }

  /** Get API endpoint for module configs from config */
  private get configEndpoint(): string {
    return getModuleConfig().configEndpoint;
  }

  /** Whether modules have been discovered */
  private discovered: boolean = false;

  /** Discovered module configurations */
  private configs: ModuleFrontendConfig[] = [];

  /** Event handlers */
  private eventHandlers: ModuleLoaderEventHandler[] = [];

  /**
   * Discover all installed modules from the backend
   */
  async discoverModules(): Promise<ModuleFrontendConfig[]> {
    // Check if module system is enabled
    if (!isModuleSystemEnabled()) {
      if (getModuleConfig().debug) {
        console.log('Module system is disabled');
      }
      return [];
    }

    // Return cached configs if available and caching is enabled
    if (this.discovered && this.configs.length > 0 && getModuleConfig().cacheDiscovery) {
      return this.configs;
    }

    try {
      this.emit('module:discovered', { status: 'loading' });

      const response = await requestClient.get<ModuleFrontendConfig[]>(
        this.configEndpoint,
      );
      this.configs = response || [];
      this.discovered = true;

      this.emit('module:discovered', {
        status: 'complete',
        count: this.configs.length,
      });

      if (getModuleConfig().debug) {
        console.log(`Discovered ${this.configs.length} modules`);
      }

      return this.configs;
    } catch (error) {
      console.error('Failed to discover modules:', error);
      this.emit('module:error', { phase: 'discovery', error });
      return [];
    }
  }

  /**
   * Load all discovered modules
   */
  async loadAllModules(): Promise<void> {
    const configs = await this.discoverModules();

    for (const config of configs) {
      try {
        await this.loadModule(config);
      } catch (error) {
        console.error(`Failed to load module ${config.name}:`, error);
        this.emit('module:error', { module: config.name, error });
      }
    }
  }

  /**
   * Load a single module
   */
  async loadModule(config: ModuleFrontendConfig): Promise<void> {
    if (moduleRegistry.isLoaded(config.name)) {
      return;
    }

    this.emit('module:loading', { name: config.name });

    const routes = await this.loadModuleRoutes(config);
    const stores = await this.loadModuleStores(config);

    moduleRegistry.register(config, {
      routes,
      stores,
    });

    this.emit('module:loaded', { name: config.name });
  }

  /**
   * Load routes from a module
   */
  async loadModuleRoutes(
    config: ModuleFrontendConfig,
  ): Promise<RouteRecordRaw[]> {
    if (!config.routes) {
      return [];
    }

    try {
      // For TypeScript files served from static, we need to handle them differently
      // In production, these would be pre-compiled; in dev, we might use a different approach
      const routeUrl = this.buildAssetUrl(config.name, config.routes);

      // Dynamic import for module routes
      // Note: In a real implementation, you'd need a build step to compile these
      // or use a different approach like JSON route definitions
      const routeModule = await this.importModule(routeUrl);
      const routes = routeModule.default || routeModule.routes || [];

      // Prefix routes with module path
      const prefixedRoutes = (routes as RouteRecordRaw[]).map((route: RouteRecordRaw) => ({
        ...route,
        path: route.path.startsWith('/') ? route.path : `/${route.path}`,
        meta: {
          ...route.meta,
          module: config.name,
        },
      }));

      moduleRegistry.registerRoutes(config.name, prefixedRoutes as any);
      return prefixedRoutes as any;
    } catch (error) {
      console.warn(`Failed to load routes for ${config.name}:`, error);
      return [];
    }
  }

  /**
   * Load stores from a module
   */
  async loadModuleStores(config: ModuleFrontendConfig): Promise<string[]> {
    if (!config.stores || config.stores.length === 0) {
      return [];
    }

    const loadedStores: string[] = [];

    for (const storePath of config.stores) {
      try {
        const storeUrl = this.buildAssetUrl(config.name, storePath);
        await this.importModule(storeUrl);

        // Pinia stores are typically exported as useXxxStore functions
        // They auto-register when first used
        loadedStores.push(storePath);
      } catch (error) {
        console.warn(`Failed to load store ${storePath}:`, error);
      }
    }

    return loadedStores;
  }

  /**
   * Load components from a module
   */
  async loadModuleComponents(
    config: ModuleFrontendConfig,
  ): Promise<Map<string, Component>> {
    const components = new Map<string, Component>();

    if (!config.components || config.components.length === 0) {
      return components;
    }

    for (const componentPath of config.components) {
      try {
        const componentUrl = this.buildAssetUrl(config.name, componentPath);
        const component = await this.importModule(componentUrl);

        // Extract component name from path
        const name = this.extractComponentName(componentPath);
        components.set(name, component.default || component);

        moduleRegistry.registerComponent(
          `${config.name}:${name}`,
          component.default || component,
        );
      } catch (error) {
        console.warn(`Failed to load component ${componentPath}:`, error);
      }
    }

    return components;
  }

  /**
   * Get all menus from installed modules
   */
  async getModuleMenus(): Promise<ModuleMenuItem[]> {
    const configs = await this.discoverModules();
    const menus: ModuleMenuItem[] = [];

    for (const config of configs) {
      if (config.menus && config.menus.length > 0) {
        menus.push(
          ...config.menus.map((menu) => ({
            ...menu,
            module: config.name,
          })),
        );
      }
    }

    // Sort by sequence
    menus.sort((a, b) => (a.sequence || 10) - (b.sequence || 10));

    return menus;
  }

  /**
   * Get all routes from loaded modules
   */
  getLoadedRoutes(): RouteRecordRaw[] {
    return moduleRegistry.getAllRoutes();
  }

  /**
   * Build full URL for a module asset
   */
  private buildAssetUrl(moduleName: string, assetPath: string): string {
    // Remove leading slash if present
    const cleanPath = assetPath.startsWith('/')
      ? assetPath.slice(1)
      : assetPath;

    return `${this.staticBaseUrl}/${moduleName}/static/${cleanPath}`;
  }

  /**
   * Import a module dynamically
   */
  private async importModule(url: string): Promise<Record<string, unknown>> {
    // Using dynamic import
    // Note: This requires the asset to be a valid ES module
    // In production, assets should be pre-compiled
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - dynamic import with variable URL
      return await import(/* @vite-ignore */ url);
    } catch {
      // Fallback: fetch and eval (not recommended for production)
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
      }

      const code = await response.text();

      // For JSON files
      if (url.endsWith('.json')) {
        return JSON.parse(code);
      }

      // For JS modules, we'd need to handle this differently
      // This is a simplified approach
      throw new Error(`Cannot dynamically import ${url}`);
    }
  }

  /**
   * Extract component name from file path
   */
  private extractComponentName(path: string): string {
    const parts = path.split('/');
    const fileName = parts[parts.length - 1] || '';
    return fileName.replace(/\.(vue|ts|js)$/, '');
  }

  /**
   * Subscribe to loader events
   */
  on(handler: ModuleLoaderEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index > -1) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Emit an event
   */
  private emit(event: ModuleLoaderEvent, data: unknown): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event, data);
      } catch (error) {
        console.error(`Error in module loader event handler:`, error);
      }
    }
  }

  /**
   * Reset the loader state (mainly for testing)
   */
  reset(): void {
    this.discovered = false;
    this.configs = [];
    moduleRegistry.clear();
  }
}

// Singleton instance
export const moduleLoader = new ModuleLoader();

// Also export the class for testing
export { ModuleLoader };
