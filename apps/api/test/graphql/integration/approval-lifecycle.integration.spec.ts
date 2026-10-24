import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createHarness, type Harness } from './harness';
import { ApprovalChainEngineService } from '../../../src/modules/base_automation/services/approval-chain-engine.service';

jest.setTimeout(120000);
describe('Approval lifecycle (real MySQL)', () => {
  let h: Harness;
  let engine: ApprovalChainEngineService;
  let chain: number;
  const admin = {companyId:1,userId:1};
  const member = {companyId:1,userId:2};
  beforeAll(async () => {
    h = await createHarness();
    // Verify the deployable DDL, exclusively in this harness's disposable database.
    await h.prisma.$executeRawUnsafe('DROP TABLE automation_approval_requests');
    await h.prisma.$executeRawUnsafe(readFileSync('migrations/011_add_approval_requests.sql','utf8'));
    await h.prisma.$executeRawUnsafe("ALTER TABLE automation_approval_requests ADD COLUMN workflow_data VARCHAR(500) NOT NULL DEFAULT '{}'");
    engine = new ApprovalChainEngineService(h.prisma);
  });
  afterAll(async () => { await h?.close(); });
  beforeEach(async () => {
    await h.prisma.automation_approval_requests.deleteMany();
    await h.prisma.automation_approval_chains.deleteMany();
    await h.prisma.recordRule.deleteMany();
    await h.seed();
    chain = (await h.prisma.automation_approval_chains.create({data:{
      name:'Review',model:'entity_1',steps:JSON.stringify([{name:'Review',approverId:2},{name:'Final',roleId:1}]),condition:'{}',
    }})).id;
  });
  afterEach(() => jest.restoreAllMocks());
  const start = (extra = {}, context = admin) => engine.createApprovalRequest({chainId:chain,recordEntityId:1,recordId:1,...extra},context);
  const read = (id: number) => engine.getApprovalRequest(id,admin);

  it('persists requests separately and completes ordered steps with actor and time history', async () => {
    const request = await start();
    expect(request).toMatchObject({status:'pending',currentStep:0,initiatedBy:1,companyId:1,completedAt:null});
    expect(await h.prisma.automation_approval_chains.count()).toBe(1);
    expect((await new ApprovalChainEngineService(h.prisma).getApprovalRequest(request.id,member)).id).toBe(request.id);
    expect(await engine.approveStep(request.id,0,member)).toBe(true);
    expect(await read(request.id)).toMatchObject({status:'pending',currentStep:1,completedAt:null});
    expect(await engine.approveStep(request.id,1,admin)).toBe(true);
    const completed = await read(request.id);
    expect(completed.status).toBe('completed'); expect(completed.completedAt).toBeInstanceOf(Date);
    expect(completed.stepsData.map(step=>step.actedBy)).toEqual([2,1]);
    expect(completed.stepsData.every(step=>step.status==='approved' && Number.isFinite(Date.parse(step.actedAt)))).toBe(true);
    await expect(engine.approveStep(request.id,1,admin)).rejects.toThrow();
  });

  it('records rejection reasons and prohibits further transitions', async () => {
    const request = await start();
    await engine.rejectApproval(request.id,0,'  Needs revision  ',member);
    const rejected = await read(request.id);
    expect(rejected.status).toBe('rejected'); expect(rejected.completedAt).toBeInstanceOf(Date);
    expect(rejected.stepsData[0]).toMatchObject({status:'rejected',reason:'Needs revision',actedBy:2});
    await expect(engine.approveStep(request.id,0,member)).rejects.toThrow();
    expect((await start()).id).not.toBe(request.id);
  });

  it('snapshots step configuration and ignores forged lifecycle fields', async () => {
    const request = await start({currentStep:9,status:'completed',initiatedBy:3,stepsData:[{approverId:3,status:'approved'}]} as any);
    await h.prisma.automation_approval_chains.update({where:{id:chain},data:{steps:'[{"approverId":3}]'}});
    expect(request).toMatchObject({currentStep:0,status:'pending',initiatedBy:1});
    await engine.approveStep(request.id,0,member);
    await engine.approveStep(request.id,1,admin);
    expect((await read(request.id)).status).toBe('completed');
  });

  it('allows exactly one concurrent start', async () => {
    const results = await Promise.allSettled([start(),start(),start()]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(await h.prisma.automation_approval_requests.count()).toBe(1);
  });

  it('allows exactly one approval of a step under concurrency', async () => {
    const request = await start();
    const results = await Promise.allSettled([engine.approveStep(request.id,0,member),engine.approveStep(request.id,0,member)]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect((await read(request.id)).currentStep).toBe(1);
  });

  it('allows one winner between approve and reject', async () => {
    const request = await start();
    const results = await Promise.allSettled([engine.approveStep(request.id,0,member),engine.rejectApproval(request.id,0,'No',member)]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    const saved = await read(request.id);
    expect(saved.stepsData[0].actedBy).toBe(2);
    expect(saved.stepsData[0].status).not.toBe('pending');
  });

  it('rejects skipped steps, unassigned actors and stale rejection indices', async () => {
    const request = await start();
    await expect(engine.approveStep(request.id,1,admin)).rejects.toThrow();
    await expect(engine.approveStep(request.id,0,admin)).rejects.toThrow('not assigned');
    await engine.approveStep(request.id,0,member);
    await expect(engine.rejectApproval(request.id,0,'Stale',admin)).rejects.toThrow();
    expect((await read(request.id)).status).toBe('pending');
  });

  it('requires tenant scope and restricts reads to participants', async () => {
    const request = await start();
    await expect(engine.getApprovalRequest(request.id,{companyId:2,userId:1})).rejects.toThrow();
    await expect(engine.getApprovalRequest(request.id,{companyId:1,userId:3})).rejects.toThrow('participant');
    await expect(engine.approveStep(request.id,0,{companyId:2,userId:2})).rejects.toThrow();
    await expect(engine.getApprovalRequest(request.id,undefined as any)).rejects.toThrow();
    await expect(start({recordId:4})).rejects.toThrow();
  });

  it.each(['read','write'])('enforces current record %s rules on transitions', async action => {
    const request = await start();
    await h.prisma.recordRule.create({data:{name:'Deny',modelName:'entity_1',action,groups:'[2]',domain:'{"name":"Denied"}'}});
    await expect(engine.approveStep(request.id,0,member)).rejects.toThrow('access denied');
    expect((await read(request.id)).currentStep).toBe(0);
  });

  it('enforces record rules on creation', async () => {
    await h.prisma.recordRule.create({data:{name:'Deny',modelName:'entity_1',action:'write',domain:'{"name":"Denied"}'}});
    await expect(start()).rejects.toThrow('access denied');
    expect(await h.prisma.automation_approval_requests.count()).toBe(0);
  });

  it('checks active actors and their current persisted roles', async () => {
    const request = await start();
    await h.prisma.user.update({where:{id:2},data:{isActive:false}});
    await expect(engine.approveStep(request.id,0,member)).rejects.toThrow('Active actor');
    await h.prisma.user.update({where:{id:2},data:{isActive:true}});
    await engine.approveStep(request.id,0,member);
    await h.prisma.user.update({where:{id:1},data:{role_id:3}});
    await expect(engine.approveStep(request.id,1,admin)).rejects.toThrow('not assigned');
  });

  it.each(['[]','{','[{}]','[{"approverId":999}]','[{"roleId":999}]','[{"approverId":2,"roleId":1}]'])('rejects invalid chain steps %s', async steps => {
    await h.prisma.automation_approval_chains.update({where:{id:chain},data:{steps}});
    await expect(start()).rejects.toThrow();
    expect(await h.prisma.automation_approval_requests.count()).toBe(0);
  });

  it('evaluates all condition operators against persisted record data', async () => {
    await h.prisma.automation_approval_chains.update({where:{id:chain},data:{condition:'{"amount":{"$gte":10,"$lte":20,"$nin":[15]}}'}});
    await h.prisma.entityRecord.update({where:{id:1},data:{data:'{"name":"Record 1","amount":30}'}});
    await expect(start({data:{amount:10}} as any)).rejects.toThrow('condition');
    await h.prisma.entityRecord.update({where:{id:1},data:{data:'{"name":"Record 1","amount":10}'}});
    await expect(start()).resolves.toBeTruthy();
  });

  it('fails closed for malformed conditions and inactive chains', async () => {
    await h.prisma.automation_approval_chains.update({where:{id:chain},data:{condition:'{"name":"Mismatch","other":{"$unknown":1}}'}});
    await expect(start()).rejects.toThrow('Unsupported');
    await h.prisma.automation_approval_chains.update({where:{id:chain},data:{condition:'{}',status:'inactive'}});
    await expect(start()).rejects.toThrow();
    expect(await engine.evaluateApprovalCondition(chain,{})).toBe(false);
  });

  it('rejects wrong models and deleted records', async () => {
    await expect(start({recordEntityId:2})).rejects.toThrow();
    await h.prisma.automation_approval_chains.update({where:{id:chain},data:{model:'entity_2'}});
    await expect(start()).rejects.toThrow('model');
    await h.prisma.automation_approval_chains.update({where:{id:chain},data:{model:'entity_1'}});
    const request = await start();
    await h.prisma.entityRecord.update({where:{id:1},data:{deletedAt:new Date()}});
    await expect(engine.approveStep(request.id,0,member)).rejects.toThrow('record not found');
  });

  it('does not advance a paused chain or accept empty rejection reasons', async () => {
    const request = await start();
    await expect(engine.rejectApproval(request.id,0,' ',member)).rejects.toThrow();
    await h.prisma.automation_approval_chains.update({where:{id:chain},data:{status:'inactive'}});
    await expect(engine.approveStep(request.id,0,member)).rejects.toThrow('inactive');
    expect((await read(request.id)).currentStep).toBe(0);
  });

  it('preserves request state and propagates a failed transition write', async () => {
    const request = await start();
    let fail = true;
    h.prisma.$use(async (params: any, next: any) => {
      if (fail && params.model === 'automation_approval_requests' && params.action === 'updateMany') throw new Error('write failed');
      return next(params);
    });
    try {
      await expect(engine.approveStep(request.id,0,member)).rejects.toThrow('write failed');
      const saved = await read(request.id);
      expect(saved.currentStep).toBe(0); expect(saved.stepsData[0].status).toBe('pending');
      expect(saved.stepsData[0].actedBy).toBeUndefined();
    } finally { fail = false; }
  });
});
