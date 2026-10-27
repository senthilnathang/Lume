import { jest } from '@jest/globals';
import request from 'supertest';
import { createHarness, type Harness } from './harness';

jest.setTimeout(120000);
describe('Approval request HTTP API (real Nest, JWT and MySQL)', () => {
  let h: Harness;
  let chain: number;
  beforeAll(async () => { h = await createHarness(); });
  afterAll(async () => { await h?.close(); });
  beforeEach(async () => {
    await h.prisma.automation_approval_requests.deleteMany();
    await h.prisma.automation_approval_chains.deleteMany();
    await h.prisma.recordRule.deleteMany();
    await h.seed();
    await h.prisma.entityRecord.updateMany({data:{visibility:'public'}});
    const permission = await h.prisma.permission.create({data:{name:'base_automation.approvals',display_name:'Use approvals'}});
    await h.prisma.rolePermission.create({data:{roleId:2,permissionId:permission.id}});
    chain = (await h.prisma.automation_approval_chains.create({data:{
      name:'Review',model:'entity_1',steps:'[{"approverId":2},{"roleId":1}]',condition:'{}',
    }})).id;
  });
  const http = (method: string, path = '', bearer: string | null = h.token('member')) => {
    const req = request(h.app.getHttpServer())[method]('/api/automation/approval-requests' + path);
    return bearer ? req.auth(bearer,{type:'bearer'}) : req;
  };
  const payload = () => ({chainId:chain,recordEntityId:1,recordId:1});
  const start = async () => {
    const response = await http('post','',h.token()).send(payload());
    expect(response.status).toBe(201);
    return response.body.data.id as number;
  };
  const saved = (id: number) => h.prisma.automation_approval_requests.findUnique({where:{id}});

  it('rejects creation on another actor’s private record and permits the owner', async () => {
    await h.prisma.entityRecord.update({where:{id:1},data:{visibility:'private'}});
    expect((await http('post').send(payload())).status).toBe(403);
    expect(await h.prisma.automation_approval_requests.count()).toBe(0);
    await h.prisma.entityRecord.update({where:{id:1},data:{createdBy:2}});
    const response = await http('post').send(payload());
    expect(response.status).toBe(201);
    const id = response.body.data.id;
    expect((await http('get','/' + id)).status).toBe(200);
    expect((await http('post','/' + id + '/approve').send({stepIndex:0})).status).toBe(200);
  });

  it.each(['approve','reject'])('rechecks private visibility before %s and hides the pending request', async decision => {
    const id = await start();
    const original = await saved(id);
    const notificationCount = await h.prisma.notifications.count();
    await h.prisma.entityRecord.update({where:{id:1},data:{visibility:'private'}});
    expect((await http('get','/' + id)).status).toBe(403);
    expect((await http('get','?limit=1')).body.data).toEqual({items:[],nextCursor:id});
    expect((await http('post',`/${id}/${decision}`).send({stepIndex:0,...(decision === 'reject' ? {reason:'No'} : {})})).status).toBe(403);
    expect(await saved(id)).toEqual(original);
    expect(await h.prisma.notifications.count()).toBe(notificationCount);
    // Administrator visibility does not override the assigned approver.
    expect((await http('get','/' + id,h.token())).status).toBe(200);
    expect((await http('post','/' + id + '/approve',h.token()).send({stepIndex:0})).status).toBe(403);
  });

  it('hides terminal history after private-record ownership changes', async () => {
    await h.prisma.entityRecord.update({where:{id:1},data:{visibility:'private',createdBy:2}});
    const id = await start();
    expect((await http('post','/' + id + '/reject').send({stepIndex:0,reason:'No'})).status).toBe(200);
    expect((await http('get','?view=history')).body.data.items.map(row => row.id)).toEqual([id]);
    await h.prisma.entityRecord.update({where:{id:1},data:{createdBy:1}});
    expect((await http('get','?view=history')).body.data.items).toEqual([]);
    expect((await http('get','/' + id)).status).toBe(403);
  });

  it.each(['admin','super_admin'])('allows assigned %s actors on private records within the tenant', async roleName => {
    await h.prisma.role.update({where:{id:1},data:{name:roleName}});
    await h.prisma.entityRecord.update({where:{id:1},data:{visibility:'private',createdBy:2}});
    await h.prisma.automation_approval_chains.update({where:{id:chain},data:{steps:'[{"approverId":1}]'}});
    const id = await start();
    expect((await http('post','/' + id + '/approve',h.token()).send({stepIndex:0})).status).toBe(200);
    expect((await saved(id)).status).toBe('completed');
  });

  it('lists only assigned pending requests and participant history within the tenant', async () => {
    const id = await start();
    expect((await http('get')).body.data.items.map(row => row.id)).toEqual([id]);
    expect((await http('get', '', h.token())).body.data.items).toEqual([]);
    expect((await http('get', '', h.token('member', 2))).body.data.items).toEqual([]);
    expect((await http('get', '', null)).status).toBe(401);
    const permission = await h.prisma.permission.findUnique({where:{name:'base_automation.approvals'}});
    await h.prisma.rolePermission.create({data:{roleId:3,permissionId:permission.id}});
    expect((await http('get', '', h.token('none'))).body.data.items).toEqual([]);
    await http('post', '/' + id + '/reject').send({stepIndex:0,reason:'Needs revision'});
    expect((await http('get')).body.data.items).toEqual([]);
    expect((await http('get', '?view=history')).body.data.items.map(row => row.id)).toEqual([id]);
    expect((await http('get', '?view=history', h.token())).body.data.items.map(row => row.id)).toEqual([id]);
    expect((await http('get', '?view=history', h.token('none'))).body.data.items).toEqual([]);
  });

  it('filters unreadable or unwritable records and advances the cursor through hidden rows', async () => {
    const id = await start();
    await h.prisma.recordRule.create({data:{name:'Deny list',modelName:'entity_1',action:'write',groups:'[2]',domain:'{"name":"Denied"}'}});
    const response = await http('get', '?limit=1');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({items:[],nextCursor:id});
    expect((await http('get', `?limit=1&before=${id}`)).body.data).toEqual({items:[],nextCursor:null});
    for (const query of ['?limit=0','?limit=101','?before=-1','?before=abc','?view=all']) {
      expect((await http('get', query)).status).toBe(400);
    }
    await h.prisma.rolePermission.deleteMany({where:{roleId:2}});
    expect((await http('get')).status).toBe(403);
  });

  it('creates, reads and completes a request with assigned actors', async () => {
    const id = await start();
    const read = await http('get','/' + id);
    expect(read.status).toBe(200);
    expect(read.body.data).toMatchObject({id,companyId:1,initiatedBy:1,status:'pending',currentStep:0});
    expect((await http('post','/' + id + '/approve').send({stepIndex:0})).status).toBe(200);
    expect((await http('post','/' + id + '/approve',h.token()).send({stepIndex:1})).status).toBe(200);
    expect((await saved(id)).status).toBe('completed');
    const final = await http('get','/' + id);
    expect(final.body.data.stepsData.map(step=>step.actedBy)).toEqual([2,1]);
  });

  it('allows a permitted member to initiate without chain-management permission', async () => {
    const response = await http('post').send(payload());
    expect(response.status).toBe(201); expect(response.body.data.initiatedBy).toBe(2);
  });

  it('persists rejection and rejects replayed decisions', async () => {
    const id = await start();
    const path = '/' + id + '/reject';
    expect((await http('post',path).send({stepIndex:0,reason:'  Needs changes  '})).status).toBe(200);
    const read = await http('get','/' + id);
    expect(read.body.data).toMatchObject({status:'rejected',stepsData:[{reason:'Needs changes',actedBy:2},{status:'pending'}]});
    expect((await http('post',path).send({stepIndex:0,reason:'Again'})).status).toBe(409);
  });

  it('requires JWT authentication on every endpoint', async () => {
    const id = await start();
    for (const [method,path,body] of [
      ['post','',payload()], ['get','/' + id,undefined],
      ['post','/' + id + '/approve',{stepIndex:0}],
      ['post','/' + id + '/reject',{stepIndex:0,reason:'No'}],
    ] as const) {
      const req = http(method,path,null);
      expect((await (body ? req.send(body) : req)).status).toBe(401);
    }
  });

  it('requires route permission even when the actor is assigned', async () => {
    const id = await start();
    await h.prisma.rolePermission.deleteMany({where:{roleId:2}});
    expect((await http('get','/' + id)).status).toBe(403);
    expect((await http('post','/' + id + '/approve').send({stepIndex:0})).status).toBe(403);
    expect((await saved(id)).currentStep).toBe(0);
  });

  it('does not let administrator route bypass approve someone else’s step', async () => {
    const id = await start();
    expect((await http('post','/' + id + '/approve',h.token()).send({stepIndex:0})).status).toBe(403);
    expect((await saved(id)).currentStep).toBe(0);
  });

  it('rejects missing tenant claims and unauthorized header overrides', async () => {
    expect((await http('post','',h.token('member',null)).send(payload())).status).toBe(403);
    expect((await http('post').set('x-org-id','2').send(payload())).status).toBe(403);
    expect(await h.prisma.automation_approval_requests.count()).toBe(0);
  });

  it('does not expose or mutate a request from a different tenant', async () => {
    const id = await start();
    const foreign = h.token('member',2);
    expect((await http('get','/' + id,foreign)).status).toBe(404);
    expect((await http('post','/' + id + '/approve',foreign).send({stepIndex:0})).status).toBe(404);
    expect((await http('post','',foreign).send(payload())).status).toBe(404);
    expect((await saved(id)).currentStep).toBe(0);
  });

  it.each([
    {companyId:2}, {userId:1}, {initiatedBy:3}, {status:'completed'}, {currentStep:9}, {stepsData:[]},
  ])('rejects caller-controlled identity or lifecycle fields: %j', async extra => {
    expect((await http('post').send({...payload(),...extra})).status).toBe(400);
    expect(await h.prisma.automation_approval_requests.count()).toBe(0);
  });

  it.each([{}, {chainId:'1',recordEntityId:1,recordId:1}, {chainId:1,recordEntityId:0,recordId:1}, {chainId:1,recordEntityId:1,recordId:1.5}])('rejects invalid creation input %j', async body => {
    expect((await http('post').send(body)).status).toBe(400);
  });

  it('validates IDs, required step indices and rejection reasons without mutation', async () => {
    const id = await start();
    for (const invalid of ['abc','1junk','0','9007199254740992']) expect((await http('get','/' + invalid)).status).toBe(400);
    for (const body of [{},{stepIndex:-1},{stepIndex:'0'},{stepIndex:0,approvedBy:1}]) {
      expect((await http('post','/' + id + '/approve').send(body)).status).toBe(400);
    }
    for (const body of [{stepIndex:0},{stepIndex:0,reason:' '},{stepIndex:0,reason:'x'.repeat(2001)}]) {
      expect((await http('post','/' + id + '/reject').send(body)).status).toBe(400);
    }
    expect((await saved(id)).currentStep).toBe(0);
  });

  it('enforces participation and record rules after route permission', async () => {
    const permission = await h.prisma.permission.findUnique({where:{name:'base_automation.approvals'}});
    await h.prisma.rolePermission.create({data:{roleId:3,permissionId:permission.id}});
    const id = await start();
    expect((await http('get','/' + id,h.token('none'))).status).toBe(403);
    await h.prisma.recordRule.create({data:{name:'Deny',modelName:'entity_1',action:'write',groups:'[2]',domain:'{"name":"Denied"}'}});
    expect((await http('post','/' + id + '/approve').send({stepIndex:0})).status).toBe(403);
    expect((await saved(id)).currentStep).toBe(0);
  });

  it('returns conflict for out-of-order and concurrent decisions', async () => {
    const id = await start();
    expect((await http('post','/' + id + '/approve',h.token()).send({stepIndex:1})).status).toBe(409);
    const responses = await Promise.all([
      http('post','/' + id + '/approve').send({stepIndex:0}),
      http('post','/' + id + '/reject').send({stepIndex:0,reason:'No'}),
    ]);
    expect(responses.map(r=>r.status).sort()).toEqual([200,409]);
  });

  it('returns one creation and one conflict for simultaneous duplicate requests', async () => {
    const responses = await Promise.all([http('post').send(payload()),http('post').send(payload())]);
    expect(responses.map(r=>r.status).sort()).toEqual([201,409]);
    expect(await h.prisma.automation_approval_requests.count()).toBe(1);
  });
});
