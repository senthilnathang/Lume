import { jest } from '@jest/globals';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { loadExampleModules, getModuleConfig } from '../../../src/core/module/module-wiring';
import { ModuleInitializerService } from '../../../src/core/module/module-initializer.service';
import { ModuleLoaderService } from '../../../src/core/module/module-loader.service';
import { MetadataRegistryService } from '../../../src/core/runtime/metadata-registry.service';
import { EntityRegistryService } from '../../../src/core/entity/entity-registry.service';
import { EventBusService } from '../../../src/core/runtime/event-bus.service';

describe('Compiled example module contracts', () => {
  it('loads all three modules through the real loader', async () => {
    const modules = await loadExampleModules();
    expect(modules.map(module => module.name)).toEqual(['crm', 'ecommerce', 'project-management']);
    const metadata = new MetadataRegistryService();
    const loader = new ModuleLoaderService(metadata, new EntityRegistryService(metadata), new EventBusService(new EventEmitter2()));
    for (const module of modules) await loader.loadModule(module);
    expect(metadata.listModules()).toHaveLength(3);
    expect(metadata.listEntities().length).toBeGreaterThanOrEqual(8);
    expect(metadata.listWorkflows().length).toBeGreaterThanOrEqual(8);
    for (const entity of metadata.listEntities()) {
      for (const [name, computed] of Object.entries(entity.computed || {})) expect(computed.name).toBe(name);
    }
  });
  it('preserves order numbering and task completion hooks', async () => {
    const modules = await loadExampleModules();
    const entities = modules.flatMap(module => module.entities || []);
    const order = entities.find(entity => entity.name === 'Order')!;
    const task = entities.find(entity => entity.name === 'Task')!;
    expect(await order.hooks!.beforeCreate!({}, {})).toHaveProperty('orderNumber', expect.stringMatching(/^ORD-/));
    expect(await task.hooks!.beforeUpdate!(1, { status: 'done' }, {})).toHaveProperty('completedAt', expect.any(String));
  });
  it('uses the same explicit opt-in for initialization and configuration', async () => {
    const previous = process.env.LOAD_EXAMPLE_MODULES;
    const previousEnabled = process.env.MODULES_ENABLED;
    const loadAll = jest.fn(async () => undefined);
    const metadata = new MetadataRegistryService();
    try {
      delete process.env.LOAD_EXAMPLE_MODULES;
      process.env.MODULES_ENABLED = 'true';
      expect(getModuleConfig().loadExamples).toBe(false);
      await new ModuleInitializerService({ loadAll } as any, metadata).onModuleInit();
      expect(loadAll).not.toHaveBeenCalled();
      process.env.LOAD_EXAMPLE_MODULES = 'true';
      await new ModuleInitializerService({ loadAll } as any, metadata).onModuleInit();
      expect(loadAll).toHaveBeenCalledTimes(1);
      expect(loadAll.mock.calls[0][0]).toHaveLength(3);
      loadAll.mockClear();
      process.env.MODULES_ENABLED = 'false';
      await new ModuleInitializerService({ loadAll } as any, metadata).onModuleInit();
      expect(loadAll).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete process.env.LOAD_EXAMPLE_MODULES; else process.env.LOAD_EXAMPLE_MODULES = previous;
      if (previousEnabled === undefined) delete process.env.MODULES_ENABLED; else process.env.MODULES_ENABLED = previousEnabled;
    }
  });
});
