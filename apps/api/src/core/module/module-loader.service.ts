import { Injectable } from '@nestjs/common';
import {
  ModuleDefinition,
  MetadataRegistryService,
} from '@core/runtime/metadata-registry.service';
import { EntityRegistryService } from '@core/entity/entity-registry.service';
import { EventBusService, BuiltInEvents } from '@core/runtime/event-bus.service';

@Injectable()
export class ModuleLoaderService {
  private loadedModules = new Set<string>();

  constructor(
    private metadataRegistry: MetadataRegistryService,
    private entityRegistry: EntityRegistryService,
    private eventBus: EventBusService,
  ) {}

  async loadModule(definition: ModuleDefinition): Promise<void> {
    if (this.loadedModules.has(definition.name)) {
      return; // Already loaded
    }

    // Load dependencies first (topological sort)
    if (definition.depends && definition.depends.length > 0) {
      for (const depName of definition.depends) {
        const depModule = this.metadataRegistry.getModule(depName);
        if (depModule && !this.loadedModules.has(depName)) {
          await this.loadModule(depModule);
        }
      }
    }

    // Call onLoad hook if provided
    if (definition.hooks?.onLoad) {
      await definition.hooks.onLoad();
    }

    // Register entities
    if (definition.entities && definition.entities.length > 0) {
      for (const entity of definition.entities) {
        this.entityRegistry.register(entity);
      }
    }

    // Register workflows (stub for now, will be filled in Phase 4)
    if (definition.workflows && definition.workflows.length > 0) {
      for (const workflow of definition.workflows) {
        this.metadataRegistry.registerWorkflow(workflow);
      }
    }

    // Register views (stub for now, will be filled in Phase 5)
    if (definition.views && definition.views.length > 0) {
      for (const view of definition.views) {
        this.metadataRegistry.registerView(view);
      }
    }

    // Register module itself
    this.metadataRegistry.registerModule(definition);
    this.loadedModules.add(definition.name);

    // Emit module loaded event
    this.eventBus.emit({
      type: BuiltInEvents.MODULE_LOADED,
      timestamp: new Date(),
      source: 'module-loader',
      data: { moduleName: definition.name },
    });
  }

  async loadAll(modules: ModuleDefinition[]): Promise<void> {
    // Topologically sort modules by dependencies
    const sorted = this.topologicalSort(modules);

    for (const module of sorted) {
      await this.loadModule(module);
    }
  }

  async installModule(
    definition: ModuleDefinition,
    db?: any,
  ): Promise<void> {
    // Run onInstall hook if provided
    if (definition.hooks?.onInstall && db) {
      await definition.hooks.onInstall(db);
    }

    // Then load the module
    await this.loadModule(definition);
  }

  async uninstallModule(
    moduleName: string,
    db?: any,
  ): Promise<void> {
    const module = this.metadataRegistry.getModule(moduleName);
    if (!module) {
      throw new Error(`Module '${moduleName}' not found`);
    }

    // Check for dependent modules
    const allModules = this.metadataRegistry.listModules();
    const dependents = allModules.filter(
      m => m.depends && m.depends.includes(moduleName),
    );

    if (dependents.length > 0) {
      throw new Error(
        `Cannot uninstall '${moduleName}': it is a dependency of ${dependents.map(m => m.name).join(', ')}`,
      );
    }

    // Run onUninstall hook if provided
    if (module.hooks?.onUninstall && db) {
      await module.hooks.onUninstall(db);
    }

    // Unregister module
    this.metadataRegistry.unregisterModule(moduleName);
    this.loadedModules.delete(moduleName);

    // Emit module unloaded event
    this.eventBus.emit({
      type: BuiltInEvents.MODULE_UNLOADED,
      timestamp: new Date(),
      source: 'module-loader',
      data: { moduleName },
    });
  }

  isLoaded(moduleName: string): boolean {
    return this.loadedModules.has(moduleName);
  }

  getLoadedModules(): string[] {
    return Array.from(this.loadedModules);
  }

  private topologicalSort(modules: ModuleDefinition[]): ModuleDefinition[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const sorted: ModuleDefinition[] = [];
    const moduleMap = new Map(modules.map(m => [m.name, m]));

    const visit = (moduleName: string) => {
      if (visited.has(moduleName)) return;
      if (recursionStack.has(moduleName)) {
        throw new Error(
          `Circular dependency detected involving module '${moduleName}'`,
        );
      }

      recursionStack.add(moduleName);
      const module = moduleMap.get(moduleName);

      if (module && module.depends) {
        for (const dep of module.depends) {
          visit(dep);
        }
      }

      recursionStack.delete(moduleName);
      visited.add(moduleName);

      if (module) {
        sorted.push(module);
      }
    };

    for (const module of modules) {
      visit(module.name);
    }

    return sorted;
  }
}
