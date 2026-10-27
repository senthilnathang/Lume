import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { sqlStatements } from '../../../migrations/sql-statements';
import { createHarness, Harness } from './harness';
import { PrismaService } from '../../../src/core/services/prisma.service';
import { DrizzleService } from '../../../src/core/services/drizzle.service';
import { TenantRegistryService } from '../../../src/core/services/tenant-registry.service';
import { MetadataRegistryService } from '../../../src/core/runtime/metadata-registry.service';
import { ModuleLoaderService } from '../../../src/core/module/module-loader.service';
import { ModuleConfigurationService } from '../../../src/core/module/module-configuration.service';
import { EntityRegistryService } from '../../../src/core/entity/entity-registry.service';
import { EventBusService } from '../../../src/core/runtime/event-bus.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

jest.setTimeout(120000);
describe('complete framework startup with shared database ownership', () => {
  let h: Harness, app: any;
  let moduleDirectory: string, moduleMarker: string;
  let prismaInstances = 0, drizzleInstances = 0;
  const flags = ['AUTOMATION_WORKER_ENABLED', 'AUTOMATION_SCHEDULER_ENABLED', 'AUTOMATION_DURABLE_EVENTS', 'LOAD_EXAMPLE_MODULES', 'MODULE_ENTRYPOINTS', 'MODULES_ENABLED', 'AUTO_MIGRATE_MODULES'];
  const previous = new Map<string, string | undefined>();
  afterAll(async () => {
    await app?.close(); await h?.close();
    if (moduleDirectory) rmSync(moduleDirectory, { recursive: true, force: true });
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  beforeAll(async () => {
    for (const key of flags) { previous.set(key, process.env[key]); process.env[key] = 'false'; }
    process.env.MODULES_ENABLED = 'true';
    moduleDirectory = mkdtempSync(join(tmpdir(), 'lume-startup-modules-')); moduleMarker = join(moduleDirectory, 'loaded');
    const parent = join(moduleDirectory, 'parent.cjs'), child = join(moduleDirectory, 'child.cjs');
    writeFileSync(parent, `module.exports={name:'production_parent',version:'1',depends:['base'],hooks:{onLoad:async()=>require('node:fs').appendFileSync(${JSON.stringify(moduleMarker)},'parent,')}}`);
    writeFileSync(child, `module.exports={name:'production_child',version:'1',depends:['production_parent'],hooks:{onLoad:async()=>require('node:fs').appendFileSync(${JSON.stringify(moduleMarker)},'child,')}}`);
    process.env.MODULE_ENTRYPOINTS = JSON.stringify([{ specifier: child }, { specifier: parent }]);
    h = await createHarness();
    // Prisma owns the core tables; these two existing SQL migrations own the
    // extension-host tables required by the complete application's startup hooks.
    for (const filename of ['008_create_plugin_management_tables.sql', '016_create_marketplace_tables.sql']) {
      for (const statement of sqlStatements(readFileSync(resolve('migrations', filename), 'utf8'))) {
        await h.prisma.$executeRawUnsafe(statement);
      }
    }
    const { AppModule } = await import('../../../src/app.module');
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useFactory({ factory: () => { prismaInstances++; return h.prisma; } })
      .overrideProvider(DrizzleService).useFactory({ factory: () => { drizzleInstances++; return h.app.get(DrizzleService); } })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v2');
    await app.init();
  });
  it('initializes the real AppModule once per database provider and serves health/GraphQL', async () => {
    expect(prismaInstances).toBe(1);
    expect(drizzleInstances).toBe(1);
    expect(readFileSync(moduleMarker, 'utf8')).toBe('parent,child,');
    expect(app.get(ModuleLoaderService).getLoadedModules()).toEqual(['production_parent', 'production_child']);
    const health = await request(app.getHttpServer()).get('/api/v2/health');
    expect(health.status).toBe(200);
    expect(health.body.status).toBe('ok');
    const graphql = await request(app.getHttpServer()).post('/api/v2/graphql').send({ query: '{ __typename }' });
    expect(graphql.status).toBe(200);
    expect(graphql.body.errors).toBeUndefined();
    expect(graphql.body.data).toEqual({ __typename: 'Query' });
    expect((await request(app.getHttpServer()).get('/api/v2/account/permissions')).status).toBe(401);
  });

  it('exposes a real guarded module catalog through the complete application', async () => {
    const query = '{installedModules{id name status managedBy actions installedAt} installedModule(name:"missing"){id}}';
    const gql = (text: string, token?: string) => {
      const req = request(app.getHttpServer()).post('/api/v2/graphql');
      if (token) req.auth(token, { type: 'bearer' });
      return req.send({ query: text });
    };
    expect((await gql(query)).body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect((await gql(query, h.token('member'))).body.errors[0].extensions.code).toBe('FORBIDDEN');
    const response = await gql(query, h.token('admin'));
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.installedModule).toBeNull();
    expect(response.body.data.installedModules).toContainEqual({ id: 'base', name: 'base', status: 'loaded', managedBy: 'deployment', actions: [], installedAt: null });
    const rest = await request(app.getHttpServer()).get('/api/v2/admin/modules').auth(h.token('admin'), { type: 'bearer' });
    expect(rest.status).toBe(200);
    expect(response.body.data.installedModules.map(module => module.name)).toEqual(rest.body.data.map(module => module.name));
    const denied = await gql('mutation{installModule(name:"base")}', h.token('admin'));
    expect(denied.body.errors).toBeDefined();
    expect(denied.body.data).toBeNull();
  });
  it('enforces permissions on tenant operations', async () => {
    const operations = [
      '{tenants{id}}', '{tenant(id:"1"){id}}',
      'mutation{createTenant(input:{id:"1",name:"Test",domain:"test.example"}){id}}',
      'mutation{updateTenant(id:"1",input:{active:false}){id}}',
      'mutation{deleteTenant(id:"1")}',
    ];
    const gql = (query: string, token?: string) => {
      const req = request(app.getHttpServer()).post('/api/v2/graphql');
      if (token) req.auth(token, { type: 'bearer' });
      return req.send({ query });
    };
    for (const operation of operations) {
      expect((await gql(operation)).body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
      expect((await gql(operation, h.token('member'))).body.errors[0].extensions.code).toBe('FORBIDDEN');
    }
    // Failed provisioning must not disable or delete existing company-scoped records.
    expect(await h.prisma.entityRecord.count({ where: { companyId: 1 } })).toBe(3);
    expect(await h.prisma.entityRecord.count({ where: { companyId: 2 } })).toBe(1);
    const invalid = await gql('mutation{createTenant(input:{id:"1",name:"Test",domain:"test.example",config:[]}){id}}', h.token('admin'));
    expect(invalid.body.errors[0].extensions.code).toBe('BAD_REQUEST');
  });
  it('persists tenant lifecycle and enforces inactive status on REST and GraphQL requests', async () => {
    const gql = (query: string, token = h.token('admin', null), header?: string) => {
      const req = request(app.getHttpServer()).post('/api/v2/graphql').auth(token, { type: 'bearer' });
      if (header) req.set('x-org-id', header);
      return req.send({ query });
    };
    const created = await gql('mutation{createTenant(input:{id:"2",name:"Company Two",domain:"TWO.EXAMPLE",config:{enabled:false}}){id name domain config active createdAt updatedAt}}');
    expect(created.body.errors).toBeUndefined();
    expect(created.body.data.createTenant).toMatchObject({ id: '2', name: 'Company Two', domain: 'two.example', config: { enabled: false }, active: true });
    // A new service instance reads the committed row; no process-local registry.
    const restarted = new TenantRegistryService(h.prisma);
    expect(await restarted.find('2', 1)).toMatchObject({ domain: 'two.example', config: { enabled: false } });
    expect((await gql('{tenants{id} tenant(id:"999"){id}}')).body.data).toEqual({ tenants: [{ id: '2' }], tenant: null });
    expect((await gql('mutation{createTenant(input:{id:"3",name:"Duplicate",domain:"two.example"}){id}}')).body.errors[0].extensions.code).toBe('CONFLICT');
    expect((await gql('mutation{createTenant(input:{id:"slug",name:"Invalid",domain:"invalid.example"}){id}}')).body.errors[0].extensions.code).toBe('BAD_REQUEST');
    const disabled = await gql('mutation{updateTenant(id:"2",input:{active:false,config:{count:3}}){id active config}}');
    expect(disabled.body.errors).toBeUndefined();
    expect(disabled.body.data.updateTenant).toMatchObject({ active: false, config: { count: 3 } });
    expect((await request(app.getHttpServer()).get('/api/v2/account/permissions').auth(h.token('member', 2), { type: 'bearer' })).status).toBe(401);
    expect((await gql('{installedModules{name}}', h.token('admin', 2))).body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect((await gql('{installedModules{name}}', h.token('admin', null), '2')).body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect((await request(app.getHttpServer()).get('/api/v2/account/permissions').auth(h.token('admin', null), { type: 'bearer' }).set('x-org-id', '2')).status).toBe(401);
    expect((await gql('mutation{updateTenant(id:"2",input:{active:true}){active}}')).body.data.updateTenant.active).toBe(true);
    expect((await request(app.getHttpServer()).get('/api/v2/account/permissions').auth(h.token('member', 2), { type: 'bearer' })).status).toBe(200);
    const permission = await h.prisma.permission.create({ data: { name: 'base.tenants.manage', display_name: 'Manage tenants' } });
    await h.prisma.rolePermission.create({ data: { roleId: 2, permissionId: permission.id } });
    expect((await gql('{tenants{id}}', h.token('member', 2))).body.errors[0].extensions.code).toBe('FORBIDDEN');
    expect((await gql('mutation{deleteTenant(id:"2")}')).body.data.deleteTenant).toBe(true);
    expect((await restarted.find('2', 1))).toMatchObject({ active: false, deletedAt: expect.any(Date) });
    expect((await gql('mutation{updateTenant(id:"2",input:{active:true}){id}}')).body.errors[0].extensions.code).toBe('NOT_FOUND');
    expect((await gql('mutation{deleteTenant(id:"2")}')).body.errors[0].extensions.code).toBe('NOT_FOUND');
    expect((await gql('mutation{createTenant(input:{id:"2",name:"Reuse",domain:"reuse.example"}){id}}')).body.errors[0].extensions.code).toBe('CONFLICT');
    expect((await request(app.getHttpServer()).get('/api/v2/account/permissions').auth(h.token('member', 2), { type: 'bearer' })).status).toBe(401);
    expect(await h.prisma.entityRecord.count({ where: { companyId: 2 } })).toBe(1);
    expect(await h.prisma.entityRecord.count({ where: { companyId: 1 } })).toBe(3);
  });
  it('persists validated module configuration and applies it only through load/reload hooks', async () => {
    const registry = app.get(MetadataRegistryService), loader = app.get(ModuleLoaderService), store = app.get(ModuleConfigurationService);
    let applied = 0;
    const definition = { name: 'configurable_test', version: '1.0.0', configuration: {
      defaults: { threshold: 5 }, validate: (config: any) => { if (!Number.isInteger(config.threshold) || config.threshold < 1 || Object.keys(config).length !== 1) throw new Error('Invalid threshold'); },
    }, hooks: { onLoad: async (config: any) => { applied = config.threshold; }, onReload: async (config: any) => { applied = config.threshold; } } };
    registry.registerModule(definition);
    const fields = 'name config configRevision appliedConfigRevision configPending actions';
    const gql = (query: string, token = h.token('admin', null), variables?: any) => request(app.getHttpServer()).post('/api/v2/graphql').auth(token, { type: 'bearer' }).send({ query, variables });
    const save = (threshold: number, expectedRevision: number, token?: string) => gql(`mutation($input:UpdateModuleConfigInput!){updateModuleConfig(input:$input){${fields}}}`, token, { input: { moduleName: definition.name, config: { threshold }, expectedRevision } });
    expect((await gql(`{installedModule(name:"${definition.name}"){${fields}}}`)).body.data.installedModule).toMatchObject({ config: { threshold: 5 }, configRevision: 0, appliedConfigRevision: null, configPending: true });
    expect((await save(10, 0, h.token('member'))).body.errors[0].extensions.code).toBe('FORBIDDEN');
    const saved = await save(10, 0);
    expect(saved.body.errors).toBeUndefined();
    expect(saved.body.data.updateModuleConfig).toMatchObject({ config: { threshold: 10 }, configRevision: 1, appliedConfigRevision: null });
    expect(applied).toBe(0);
    expect((await gql(`mutation{installModule(name:"${definition.name}")}`)).body.data.installModule).toBe(true);
    expect(applied).toBe(10);
    expect(loader.appliedConfigRevision(definition.name)).toBe(1);
    const updated = await request(app.getHttpServer()).put(`/api/v2/admin/modules/${definition.name}/config`).auth(h.token('admin'), { type: 'bearer' }).send({ config: { threshold: 20 }, expectedRevision: 1 });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ configRevision: 2, appliedConfigRevision: 1, configPending: true });
    expect(applied).toBe(10);
    const reloaded = await request(app.getHttpServer()).post(`/api/v2/admin/modules/${definition.name}/reload`).auth(h.token('admin'), { type: 'bearer' });
    expect(reloaded.body.success).toBe(true); expect(applied).toBe(20);
    const rest = await request(app.getHttpServer()).get(`/api/v2/admin/modules/${definition.name}`).auth(h.token('admin'), { type: 'bearer' });
    expect(rest.body.data).toMatchObject({ configRevision: 2, appliedConfigRevision: 2, configPending: false });
    // A fresh loader/store reads persisted configuration, not the old process map.
    const freshRegistry = new MetadataRegistryService();
    const freshLoader = new ModuleLoaderService(freshRegistry, new EntityRegistryService(freshRegistry), new EventBusService(new EventEmitter2()), new ModuleConfigurationService(h.prisma));
    let afterRestart = 0;
    await freshLoader.loadModule({ ...definition, hooks: { onLoad: async config => { afterRestart = Number(config.threshold); } } });
    expect(afterRestart).toBe(20); expect(freshLoader.appliedConfigRevision(definition.name)).toBe(2);
    expect((await save(-1, 2)).body.errors[0].extensions.code).toBe('BAD_REQUEST');
    const competing = await Promise.all([save(30, 2), save(40, 2)]);
    expect(competing.filter(response => !response.body.errors)).toHaveLength(1);
    expect(competing.find(response => response.body.errors).body.errors[0].extensions.code).toBe('CONFLICT');
    const desired = await store.read(definition);
    expect(desired.revision).toBe(3); expect([30, 40]).toContain(desired.config.threshold);
    definition.hooks.onReload = async () => { throw new Error('reload failed'); };
    expect((await gql(`mutation{reloadModule(name:"${definition.name}"){${fields}}}`)).body.errors[0].extensions.code).toBe('CONFLICT');
    expect(loader.appliedConfigRevision(definition.name)).toBe(2); expect(applied).toBe(20);
    definition.hooks.onReload = async config => { applied = config.threshold; };
    const retried = await gql(`mutation{reloadModule(name:"${definition.name}"){${fields}}}`);
    expect(retried.body.errors).toBeUndefined(); expect(retried.body.data.reloadModule.configPending).toBe(false);
    expect(applied).toBe(desired.config.threshold);
    await h.prisma.$executeRawUnsafe("CREATE TRIGGER reject_module_config BEFORE UPDATE ON runtime_module_configs FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='test storage failure'");
    try {
      expect((await save(50, 3)).body.errors).toBeDefined();
      expect((await store.read(definition)).revision).toBe(3);
    } finally { await h.prisma.$executeRawUnsafe('DROP TRIGGER reject_module_config'); }
    await loader.uninstallModule(definition.name);
    expect(loader.appliedConfigRevision(definition.name)).toBeNull();
    expect((await store.read(definition)).revision).toBe(3);
  });
});
