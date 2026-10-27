import { Injectable, Optional } from '@nestjs/common';
import { ModuleConfigurationService } from './module-configuration.service';
import {
  ModuleDefinition,
  MetadataRegistryService,
} from '@core/runtime/metadata-registry.service';
import { EntityRegistryService } from '@core/entity/entity-registry.service';
import { EventBusService, BuiltInEvents } from '@core/runtime/event-bus.service';

@Injectable()
export class ModuleLoaderService {
  private loadedModules = new Set<string>();
  private loadingModules = new Map<string, Promise<void>>();
  private installingModules = new Map<string, Promise<void>>();
  private uninstallingModules = new Set<string>();
  private activeDefinitions = new Map<string, ModuleDefinition>();
  private reloadingModules = new Map<string, Promise<void>>();
  private appliedConfigRevisions = new Map<string, number>();

  constructor(
    private metadataRegistry: MetadataRegistryService,
    private entityRegistry: EntityRegistryService,
    private eventBus: EventBusService,
    @Optional() private configuration?: ModuleConfigurationService,
  ) {}

  async loadModule(definition: ModuleDefinition): Promise<void> {
    if (this.installingModules.has(definition.name)) throw new Error(`Module '${definition.name}' is still installing`);
    return this.loadRegisteredDefinition(definition);
  }

  private async loadRegisteredDefinition(definition: ModuleDefinition): Promise<void> {
    if (this.reloadingModules.has(definition.name)) throw new Error(`Module '${definition.name}' is still reloading`);
    if (this.uninstallingModules.has(definition.name)) throw new Error(`Module '${definition.name}' is still uninstalling`);
    if (this.loadedModules.has(definition.name)) {
      return; // Already loaded
    }
    const pending = this.loadingModules.get(definition.name);
    if (pending) return pending;
    // Validate the complete dependency graph before invoking any lifecycle hooks.
    this.topologicalSort([...this.metadataRegistry.listModules().filter(m => m.name !== definition.name), definition]);
    this.assertRegistrationAvailable(definition);
    this.activeDefinitions.set(definition.name, definition);
    const loading = Promise.resolve().then(() => this.loadDefinition(definition));
    this.loadingModules.set(definition.name, loading);
    try { await loading; } finally {
      this.loadingModules.delete(definition.name);
      if (!this.installingModules.has(definition.name)) this.activeDefinitions.delete(definition.name);
    }
  }

  private async loadDefinition(definition: ModuleDefinition): Promise<void> {

    // Load dependencies first (topological sort)
    if (definition.depends && definition.depends.length > 0) {
      for (const depName of definition.depends) {
        if (this.uninstallingModules.has(depName)) throw new Error(`Module '${depName}' is still uninstalling`);
        const depModule = this.metadataRegistry.getModule(depName);
        if (depModule && !this.loadedModules.has(depName)) {
          await this.loadModule(depModule);
        }
      }
    }

    const snapshot = definition.configuration ? await this.configStore().read(definition, true) : null;
    // Call onLoad hook if provided
    if (definition.hooks?.onLoad) {
      if (snapshot) await definition.hooks.onLoad(snapshot.config);
      else await definition.hooks.onLoad();
    }
    this.assertRegistrationAvailable(definition);

    // Register entities
    if (definition.entities && definition.entities.length > 0) {
      for (const entity of definition.entities) {
        this.entityRegistry.register(entity);
      }
    }

    // Register workflows.
    if (definition.workflows && definition.workflows.length > 0) {
      for (const workflow of definition.workflows) {
        this.metadataRegistry.registerWorkflow(workflow);
      }
    }

    // Register views.
    if (definition.views && definition.views.length > 0) {
      for (const view of definition.views) {
        this.metadataRegistry.registerView(view);
      }
    }

    // Register module itself
    this.metadataRegistry.registerModule(definition);
    this.loadedModules.add(definition.name);
    if (snapshot) this.appliedConfigRevisions.set(definition.name, snapshot.revision);

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
    for (const definition of sorted) this.assertRegistrationAvailable(definition);

    for (const module of sorted) {
      await this.loadModule(module);
    }
  }

  async installModule(
    definition: ModuleDefinition,
    db?: any,
  ): Promise<void> {
    if (this.reloadingModules.has(definition.name)) throw new Error(`Module '${definition.name}' is still reloading`);
    if (this.uninstallingModules.has(definition.name)) throw new Error(`Module '${definition.name}' is still uninstalling`);
    const pending = this.installingModules.get(definition.name);
    if (pending) return pending;
    if (this.loadingModules.has(definition.name)) throw new Error(`Module '${definition.name}' is still loading`);
    if (this.loadedModules.has(definition.name)) return;
    const graph = this.topologicalSort([...this.metadataRegistry.listModules().filter(m => m.name !== definition.name), definition]);
    const needed = new Set<string>();
    const collect = (module: ModuleDefinition) => {
      if (needed.has(module.name) || this.loadedModules.has(module.name)) return;
      needed.add(module.name);
      for (const name of module.depends ?? []) {
        if (this.uninstallingModules.has(name)) throw new Error(`Module '${name}' is still uninstalling`);
        const dependency = this.metadataRegistry.getModule(name);
        if (dependency) collect(dependency);
      }
    };
    collect(definition);
    // Validate every required dependency before running any installation hook.
    for (const module of graph.filter(module => needed.has(module.name))) {
      this.assertRegistrationAvailable(module);
      if (module.hooks?.onInstall && !db) throw new Error('Module installation requires a database context');
    }
    this.activeDefinitions.set(definition.name, definition);
    const installing = Promise.resolve().then(() => this.installDefinition(definition, db));
    this.installingModules.set(definition.name, installing);
    try { await installing; } finally {
      this.installingModules.delete(definition.name);
      this.activeDefinitions.delete(definition.name);
    }
  }

  private async installDefinition(definition: ModuleDefinition, db?: any): Promise<void> {
    for (const name of definition.depends ?? []) {
      const dependency = this.metadataRegistry.getModule(name);
      if (dependency) await this.installModule(dependency, db);
    }
    if (definition.hooks?.onInstall) {
      await definition.hooks.onInstall(db);
    }

    // Then load the module
    await this.loadRegisteredDefinition(definition);
  }

  async uninstallModule(
    moduleName: string,
    db?: any,
  ): Promise<void> {
    if (this.reloadingModules.has(moduleName)) throw new Error(`Module '${moduleName}' is still reloading`);
    if (this.loadingModules.has(moduleName)) throw new Error(`Module '${moduleName}' is still loading`);
    if (this.installingModules.has(moduleName)) throw new Error(`Module '${moduleName}' is still installing`);
    if (this.uninstallingModules.has(moduleName)) throw new Error(`Module '${moduleName}' is still uninstalling`);
    const module = this.metadataRegistry.getModule(moduleName);
    if (!module) {
      throw new Error(`Module '${moduleName}' not found`);
    }

    // Check for dependent modules
    const allModules = [...new Map([...this.metadataRegistry.listModules(), ...this.activeDefinitions.values()]
      .map(module => [module.name, module])).values()];
    const dependents = allModules.filter(
      m => m.depends && m.depends.includes(moduleName),
    );

    if (dependents.length > 0) {
      throw new Error(
        `Cannot uninstall '${moduleName}': it is a dependency of ${dependents.map(m => m.name).join(', ')}`,
      );
    }

    if (module.hooks?.onUninstall && !db) throw new Error('Module uninstallation requires a database context');
    this.uninstallingModules.add(moduleName);
    try {
      if (module.hooks?.onUninstall) {
        await module.hooks.onUninstall(db);
      }

      // Remove only definitions still owned by this module, preserving replacements.
      for (const entity of module.entities ?? []) {
        if (this.metadataRegistry.getEntity(entity.name) === entity) this.metadataRegistry.unregisterEntity(entity.name);
      }
      for (const workflow of module.workflows ?? []) {
        if (this.metadataRegistry.getWorkflow(workflow.name) === workflow) this.metadataRegistry.unregisterWorkflow(workflow.name);
      }
      for (const view of module.views ?? []) {
        if (this.metadataRegistry.getView(view.name) === view) this.metadataRegistry.unregisterView(view.name);
      }
      this.metadataRegistry.unregisterModule(moduleName);
      this.loadedModules.delete(moduleName);
      this.appliedConfigRevisions.delete(moduleName);

      this.eventBus.emit({
        type: BuiltInEvents.MODULE_UNLOADED,
        timestamp: new Date(),
        source: 'module-loader',
        data: { moduleName },
      });
    } finally { this.uninstallingModules.delete(moduleName); }
  }

  isLoaded(moduleName: string): boolean {
    return this.loadedModules.has(moduleName);
  }

  private configStore() {
    if (!this.configuration) throw new Error('Module configuration store unavailable');
    return this.configuration;
  }

  appliedConfigRevision(name: string): number | null { return this.appliedConfigRevisions.get(name) ?? null; }

  async reloadModule(name: string): Promise<void> {
    const pending = this.reloadingModules.get(name);
    if (pending) return pending;
    const definition = this.metadataRegistry.getModule(name);
    if (!definition?.configuration || !definition.hooks?.onReload) throw new Error('Module reload requires an application restart; runtime reload is not supported.');
    if (!this.loadedModules.has(name)) throw new Error('Module must be loaded before reload');
    if (this.loadingModules.has(name) || this.installingModules.has(name) || this.uninstallingModules.has(name)) throw new Error('Module lifecycle operation is in progress');
    const operation = Promise.resolve().then(async () => {
      const snapshot = await this.configStore().read(definition, true);
      await definition.hooks.onReload(snapshot.config);
      this.appliedConfigRevisions.set(name, snapshot.revision);
    });
    this.reloadingModules.set(name, operation);
    try { await operation; } finally { this.reloadingModules.delete(name); }
  }

  getLoadedModules(): string[] {
    return Array.from(this.loadedModules);
  }

  private topologicalSort(modules: ModuleDefinition[]): ModuleDefinition[] {
    const names = new Set<string>();
    const definitions = new Set<string>();
    for (const module of modules) {
      if (!module.name || !module.version || names.has(module.name)) throw new Error('Modules require unique names and versions');
      names.add(module.name);
      for (const kind of ['entities', 'workflows', 'views'] as const) {
        for (const definition of module[kind] ?? []) {
          const key = `${kind}:${definition.name}`;
          if (!definition.name || definitions.has(key)) throw new Error(`Duplicate or unnamed module definition: ${key}`);
          definitions.add(key);
        }
      }
    }
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
      if (!module) {
        // The deployed framework supplies base; all other dependencies must exist.
        if (moduleName === 'base' || this.loadedModules.has(moduleName)) {
          recursionStack.delete(moduleName); visited.add(moduleName); return;
        }
        throw new Error(`Missing module dependency: ${moduleName}`);
      }

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

  private assertRegistrationAvailable(module: ModuleDefinition): void {
    for (const [definitions, lookup] of [
      [module.entities, (name: string) => this.metadataRegistry.getEntity(name)],
      [module.workflows, (name: string) => this.metadataRegistry.getWorkflow(name)],
      [module.views, (name: string) => this.metadataRegistry.getView(name)],
    ] as const) {
      for (const definition of definitions ?? []) {
        const existing = lookup(definition.name);
        if (existing && existing !== definition) throw new Error(`Module definition already registered: ${definition.name}`);
      }
    }
  }
}
