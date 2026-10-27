import { ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { BUILTIN_MODULE_NAMES } from '@modules/base/builtin-modules';
import { MetadataRegistryService, ModuleDefinition } from '@core/runtime/metadata-registry.service';
import { ModuleLoaderService } from './module-loader.service';
import { ModuleConfigurationService } from './module-configuration.service';

export function deployedModuleNames(modules?: ModulesContainer): string[] {
  return [...new Set(Array.from(modules?.values() ?? [])
    .map(module => BUILTIN_MODULE_NAMES[module.metatype?.name]).filter(Boolean))].sort();
}

export function runtimeModuleActions(module: ModuleDefinition, loaded: boolean): string[] {
  const actions = loaded ? (module.hooks?.onUninstall ? [] : ['uninstall']) : (module.hooks?.onInstall ? [] : ['install']);
  if (module.configuration && module.hooks?.onLoad) {
    actions.push('configure');
    if (loaded && module.hooks.onReload) actions.push('reload');
  }
  return actions;
}

/** Live process state, not a claim that legacy installed_modules rows are loaded. */
@Injectable()
export class ModuleCatalogService {
  constructor(private registry: MetadataRegistryService, private loader: ModuleLoaderService,
    @Optional() private modules?: ModulesContainer,
    @Optional() private configuration?: ModuleConfigurationService) {}

  async list() {
    const builtins = deployedModuleNames(this.modules);
    return [
      ...builtins.map(name => ({ id: name, name, version: 'bundled', status: 'loaded',
        depends: [], managedBy: 'deployment', actions: [] as string[], installedAt: null, config: null })),
      ...await Promise.all(this.registry.listModules().filter(module => !builtins.includes(module.name)).map(async module => ({
        id: module.name, name: module.name, version: module.version,
        status: this.loader.isLoaded(module.name) ? 'loaded' : 'pending', depends: module.depends ?? [],
        managedBy: 'runtime', actions: runtimeModuleActions(module, this.loader.isLoaded(module.name)),
        installedAt: null, ...await this.configurationState(module),
      }))),
    ];
  }

  async find(name: string) { return (await this.list()).find(module => module.name === name) ?? null; }

  private async configurationState(module: ModuleDefinition) {
    if (!module.configuration) return { config: null, configRevision: null, appliedConfigRevision: null, configPending: false };
    if (!this.configuration) throw new ConflictException('Module configuration store unavailable');
    const snapshot = await this.configuration.read(module);
    const applied = this.loader.appliedConfigRevision(module.name);
    return { config: snapshot.config, configRevision: snapshot.revision, appliedConfigRevision: applied, configPending: applied !== snapshot.revision };
  }

  private runtimeDefinition(name: string) {
    if (deployedModuleNames(this.modules).includes(name)) throw new ConflictException('This module is managed by application deployment.');
    const definition = this.registry.getModule(name);
    if (!definition) throw new NotFoundException('Module not found');
    return definition;
  }

  async install(name: string) {
    const definition = this.runtimeDefinition(name);
    if (definition.hooks?.onInstall) throw new ConflictException('Database installation hooks require a reviewed deployment operation');
    try { await this.loader.installModule(definition); }
    catch (error) { throw new ConflictException(error.message); }
    return true;
  }

  async uninstall(name: string) {
    const definition = this.runtimeDefinition(name);
    if (definition.hooks?.onUninstall) throw new ConflictException('Database uninstallation hooks require a reviewed deployment operation');
    try { await this.loader.uninstallModule(name); }
    catch (error) { throw new ConflictException(error.message); }
    return true;
  }

  async updateConfig(name: string, config: unknown, expectedRevision: number) {
    const definition = this.runtimeDefinition(name);
    if (!this.configuration) throw new ConflictException('Module configuration store unavailable');
    await this.configuration.save(definition, config, expectedRevision);
    return this.find(name);
  }

  async reload(name: string) {
    this.runtimeDefinition(name);
    try { await this.loader.reloadModule(name); }
    catch (error) { throw new ConflictException(error.message); }
    return this.find(name);
  }
}
