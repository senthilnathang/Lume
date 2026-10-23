import { jest } from '@jest/globals';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { createHarness, type Harness } from './harness';
import { ApprovalChainEngineService } from '../../../src/modules/base_automation/services/approval-chain-engine.service';

jest.setTimeout(120000);
describe('Approval notifications and scoped inbox (real MySQL and HTTP)', () => {
  let h: Harness;
  let engine: ApprovalChainEngineService;
  let chain: number;
  const admin = {companyId:1,userId:1}, member = {companyId:1,userId:2};
  beforeAll(async () => {
    h = await createHarness();
    engine = h.app.get(ApprovalChainEngineService);
    // Verify migration DDL only in the disposable harness database.
    await h.prisma.$executeRawUnsafe('ALTER TABLE notifications DROP INDEX notification_event_recipient, DROP INDEX notification_inbox_scope, DROP COLUMN company_id, DROP COLUMN event_key');
    await h.prisma.$executeRawUnsafe(readFileSync('migrations/013_scope_approval_notifications.sql','utf8'));
  });
  afterAll(async () => { await h?.close(); });
  beforeEach(async () => {
    await h.prisma.notifications.deleteMany();
    await h.prisma.automation_approval_requests.deleteMany();
    await h.prisma.automation_approval_chains.deleteMany();
    await h.prisma.recordRule.deleteMany();
    await h.seed();
    chain = (await h.prisma.automation_approval_chains.create({data:{name:'Review',model:'entity_1',steps:'[{"approverId":2},{"roleId":1}]',condition:'{}'}})).id;
  });
  const start = () => engine.createApprovalRequest({chainId:chain,recordEntityId:1,recordId:1},admin);
  const notes = () => h.prisma.notifications.findMany({orderBy:{id:'asc'}});
  const http = (method: string, path = '', bearer = h.token('member')) => request(h.app.getHttpServer())[method]('/api/advanced-features/notifications' + path).auth(bearer,{type:'bearer'});

  it('notifies the first approver, next role and initiator on completion', async () => {
    const approval = await start();
    expect(await notes()).toEqual([expect.objectContaining({user_id:2,company_id:1,type:'action',related_model:'approval_request',related_id:approval.id,status:'unread'})]);
    await engine.approveStep(approval.id,0,member);
    expect((await notes()).map(n=>n.user_id)).toEqual([2,1]);
    await engine.approveStep(approval.id,1,admin);
    const saved = await notes();
    expect(saved.map(n=>n.type)).toEqual(['action','action','success']);
    expect(saved[2].user_id).toBe(1);
    expect(new Set(saved.map(n=>n.event_key)).size).toBe(3);
    expect((await http('get')).body.data.map(n=>n.relatedId)).toEqual([approval.id]);
  });

  it('notifies the initiator on rejection without exposing the rejection reason in the inbox', async () => {
    const approval = await start();
    await engine.rejectApproval(approval.id,0,'Confidential reasoning',member);
    const saved = await notes();
    expect(saved).toHaveLength(2);
    expect(saved[1]).toMatchObject({user_id:1,company_id:1,type:'warning',title:'Approval rejected'});
    expect(saved[1].message).not.toContain('Confidential');
  });

  it('notifies only active users in the assigned role', async () => {
    await h.prisma.automation_approval_chains.update({where:{id:chain},data:{steps:'[{"roleId":2}]'}});
    await h.prisma.user.create({data:{id:4,firstName:'Second',lastName:'Approver',email:'second@test.local',password:'test',role_id:2,isActive:true}});
    await h.prisma.user.create({data:{id:5,firstName:'Inactive',lastName:'Approver',email:'inactive@test.local',password:'test',role_id:2,isActive:false}});
    await start();
    expect((await notes()).map(n=>n.user_id).sort()).toEqual([2,4]);
  });

  it.each(['read','write'])('skips recipients denied by %s record rules', async action => {
    await h.prisma.recordRule.create({data:{name:'Deny',modelName:'entity_1',action,groups:'[2]',domain:'{"name":"Denied"}'}});
    const approval = await start();
    expect(approval.status).toBe('pending'); expect(await notes()).toHaveLength(0);
  });

  it('skips an initiator who no longer has read access at completion', async () => {
    await h.prisma.automation_approval_chains.update({where:{id:chain},data:{steps:'[{"approverId":2}]'}});
    const approval = await start();
    await h.prisma.recordRule.create({data:{name:'Deny owner',modelName:'entity_1',action:'read',users:'[1]',domain:'{"name":"Denied"}'}});
    await engine.approveStep(approval.id,0,member);
    expect((await notes()).map(n=>n.user_id)).toEqual([2]);
  });

  it('does not duplicate messages for competing starts or decisions', async () => {
    const starts = await Promise.allSettled([start(),start()]);
    expect(starts.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(await notes()).toHaveLength(1);
    const approval = await h.prisma.automation_approval_requests.findFirst();
    await Promise.allSettled([engine.approveStep(approval.id,0,member),engine.approveStep(approval.id,0,member)]);
    expect(await notes()).toHaveLength(2);
    const first = (await notes())[0];
    await h.prisma.notifications.createMany({data:[{user_id:first.user_id,company_id:1,title:'Retry',event_key:first.event_key}],skipDuplicates:true});
    expect(await notes()).toHaveLength(2);
  });

  it.each(['start','transition'])('rolls back %s when notification persistence fails', async phase => {
    const approval = phase === 'transition' ? await start() : null;
    let fail = true;
    h.prisma.$use(async (params: any, next: any) => {
      if (fail && params.model === 'notifications' && params.action === 'createMany') throw new Error('notification write failed');
      return next(params);
    });
    try {
      await expect(approval ? engine.approveStep(approval.id,0,member) : start()).rejects.toThrow('notification write failed');
      if (approval) {
        const saved = await h.prisma.automation_approval_requests.findUnique({where:{id:approval.id}});
        expect(saved.currentStep).toBe(0); expect(JSON.parse(saved.stepsData)[0].status).toBe('pending');
        expect(await notes()).toHaveLength(1);
      } else {
        expect(await h.prisma.automation_approval_requests.count()).toBe(0); expect(await notes()).toHaveLength(0);
      }
    } finally { fail = false; }
  });

  async function seedInbox() {
    const rows = [];
    for (const [user_id,company_id,type] of [[2,1,'action'],[2,2,'action'],[1,1,'action'],[2,null,'info'],[2,1,'info']] as const) {
      rows.push(await h.prisma.notifications.create({data:{user_id,company_id,type,title:'Notice'}}));
    }
    return rows;
  }

  it('combines inbox filters without dropping owner or tenant scope', async () => {
    const rows = await seedInbox();
    const filtered = await http('get','?status=unread&type=action&userId=1&companyId=2');
    expect(filtered.status).toBe(200); expect(filtered.body.data.map(n=>n.id)).toEqual([rows[0].id]);
    const all = await http('get');
    expect(all.body.data.map(n=>n.id)).toEqual([rows[4].id,rows[3].id,rows[0].id]);
    expect((await http('get','/unread-count')).body.data.count).toBe(3);
  });

  it('scopes read, dismiss and read-all writes to the owner and tenant', async () => {
    const rows = await seedInbox();
    for (const row of [rows[1],rows[2]]) {
      expect((await http('post','/' + row.id + '/read')).status).toBe(404);
      expect((await http('post','/' + row.id + '/dismiss')).status).toBe(404);
    }
    expect((await http('post','/' + rows[0].id + '/read')).status).toBe(201);
    expect((await http('post','/' + rows[4].id + '/dismiss')).status).toBe(201);
    expect((await http('post','/read-all')).status).toBe(201);
    const persisted = await notes();
    expect(persisted.map(n=>n.status)).toEqual(['read','unread','unread','read','dismissed']);
  });

  it('rejects missing or overridden tenants, invalid filters and malformed IDs', async () => {
    expect((await http('get','',h.token('member',null))).status).toBe(403);
    expect((await http('get').set('x-org-id','2')).status).toBe(403);
    for (const query of ['?limit=0','?limit=101','?limit=NaN','?status=invalid','?type=invalid']) expect((await http('get',query)).status).toBe(400);
    expect((await http('post','/1junk/read')).status).toBe(400);
    expect((await request(h.app.getHttpServer()).get('/api/advanced-features/notifications')).status).toBe(401);
  });
});
