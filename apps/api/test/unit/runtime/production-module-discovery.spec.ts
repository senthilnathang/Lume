import { jest } from '@jest/globals';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { discoverProductionModules } from '../../../src/core/module/production-module-discovery';
import { ModuleInitializerService } from '../../../src/core/module/module-initializer.service';
import { ModuleLoaderService } from '../../../src/core/module/module-loader.service';
import { MetadataRegistryService } from '../../../src/core/runtime/metadata-registry.service';
import { EntityRegistryService } from '../../../src/core/entity/entity-registry.service';
import { EventBusService } from '../../../src/core/runtime/event-bus.service';

describe('deployment-owned production module discovery', () => {
  let directory: string;
  const keys = ['MODULE_ENTRYPOINTS', 'MODULES_ENABLED', 'LOAD_EXAMPLE_MODULES', 'AUTO_MIGRATE_MODULES'];
  const previous = new Map<string, string | undefined>();
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'lume-discovery-'));
    for (const key of keys) { previous.set(key, process.env[key]); delete process.env[key]; }
    process.env.MODULES_ENABLED = 'true'; process.env.LOAD_EXAMPLE_MODULES = 'false'; process.env.AUTO_MIGRATE_MODULES = 'false';
  });
  afterEach(() => {
    for (const [key, value] of previous) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    rmSync(directory, { recursive: true, force: true });
  });
  const file = (name: string, source: string) => { const path = join(directory, name); writeFileSync(path, source); return path; };
  const runtime = () => {
    const registry = new MetadataRegistryService();
    const loader = new ModuleLoaderService(registry, new EntityRegistryService(registry), new EventBusService(new EventEmitter2()));
    return { registry, loader, initializer: new ModuleInitializerService(loader, registry) };
  };
  it('loads explicit local defaults and installed-package named exports', async () => {
    file('local.cjs', "module.exports={name:'local_extension',version:'1.0.0'}");
    const packageDirectory = join(directory, 'node_modules', 'test-addon'); mkdirSync(packageDirectory, { recursive: true });
    writeFileSync(join(packageDirectory, 'package.json'), '{"main":"index.cjs"}');
    writeFileSync(join(packageDirectory, 'index.cjs'), "exports.Addon={name:'package_extension',version:'2.0.0'}");
    const modules = await discoverProductionModules(JSON.stringify([{ specifier: './local.cjs' }, { specifier: 'test-addon', export: 'Addon' }]), directory);
    expect(modules.map(module => module.name)).toEqual(['local_extension', 'package_extension']);
  });
  it.each(['not-json', '{}', '[null]', '[{"specifier":"https://example.test/module.js"}]', '[{"specifier":"node:fs"}]', '[{"specifier":"a","unexpected":true}]'])('rejects malformed deployment input %s', async raw => {
    await expect(discoverProductionModules(raw, directory)).rejects.toThrow();
  });
  it('resolves the complete list before importing any module', async () => {
    const marker = join(directory, 'imported');
    file('first.cjs', `require('node:fs').writeFileSync(${JSON.stringify(marker)},'yes');module.exports={name:'first',version:'1'};`);
    await expect(discoverProductionModules(JSON.stringify([{ specifier: './first.cjs' }, { specifier: './missing.cjs' }]), directory)).rejects.toThrow();
    expect(existsSync(marker)).toBe(false);
  });
  it('rejects missing exports, reserved names, invalid definitions and duplicate entries', async () => {
    file('invalid.cjs', "module.exports={name:'base',version:'1'}");
    await expect(discoverProductionModules('[{"specifier":"./invalid.cjs"}]', directory)).rejects.toThrow('reserved');
    await expect(discoverProductionModules('[{"specifier":"./invalid.cjs","export":"Missing"}]', directory)).rejects.toThrow('ModuleDefinition');
    await expect(discoverProductionModules('[{"specifier":"./invalid.cjs"},{"specifier":"./invalid.cjs"}]', directory)).rejects.toThrow('Duplicate module entrypoint');
    file('provider.cjs', "module.exports={name:'provider',version:'1',services:[{name:'ignored'}]}");
    await expect(discoverProductionModules('[{"specifier":"./provider.cjs"}]', directory)).rejects.toThrow('Nest deployment registration');
  });
  it('loads production dependencies before children with examples disabled', async () => {
    const marker = join(directory, 'order');
    const parent = file('parent.cjs', `module.exports={name:'parent',version:'1',depends:['base'],hooks:{onLoad:async()=>require('node:fs').appendFileSync(${JSON.stringify(marker)},'parent,')}}`);
    const child = file('child.cjs', `module.exports={name:'child',version:'1',depends:['parent'],hooks:{onLoad:async()=>require('node:fs').appendFileSync(${JSON.stringify(marker)},'child,')}}`);
    process.env.MODULE_ENTRYPOINTS = JSON.stringify([{ specifier: child }, { specifier: parent }]);
    const { initializer, loader } = runtime(); await initializer.onModuleInit();
    expect(loader.getLoadedModules()).toEqual(['parent', 'child']);
    expect(readFileSync(marker, 'utf8')).toBe('parent,child,');
  });
  it.each(['missing', 'cycle', 'duplicate'])('rejects graph %s before hooks run', async reason => {
    const marker = join(directory, 'hook');
    const a = file('a.cjs', `module.exports={name:'a',version:'1',depends:${JSON.stringify(reason === 'missing' ? ['absent'] : reason === 'cycle' ? ['b'] : [])},hooks:{onLoad:async()=>require('node:fs').writeFileSync(${JSON.stringify(marker)},'bad')}}`);
    const b = file('b.cjs', `module.exports={name:'${reason === 'duplicate' ? 'a' : 'b'}',version:'1',depends:${JSON.stringify(reason === 'cycle' ? ['a'] : [])}}`);
    process.env.MODULE_ENTRYPOINTS = JSON.stringify([{ specifier: a }, { specifier: b }]);
    await expect(runtime().initializer.onModuleInit()).rejects.toThrow();
    expect(existsSync(marker)).toBe(false);
  });
  it('fails application initialization before worker bootstrap on a module hook failure', async () => {
    const entry = file('failure.cjs', "module.exports={name:'failure',version:'1',hooks:{onLoad:async()=>{throw new Error('load failed')}}}");
    process.env.MODULE_ENTRYPOINTS = JSON.stringify([{ specifier: entry }]);
    const { initializer } = runtime(), worker = { onApplicationBootstrap: jest.fn() };
    const module = await Test.createTestingModule({ providers: [{ provide: ModuleInitializerService, useValue: initializer }, { provide: 'worker', useValue: worker }] }).compile();
    const app = module.createNestApplication();
    try { await expect(app.init()).rejects.toThrow('load failed'); expect(worker.onApplicationBootstrap).not.toHaveBeenCalled(); }
    finally { await app.close(); }
  });
  it('honors disabled loading and refuses unattended migrations', async () => {
    process.env.MODULE_ENTRYPOINTS = 'invalid'; process.env.MODULES_ENABLED = 'false';
    await expect(runtime().initializer.onModuleInit()).resolves.toBeUndefined();
    process.env.MODULES_ENABLED = 'true'; process.env.AUTO_MIGRATE_MODULES = 'true';
    await expect(runtime().initializer.onModuleInit()).rejects.toThrow('apply reviewed migrations');
  });
});
