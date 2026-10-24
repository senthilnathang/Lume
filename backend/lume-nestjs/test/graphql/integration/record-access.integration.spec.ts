import { jest } from '@jest/globals';
import request from 'supertest';
import { createHarness, type Harness } from './harness';

jest.setTimeout(120000);
describe('Record endpoint rule enforcement (real MySQL and HTTP)', () => {
  let h: Harness;
  beforeAll(async () => { h = await createHarness(); });
  afterAll(async () => { await h?.close(); });
  beforeEach(async () => {
    await h.prisma.recordRule.deleteMany();
    await h.seed();
    for (const name of ['base.records.read','base.records.write','base.entity_records.delete']) {
      const permission = await h.prisma.permission.create({data:{name,display_name:name}});
      await h.prisma.rolePermission.create({data:{roleId:2,permissionId:permission.id}});
    }
  });
  const rule = (action: string, domain: object, extra = {}) => h.prisma.recordRule.create({data:{name:'Restriction',modelName:'entity_1',action,domain:JSON.stringify(domain),groups:'[2]',...extra}});
  const rest = (method: string, path: string, token = h.token('member')) => request(h.app.getHttpServer())[method](`/api/entities/1/records${path}`).auth(token,{type:'bearer'});

  it('filters before pagination and excludes denied records from totals and single reads', async () => {
    await rule('read',{name:{ne:'Record 2'}});
    const response = await h.query('{ entityRecords(entityId:1,pagination:{limit:1}) { total totalPages items { data } } denied:entityRecord(entityId:1,recordId:2) { id } other:entityRecord(entityId:1,recordId:4) { id } }',h.token('member'));
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.entityRecords).toMatchObject({total:2,totalPages:2});
    expect(response.body.data.entityRecords.items[0].data.name).not.toBe('Record 2');
    expect(response.body.data.denied).toBeNull();
    expect(response.body.data.other).toBeNull();
    const http = await rest('get','?limit=1');
    expect(http.status).toBe(200);
    expect(http.body.pagination.total).toBe(2);
    expect((await rest('get','/2')).body.success).not.toBe(true);
  });

  it('uses persisted role identity and applies global rules to admins too', async () => {
    await rule('read',{name:'Record 1'}, {groups:null});
    const response = await h.query('{ entityRecords(entityId:1) { total } }');
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.entityRecords.total).toBe(1);
    await h.prisma.recordRule.deleteMany();
    await rule('read',{name:'Record 1'},{groups:'[3]'});
    await h.prisma.user.update({where:{id:2},data:{role_id:3}});
    // A stale admin claim must not bypass the user's current route permissions.
    const { JwtService } = await import('@nestjs/jwt');
    const token = new JwtService({secret:process.env.JWT_SECRET}).sign({sub:2,role_id:2,role_name:'admin',email:'member@test.local',company_id:1});
    const denied = await h.query('{ entityRecords(entityId:1) { total } }',token);
    expect(denied.body.errors[0].extensions.code).toBe('FORBIDDEN');
    const permission = await h.prisma.permission.findUniqueOrThrow({ where: { name: 'base.entity_records.read' } });
    await h.prisma.rolePermission.create({ data: { roleId: 3, permissionId: permission.id } });
    const restricted = await h.query('{ entityRecords(entityId:1) { total } }',token);
    expect(restricted.body.errors).toBeUndefined();
    expect(restricted.body.data.entityRecords.total).toBe(1);
  });

  it('enforces generic model rules together with entity-specific rules', async () => {
    await rule('read',{name:{ne:'Record 1'}},{modelName:'EntityRecord'});
    await rule('read',{name:{ne:'Record 2'}});
    const response = await h.query('{ entityRecords(entityId:1) { total items { data } } }',h.token('member'));
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.entityRecords.total).toBe(1);
    expect(response.body.data.entityRecords.items[0].data.name).toBe('Record 3');
  });

  it('rejects denied creates without persisting a row through GraphQL or REST', async () => {
    await rule('create',{name:'Allowed'});
    const count = await h.prisma.entityRecord.count();
    const response = await h.query('mutation { createEntityRecord(entityId:1,input:{data:{name:"Denied"}}) { id } }',h.token('member'));
    expect(response.body.errors[0].extensions.code).toBe('FORBIDDEN');
    expect((await rest('post','').send({data:{name:'Denied'}})).status).toBe(403);
    expect(await h.prisma.entityRecord.count()).toBe(count);
    expect((await rest('post','').send({data:{name:'Allowed'}})).status).toBe(201);
  });

  it('checks existing and resulting data on updates', async () => {
    await rule('write',{name:{ne:'Denied'}});
    const response = await h.query('mutation { updateEntityRecord(entityId:1,recordId:1,input:{data:{name:"Denied"}}) { id } }',h.token('member'));
    expect(response.body.errors[0].extensions.code).toBe('FORBIDDEN');
    expect((await rest('put','/1').send({data:{name:'Denied'}})).status).toBe(403);
    expect(JSON.parse((await h.prisma.entityRecord.findUnique({where:{id:1}})).data).name).toBe('Record 1');
    await h.prisma.entityRecord.update({where:{id:1},data:{data:JSON.stringify({name:'Denied'})}});
    expect((await rest('put','/1').send({data:{name:'Allowed'}})).status).toBe(403);
    const allowed = await rest('put','/2').send({data:{name:'Allowed'}});
    expect(allowed.status).toBe(200);
  });

  it('checks formula results rather than only caller input on create', async () => {
    await h.prisma.entityField.create({data:{entityId:1,name:'total',slug:'total',label:'Total',type:'formula',formulaExpression:'2 * 5',isStored:true}});
    await rule('create',{total:{lt:5}});
    const response = await rest('post','').send({data:{name:'With formula',total:0}});
    expect(response.status).toBe(403);
    expect(await h.prisma.entityRecord.count()).toBe(4);
  });

  it('denies single and mixed bulk deletion atomically', async () => {
    await rule('unlink',{name:{ne:'Record 2'}});
    expect((await rest('delete','/2')).status).toBe(403);
    const bulk = await h.query('mutation { deleteEntityRecords(recordIds:[1,2]) { id } }',h.token('member'));
    expect(bulk.body.errors[0].extensions.code).toBe('FORBIDDEN');
    expect(await h.prisma.entityRecord.count({where:{deletedAt:null}})).toBe(4);
    const allowed = await h.query('mutation { deleteEntityRecords(recordIds:[1,3]) { id } }',h.token('member'));
    expect(allowed.body.errors).toBeUndefined();
    expect(allowed.body.data.deleteEntityRecords).toHaveLength(2);
    expect(await h.prisma.entityRecord.count({where:{deletedAt:{not:null}}})).toBe(2);
  });

  it('does not default missing tenants or accept cross-tenant overrides on REST', async () => {
    expect((await rest('get','',h.token('admin',null))).status).toBe(403);
    expect((await rest('get','').set('x-org-id','2')).status).toBe(403);
    expect((await rest('get','/4')).body.success).not.toBe(true);
    expect((await rest('put','/4').send({data:{name:'Wrong tenant'}})).body.success).not.toBe(true);
    expect(JSON.parse((await h.prisma.entityRecord.findUnique({where:{id:4}})).data).name).toBe('Record 4');
  });

  it('fails closed for malformed policies and honors rule deactivation immediately', async () => {
    const row = await rule('read',{}, {domain:'broken'});
    expect((await rest('get','')).status).toBe(403);
    await h.prisma.recordRule.update({where:{id:row.id},data:{isActive:false}});
    const response = await rest('get','');
    expect(response.status).toBe(200);
    expect(response.body.pagination.total).toBe(3);
  });

  it('rejects REST record IDs under the wrong entity route', async () => {
    for (const method of ['get','put','delete']) {
      let req = request(h.app.getHttpServer())[method]('/api/entities/2/records/1').auth(h.token('member'),{type:'bearer'});
      if (method === 'put') req = req.send({data:{name:'Wrong entity'}});
      const response = await req;
      expect(response.status).toBe(400);
    }
    const row = await h.prisma.entityRecord.findUnique({where:{id:1}});
    expect(JSON.parse(row.data).name).toBe('Record 1');
    expect(row.deletedAt).toBeNull();
  });

  it('rejects stale authorization when data changes before a write', async () => {
    await rule('write',{name:{ne:'Blocked'}});
    let intercept = true;
    h.prisma.$use(async (params: any, next: any) => {
      if (intercept && params.model === 'EntityRecord' && ['update','updateMany'].includes(params.action)) {
        intercept = false;
        await h.prisma.entityRecord.update({where:{id:1},data:{data:JSON.stringify({name:'Blocked'})}});
      }
      return next(params);
    });
    try {
      const response = await rest('put','/1').send({data:{name:'Allowed'}});
      expect(response.status).toBe(409);
      expect(JSON.parse((await h.prisma.entityRecord.findUnique({where:{id:1}})).data).name).toBe('Blocked');
    } finally { intercept = false; }
  });
});
