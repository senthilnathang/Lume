import { jest } from '@jest/globals';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ModuleResolver } from '../../../../src/graphql/grids/meta-grid/resolvers/module.resolver';
import { ModuleCatalogService } from '../../../../src/core/module/module-catalog.service';
import { ModuleLoaderService } from '../../../../src/core/module/module-loader.service';
import { MetadataRegistryService } from '../../../../src/core/runtime/metadata-registry.service';
import { EntityRegistryService } from '../../../../src/core/entity/entity-registry.service';
import { EventBusService } from '../../../../src/core/runtime/event-bus.service';
import { AdminModulesController } from '../../../../src/modules/base/controllers/admin-modules.controller';

describe('ModuleResolver live catalog', () => {
  let resolver: ModuleResolver, registry: MetadataRegistryService, loader: ModuleLoaderService;
  const user: any = { sub: 1, role_name: 'admin' };
  const definition = () => ({ name: 'extension', version: '1.0.0', entities: [{ name: 'extension_record', fields: {} }] });
  beforeEach(() => {
    registry = new MetadataRegistryService();
    loader = new ModuleLoaderService(registry, new EntityRegistryService(registry), new EventBusService(new EventEmitter2()));
    class BaseModule {}
    resolver = new ModuleResolver(new ModuleCatalogService(registry, loader, new Map([['base', { metatype: BaseModule }]]) as any));
  });
  it('reports deployed builtins and registered definitions without fabricated dates', async () => {
    registry.registerModule(definition());
    expect(await resolver.installedModules(user)).toEqual([
      expect.objectContaining({ id: 'base', status: 'loaded', managedBy: 'deployment', actions: [], installedAt: null }),
      expect.objectContaining({ id: 'extension', status: 'pending', managedBy: 'runtime', actions: ['install'], installedAt: null }),
    ]);
    expect(await resolver.installedModule('unknown', user)).toBeNull();
  });
  it('executes real lifecycle operations and cleans up definitions', async () => {
    registry.registerModule(definition());
    expect(await resolver.installModule('extension', user)).toBe(true);
    expect(loader.isLoaded('extension')).toBe(true);
    expect(registry.getEntity('extension_record')).toBeDefined();
    expect(await resolver.installedModule('extension', user)).toMatchObject({ status: 'loaded', actions: ['uninstall'] });
    expect(await resolver.uninstallModule('extension', user)).toBe(true);
    expect(loader.isLoaded('extension')).toBe(false);
    expect(registry.getEntity('extension_record')).toBeUndefined();
    expect(await resolver.installedModule('extension', user)).toBeNull();
  });
  it('rejects builtin changes, unknown modules and unsupported configuration', async () => {
    for (const method of ['installModule', 'uninstallModule'] as const) {
      await expect(resolver[method]('base', user)).rejects.toThrow('managed by application deployment');
      await expect(resolver[method]('missing', user)).rejects.toThrow('Module not found');
    }
    await expect(resolver.updateModuleConfig({ moduleName: 'base', config: {}, expectedRevision: 0 }, user)).rejects.toThrow('managed by application deployment');
  });
  it('propagates dependency and hook failures without claiming installation', async () => {
    registry.registerModule({ ...definition(), depends: ['missing'] });
    await expect(resolver.installModule('extension', user)).rejects.toThrow('Missing module dependency');
    registry.registerModule({ ...definition(), hooks: { onLoad: async () => { throw new Error('hook failed'); } } });
    await expect(resolver.installModule('extension', user)).rejects.toThrow('hook failed');
    expect(loader.isLoaded('extension')).toBe(false);
    expect(registry.getEntity('extension_record')).toBeUndefined();
  });
  it('does not invoke database hooks without a reviewed database context', async () => {
    const onInstall = jest.fn(async () => {});
    registry.registerModule({ ...definition(), hooks: { onInstall } });
    expect(await resolver.installedModule('extension', user)).toMatchObject({ actions: [] });
    await expect(resolver.installModule('extension', user)).rejects.toThrow('reviewed deployment');
    expect(onInstall).not.toHaveBeenCalled();
  });
  it('requires an authenticated identity', async () => {
    await expect(resolver.installedModules()).rejects.toThrow('Authentication required');
    await expect(resolver.installModule('extension')).rejects.toThrow('Authentication required');
  });
  it('blocks indirect database installation hooks in both API adapters', async () => {
    const onInstall = jest.fn(async () => {});
    registry.registerModule({ name: 'dependency', version: '1.0.0', hooks: { onInstall } });
    registry.registerModule({ ...definition(), depends: ['dependency'] });
    await expect(resolver.installModule('extension', user)).rejects.toThrow('requires a database context');
    const rest = new AdminModulesController(loader, registry);
    expect(await rest.installModule('extension')).toMatchObject({ success: false, message: 'Module installation requires a database context' });
    expect(onInstall).not.toHaveBeenCalled();
    expect(loader.getLoadedModules()).toEqual([]);
  });
});
