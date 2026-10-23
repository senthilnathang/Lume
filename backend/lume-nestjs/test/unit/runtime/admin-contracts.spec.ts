import { jest } from '@jest/globals';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { JwtStrategy } from '../../../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../../../src/modules/auth/guards/jwt.guard';
import { PolicyGuard, Policy, RequireRoles, Authenticated } from '../../../src/core/permission/policy.guard';
import { PolicyEvaluatorService } from '../../../src/core/permission/policy-evaluator.service';
import { AdminModulesController } from '../../../src/modules/base/controllers/admin-modules.controller';
import { AdminWorkflowsController } from '../../../src/modules/base/controllers/admin-workflows.controller';
import { AdminPluginsController } from '../../../src/modules/base/controllers/admin-plugins.controller';
import { BaseRbacController } from '../../../src/modules/base_rbac/controllers/base-rbac.controller';
import { ModuleLoaderService } from '../../../src/core/module/module-loader.service';
import { MetadataRegistryService } from '../../../src/core/runtime/metadata-registry.service';

@Controller('test-access')
@UseGuards(JwtAuthGuard, PolicyGuard)
class AccessController {
  @Get('member') @Authenticated() member() { return { allowed: true }; }
  @Get('undefined') undefinedPolicy() { return { allowed: true }; }
}

describe('Admin authorization over HTTP', () => {
  let app: any;
  const secret = 'local-admin-contract-test-secret';
  const jwt = new JwtService({ secret });
  const definition = { name: 'test', version: '1.0.0' };
  const installModule = jest.fn(async () => undefined);
  beforeAll(async () => {
    const previous = process.env.JWT_SECRET;
    let strategy: JwtStrategy;
    try { process.env.JWT_SECRET = secret; strategy = new JwtStrategy(); }
    finally {
      if (previous === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previous;
    }
    const module = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [AdminModulesController, AccessController],
      providers: [
        { provide: JwtStrategy, useValue: strategy },
        { provide: PolicyEvaluatorService, useValue: {} },
        { provide: ModuleLoaderService, useValue: { installModule } },
        { provide: MetadataRegistryService, useValue: {
          listModules: () => [definition], getModule: (name: string) => name === 'test' ? definition : undefined,
        } },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => { await app?.close(); });
  const token = (role: string, expiresIn = 60) => jwt.sign({ sub: 7, role_name: role }, { expiresIn });
  it('rejects absent, invalid, and expired credentials', async () => {
    await request(app.getHttpServer()).get('/admin/modules').expect(401);
    for (const bearer of ['invalid', token('admin', -1)]) {
      await request(app.getHttpServer()).get('/admin/modules').auth(bearer, { type: 'bearer' }).expect(401);
    }
  });
  it.each(['admin', 'super_admin'])('allows authenticated %s users', async role => {
    const response = await request(app.getHttpServer()).get('/admin/modules').auth(token(role), { type: 'bearer' }).expect(200);
    expect(response.body.data[0].name).toBe('test');
  });
  it('rejects ordinary users from admin endpoints but allows authenticated endpoints', async () => {
    await request(app.getHttpServer()).get('/admin/modules').auth(token('member'), { type: 'bearer' }).expect(403);
    await request(app.getHttpServer()).get('/test-access/member').auth(token('member'), { type: 'bearer' }).expect(200);
    await request(app.getHttpServer()).get('/test-access/undefined').auth(token('admin'), { type: 'bearer' }).expect(403);
  });
  it('installs the resolved module definition and rejects unknown modules', async () => {
    await request(app.getHttpServer()).post('/admin/modules/test/install').auth(token('admin'), { type: 'bearer' }).expect(200);
    expect(installModule).toHaveBeenCalledWith(definition);
    const response = await request(app.getHttpServer()).post('/admin/modules/missing/install').auth(token('admin'), { type: 'bearer' });
    expect(response.body.success).toBe(false);
    expect(installModule).toHaveBeenCalledTimes(1);
  });
});

describe('Policy metadata contracts', () => {
  const guard = new PolicyGuard(new Reflector(), {} as any);
  @RequireRoles('admin')
  class Target {
    @Policy('module.install') endpoint() {}
    @RequireRoles('member') member() {}
  }
  const context = (method: string, user: any): any => ({
    getClass: () => Target, getHandler: () => Target.prototype[method],
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  });
  it('requires both role and permission when both are declared', async () => {
    await expect(guard.canActivate(context('endpoint', { id: 1, role_name: 'member', permissions: ['module.install'] }))).rejects.toThrow('required role');
    await expect(guard.canActivate(context('endpoint', { id: 1, role_name: 'admin' }))).rejects.toThrow('required permissions');
    await expect(guard.canActivate(context('endpoint', { id: 1, role_name: 'admin', permissions: ['module.install'] }))).resolves.toBe(true);
  });
  it('allows method roles to override class roles and rejects empty identities', async () => {
    await expect(guard.canActivate(context('member', { id: 2, role_name: 'member' }))).resolves.toBe(true);
    await expect(guard.canActivate(context('member', {}))).rejects.toThrow('authentication required');
  });
});

describe('Admin service contracts', () => {
  it('queues persisted record identity and trusted tenant/actor, ignoring forged body data', async () => {
    const workflow = { name: 'notify', entity: 'lead', version: '1.0.0' };
    const execute = jest.fn(async () => ({ id: 9, status: 'completed', stepsLog: [] }));
    const saveWorkflowVersion = jest.fn(async () => undefined);
    const create=jest.fn(async()=>({id:9,status:'pending'}));
    const prisma:any={entity:{findFirst:async()=>({id:3})},user:{findUnique:async()=>({id:7,role_id:1})},entityField:{findMany:async()=>[]},automationJob:{create}};
    const getRecord=jest.fn(async()=>({id:12,entityId:3,companyId:2,data:{title:'Persisted'}}));
    const controller = new AdminWorkflowsController({ getWorkflow: () => workflow } as any, { execute } as any, { saveWorkflowVersion } as any,prisma,{getRecord} as any);
    expect((await controller.executeWorkflow('notify', { recordId: 12, data: { id: 999, title: 'Forged',companyId:99 } }, { user: { id: 7,company_id:2 },headers:{} })).success).toBe(true);
    expect(getRecord).toHaveBeenCalledWith(12,2,7,3);
    expect(create).toHaveBeenCalledWith({data:expect.objectContaining({companyId:2,userId:7,kind:'workflow'})});
    expect(JSON.parse((create.mock.calls[0] as any)[0].data.payload)).toEqual({workflowName:'notify',entityId:3,recordId:12,definition:workflow});
    expect(execute).not.toHaveBeenCalled();
    await controller.saveWorkflowVersion('notify', { note: 'Changed' });
    expect(saveWorkflowVersion).toHaveBeenCalledWith('notify', workflow, 'Changed');
  });
  it('uses installed plugin manifests for display and compatibility', async () => {
    const manifest = { displayName: 'Example', author: 'Team', compatibility: '>=2.0.0' };
    const checkCompatibility = jest.fn(() => ({ compatible: true }));
    const controller = new AdminPluginsController({ list: async () => [{ name: 'example', manifest, enabled: false }], checkCompatibility } as any, {} as any, {} as any);
    expect((await controller.listPlugins()).data[0]).toMatchObject({ displayName: 'Example', enabled: false });
    await controller.checkCompatibility({ pluginName: 'example' });
    expect(checkCompatibility).toHaveBeenCalledWith(manifest);
  });
  it('maps permission API codes and labels to persisted model fields', async () => {
    const create = jest.fn(async ({ data }: any) => data);
    const update = jest.fn(async ({ data }: any) => data);
    const controller = new BaseRbacController({} as any, { permission: { create, update, findUnique: async () => ({ id: 1 }) } } as any);
    await controller.createPermission({ code: 'base.read', name: 'Read', group: 'base', is_active: false });
    expect(create).toHaveBeenCalledWith({ data: { name: 'base.read', display_name: 'Read', category: 'base', description: undefined, isActive: false } });
    await controller.updatePermission(1, { code: 'base.write', name: 'Write', is_active: false });
    expect(update).toHaveBeenCalledWith({ where: { id: 1 }, data: { name: 'base.write', display_name: 'Write', isActive: false } });
  });
  it('replaces role permissions within the transaction using model field names', async () => {
    const tx = { rolePermission: { deleteMany: jest.fn(async () => undefined), createMany: jest.fn(async () => undefined) } };
    const transaction = jest.fn(async (callback: any) => callback(tx));
    const controller = new BaseRbacController({} as any, { role: { findUnique: async () => ({ id: 3 }) }, $transaction: transaction } as any);
    expect((await controller.assignPermissionsToRole(3, { permissionIds: [1, 2] })).success).toBe(true);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: 3 } });
    expect(tx.rolePermission.createMany).toHaveBeenCalledWith({ data: [{ roleId: 3, permissionId: 1 }, { roleId: 3, permissionId: 2 }], skipDuplicates: true });
  });
});
