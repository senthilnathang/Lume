import { jest } from '@jest/globals';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ModuleLoaderService } from '../../../src/core/module/module-loader.service';
import { MetadataRegistryService, ModuleDefinition } from '../../../src/core/runtime/metadata-registry.service';
import { EntityRegistryService } from '../../../src/core/entity/entity-registry.service';
import { EventBusService } from '../../../src/core/runtime/event-bus.service';

describe('framework module lifecycle', () => {
  let registry: MetadataRegistryService, loader: ModuleLoaderService;
  const definition = (name = 'extension'): ModuleDefinition => ({ name, version: '1.0.0', depends: ['base'],
    entities: [{ name: `${name}_record`, fields: {} }],
    workflows: [{ name: `${name}_workflow`, entity: `${name}_record`, trigger: { type: 'manual', key: name }, steps: [] }],
    views: [{ name: `${name}_view`, entity: `${name}_record`, type: 'list' } as any],
  });
  beforeEach(() => {
    registry = new MetadataRegistryService();
    loader = new ModuleLoaderService(registry, new EntityRegistryService(registry), new EventBusService(new EventEmitter2()));
  });
  it('loads dependencies first and removes owned definitions on unload', async () => {
    const base = definition('dependency'), child = { ...definition(), depends: ['dependency'] };
    await loader.loadAll([child, base]);
    expect(loader.getLoadedModules()).toEqual(['dependency', 'extension']);
    await expect(loader.uninstallModule('dependency')).rejects.toThrow('dependency of extension');
    await loader.uninstallModule('extension');
    expect(registry.getEntity('extension_record')).toBeUndefined();
    expect(registry.getWorkflow('extension_workflow')).toBeUndefined();
    expect(registry.getView('extension_view')).toBeUndefined();
    expect(registry.getEntity('dependency_record')).toBeDefined();
    await loader.uninstallModule('dependency');
    expect(registry.listModules()).toEqual([]);
  });
  it.each(['missing', 'cycle', 'duplicate-module', 'duplicate-entity'])('rejects invalid batches before hooks: %s', async reason => {
    const hook = jest.fn(async () => {});
    const a = { ...definition('a'), hooks: { onLoad: hook } }, b = definition('b');
    if (reason === 'missing') b.depends = ['absent'];
    if (reason === 'cycle') { a.depends = ['b']; b.depends = ['a']; }
    if (reason === 'duplicate-module') b.name = 'a';
    if (reason === 'duplicate-entity') b.entities = a.entities;
    await expect(loader.loadAll([a, b])).rejects.toThrow();
    expect(hook).not.toHaveBeenCalled();
    expect(registry.listModules()).toEqual([]);
  });
  it('rejects a missing dependency before install hooks', async () => {
    const onInstall = jest.fn(async () => {});
    await expect(loader.installModule({ ...definition(), depends: ['absent'], hooks: { onInstall } }, {})).rejects.toThrow('Missing module dependency');
    expect(onInstall).not.toHaveBeenCalled();
  });
  it('preserves an existing definition instead of silently overwriting it', async () => {
    const existing = { name: 'extension_record', fields: {} };
    registry.registerEntity(existing);
    await expect(loader.loadModule(definition())).rejects.toThrow('already registered');
    expect(registry.getEntity(existing.name)).toBe(existing);
  });
  it('runs concurrent loads once and permits retry after a failed hook', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const onLoad = jest.fn(async () => { await gate; });
    const module = { ...definition(), hooks: { onLoad } };
    const first = loader.loadModule(module), second = loader.loadModule(module);
    await expect(loader.uninstallModule(module.name)).rejects.toThrow('still loading');
    release(); await Promise.all([first, second]);
    expect(onLoad).toHaveBeenCalledTimes(1);
    await loader.uninstallModule(module.name);
    module.hooks.onLoad = async () => { throw new Error('load failed'); };
    await expect(loader.loadModule(module)).rejects.toThrow('load failed');
    expect(loader.isLoaded(module.name)).toBe(false);
    expect(registry.getEntity('extension_record')).toBeUndefined();
    module.hooks.onLoad = async () => {};
    await loader.loadModule(module);
    expect(loader.isLoaded(module.name)).toBe(true);
  });
  it('retains loaded metadata when uninstall hooks fail', async () => {
    const module = { ...definition(), hooks: { onUninstall: async () => { throw new Error('uninstall failed'); } } };
    await loader.loadModule(module);
    await expect(loader.uninstallModule(module.name, {})).rejects.toThrow('uninstall failed');
    expect(loader.isLoaded(module.name)).toBe(true);
    expect(registry.getEntity('extension_record')).toBeDefined();
  });
  it('refuses to skip required database lifecycle hooks', async () => {
    const onInstall = jest.fn(async () => {}), onUninstall = jest.fn(async () => {});
    const module = { ...definition(), hooks: { onInstall, onUninstall } };
    await expect(loader.installModule(module)).rejects.toThrow('requires a database context');
    expect(onInstall).not.toHaveBeenCalled();
    expect(loader.isLoaded(module.name)).toBe(false);
    await loader.installModule(module, {});
    await expect(loader.uninstallModule(module.name)).rejects.toThrow('requires a database context');
    expect(loader.isLoaded(module.name)).toBe(true);
    expect(onUninstall).not.toHaveBeenCalled();
  });
  it('preflights transitive database hooks before installing anything', async () => {
    const hook = jest.fn(async () => {});
    const dependency = { ...definition('dependency'), hooks: { onInstall: hook } };
    registry.registerModule(dependency);
    registry.registerModule({ ...definition('middle'), depends: ['dependency'] });
    await expect(loader.installModule({ ...definition(), depends: ['middle'] })).rejects.toThrow('requires a database context');
    expect(hook).not.toHaveBeenCalled();
    expect(loader.getLoadedModules()).toEqual([]);
  });
  it('installs dependency hooks before parent hooks using the provided database', async () => {
    const calls: string[] = [], db = {};
    registry.registerModule({ ...definition('dependency'), hooks: {
      onInstall: async context => { expect(context).toBe(db); calls.push('dependency install'); },
      onLoad: async () => { calls.push('dependency load'); },
    } });
    await loader.installModule({ ...definition(), depends: ['dependency'], hooks: {
      onInstall: async context => { expect(context).toBe(db); calls.push('parent install'); },
      onLoad: async () => { calls.push('parent load'); },
    } }, db);
    expect(calls).toEqual(['dependency install', 'dependency load', 'parent install', 'parent load']);
  });
  it('runs concurrent installation hooks once and rejects competing load/uninstall', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const onInstall = jest.fn(async () => { await gate; });
    const module = { ...definition(), hooks: { onInstall } };
    registry.registerModule(module);
    const first = loader.installModule(module, {}), second = loader.installModule(module, {});
    await expect(loader.loadModule(module)).rejects.toThrow('still installing');
    await expect(loader.uninstallModule(module.name, {})).rejects.toThrow('still installing');
    release(); await Promise.all([first, second]);
    expect(onInstall).toHaveBeenCalledTimes(1);
    expect(loader.isLoaded(module.name)).toBe(true);
  });
  it('protects dependencies of a loading definition before it is registered', async () => {
    await loader.loadModule(definition('dependency'));
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const loading = loader.loadModule({ ...definition(), depends: ['dependency'], hooks: { onLoad: async () => { await gate; } } });
    await expect(loader.uninstallModule('dependency')).rejects.toThrow('dependency of extension');
    release(); await loading;
    expect(loader.isLoaded('dependency')).toBe(true);
  });
  it('releases installation reservations after hook failure so a corrected hook can retry', async () => {
    const module = { ...definition(), hooks: { onInstall: async () => { throw new Error('install failed'); } } };
    const results = await Promise.allSettled([loader.installModule(module, {}), loader.installModule(module, {})]);
    expect(results.map(result => result.status)).toEqual(['rejected', 'rejected']);
    expect(loader.isLoaded(module.name)).toBe(false);
    expect(registry.getEntity('extension_record')).toBeUndefined();
    module.hooks.onInstall = async () => {};
    await loader.installModule(module, {});
    expect(loader.isLoaded(module.name)).toBe(true);
  });
  it('deduplicates configuration reload and rejects overlapping lifecycle mutations', async () => {
    let revision = 0, release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const onReload = jest.fn(async () => { await gate; });
    const configStore = { read: async () => ({ config: { enabled: true }, revision }) };
    const configured = new ModuleLoaderService(registry, new EntityRegistryService(registry), new EventBusService(new EventEmitter2()), configStore as any);
    const module = { ...definition(), configuration: { defaults: {}, validate: () => {} }, hooks: { onLoad: async () => {}, onReload } };
    await configured.loadModule(module); revision = 1;
    const first = configured.reloadModule(module.name), second = configured.reloadModule(module.name);
    await expect(configured.uninstallModule(module.name)).rejects.toThrow('still reloading');
    await expect(configured.installModule(module)).rejects.toThrow('still reloading');
    await expect(configured.loadModule(module)).rejects.toThrow('still reloading');
    revision = 2; // A newer desired revision does not retroactively change this reload's snapshot.
    release(); await Promise.all([first, second]);
    expect(onReload).toHaveBeenCalledTimes(1);
    expect(configured.appliedConfigRevision(module.name)).toBe(1);
    expect((await configStore.read()).revision).toBe(2);
  });
  it('rejects competing lifecycle work during uninstall and releases state on failure', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const hook = jest.fn(async () => { await gate; throw new Error('uninstall failed'); });
    const module = { ...definition(), hooks: { onUninstall: hook } };
    await loader.loadModule(module);
    const removing = loader.uninstallModule(module.name, {});
    await expect(loader.uninstallModule(module.name, {})).rejects.toThrow('still uninstalling');
    await expect(loader.installModule(module, {})).rejects.toThrow('still uninstalling');
    await expect(loader.loadModule(module)).rejects.toThrow('still uninstalling');
    await expect(loader.loadModule({ ...definition('child'), depends: [module.name] })).rejects.toThrow('still uninstalling');
    release(); await expect(removing).rejects.toThrow('uninstall failed');
    expect(hook).toHaveBeenCalledTimes(1);
    expect(loader.isLoaded(module.name)).toBe(true);
    module.hooks.onUninstall = async () => {};
    await loader.uninstallModule(module.name, {});
    expect(loader.isLoaded(module.name)).toBe(false);
  });
});
