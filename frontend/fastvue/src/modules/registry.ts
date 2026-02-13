/**
 * Module Registry
 *
 * Tracks loaded modules and their resources in the frontend.
 */

import type { Component } from 'vue';
import type { RouteRecordRaw } from 'vue-router';
import type {
  LoadedModule,
  ModuleFrontendConfig,
  ModuleLoaderEvent,
  ModuleLoaderEventHandler,
} from './types';

class ModuleRegistry {
  /** Loaded modules by name */
  private modules: Map<string, LoadedModule> = new Map();

  /** Registered routes from modules */
  private moduleRoutes: Map<string, RouteRecordRaw[]> = new Map();

  /** Registered components from modules */
  private moduleComponents: Map<string, Component> = new Map();

  /** Event handlers */
  private eventHandlers: ModuleLoaderEventHandler[] = [];

  /**
   * Register a loaded module
   */
  register(config: ModuleFrontendConfig, data: Partial<LoadedModule>): void {
    const module: LoadedModule = {
      config,
      routes: data.routes || [],
      components: data.components || new Map(),
      stores: data.stores || [],
      loaded: true,
      loadedAt: new Date(),
    };

    this.modules.set(config.name, module);
    this.emit('module:loaded', { name: config.name, module });
  }

  /**
   * Get a loaded module by name
   */
  get(name: string): LoadedModule | undefined {
    return this.modules.get(name);
  }

  /**
   * Check if a module is loaded
   */
  isLoaded(name: string): boolean {
    return this.modules.has(name);
  }

  /**
   * Get all loaded modules
   */
  getAll(): LoadedModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get all loaded module names
   */
  getLoadedNames(): string[] {
    return Array.from(this.modules.keys());
  }

  /**
   * Register routes from a module
   */
  registerRoutes(moduleName: string, routes: RouteRecordRaw[]): void {
    this.moduleRoutes.set(moduleName, routes);
    this.emit('routes:registered', { module: moduleName, count: routes.length });
  }

  /**
   * Get routes from a specific module
   */
  getRoutes(moduleName: string): RouteRecordRaw[] {
    return this.moduleRoutes.get(moduleName) || [];
  }

  /**
   * Get all module routes
   */
  getAllRoutes(): RouteRecordRaw[] {
    const allRoutes: RouteRecordRaw[] = [];
    for (const routes of this.moduleRoutes.values()) {
      allRoutes.push(...routes);
    }
    return allRoutes;
  }

  /**
   * Register a component from a module
   */
  registerComponent(name: string, component: Component): void {
    this.moduleComponents.set(name, component);
  }

  /**
   * Get a registered component
   */
  getComponent(name: string): Component | undefined {
    return this.moduleComponents.get(name);
  }

  /**
   * Get all registered components
   */
  getAllComponents(): Map<string, Component> {
    return new Map(this.moduleComponents);
  }

  /**
   * Subscribe to registry events
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
        console.error(`Error in module event handler for ${event}:`, error);
      }
    }
  }

  /**
   * Clear all registered modules (mainly for testing)
   */
  clear(): void {
    this.modules.clear();
    this.moduleRoutes.clear();
    this.moduleComponents.clear();
  }
}

// Singleton instance
export const moduleRegistry = new ModuleRegistry();
