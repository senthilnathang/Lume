import { jest } from '@jest/globals';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { readFileSync } from 'node:fs';
import { createHarness, type Harness } from './harness';
import { RecordCreatedEvent, RecordUpdatedEvent } from '../../../src/modules/base/events/record.events';
import { RecordService } from '../../../src/modules/base/services/record.service';
import { ApprovalChainEngineService } from '../../../src/modules/base_automation/services/approval-chain-engine.service';
import { ApprovalTriggerService } from '../../../src/modules/base_automation/services/approval-trigger.service';
import { AutomationService } from '../../../src/modules/base_automation/services/automation.service';
import { DrizzleService } from '../../../src/core/services/drizzle.service';

jest.setTimeout(120000);
describe('Automatic approval triggers (real MySQL and Nest events)', () => {
  let h: Harness;
  let events: EventEmitter2;
  let config: AutomationService;
  beforeAll(async () => {
    h = await createHarness({approvals:true});
    events = h.app.get(EventEmitter2);
    config = new AutomationService(h.app.get(DrizzleService));
    // Exercise deployable DDL only in the disposable test database.
    await h.prisma.$executeRawUnsafe('ALTER TABLE automation_approval_chains DROP COLUMN trigger_event');
    await h.prisma.$executeRawUnsafe(readFileSync('migrations/012_add_approval_trigger.sql','utf8'));
  });
  afterAll(async () => { await h?.close(); });
  beforeEach(async () => {
    await h.prisma.automation_approval_requests.deleteMany();
    await h.prisma.automation_approval_chains.deleteMany();
    await h.prisma.recordRule.deleteMany();
    await h.seed();
    await h.prisma.entityRecord.updateMany({data:{visibility:'public'}});
    jest.spyOn(Logger.prototype,'error').mockImplementation(()=>{});
  });
  afterEach(() => jest.restoreAllMocks());
  const chain = (extra = {}) => h.prisma.automation_approval_chains.create({data:{
    name:'Review',model:'entity_1',steps:'[{"approverId":1}]',condition:'{}',trigger_event:'record.created',...extra,
  }});
  const event = async (id = 1, actor = 2) => {
    const row = await h.prisma.entityRecord.findUnique({where:{id}});
    return new RecordCreatedEvent(row.entityId,{...row,data:JSON.parse(row.data)},actor);
  };
  const fire = async (kind = 'record.created', id = 1) => events.emitAsync(kind,await event(id));
  const count = () => h.prisma.automation_approval_requests.count();

  it('does not automatically start approvals for an actor denied private-record access', async () => {
    await chain();
    await h.prisma.entityRecord.update({where:{id:1},data:{visibility:'private'}});
    await fire();
    expect(await count()).toBe(0);
    await h.prisma.entityRecord.update({where:{id:1},data:{createdBy:2}});
    await fire();
    expect(await count()).toBe(1);
  });

  it('keeps existing/default chains manual and supports explicit opt-in through configuration', async () => {
    const created = await config.createApprovalChain({name:'Manual',model:'entity_1',steps:[{approverId:1}]});
    expect(created.success).toBe(true); expect(created.data.id).toEqual(expect.any(Number));
    expect(created.data.triggerEvent).toBe('manual');
    await fire(); expect(await count()).toBe(0);
    await config.updateApprovalChain(created.data.id,{triggerEvent:'record.created'});
    await fire(); expect(await count()).toBe(1);
  });

  it('rejects unsupported trigger configuration and combines model/status filters', async () => {
    await expect(config.createApprovalChain({name:'Bad',model:'entity_1',triggerEvent:'typo' as any})).rejects.toThrow();
    const good = await chain();
    await expect(config.updateApprovalChain(good.id,{triggerEvent:null} as any)).rejects.toThrow();
    await chain({status:'inactive'}); await chain({model:'entity_2'});
    const list = await config.getApprovalChains({status:'active',model:'entity_1'});
    expect(list.data.map(row=>row.id)).toEqual([good.id]);
  });

  it.each(['record.created','record.updated','record.saved'])('honors configured trigger %s', async trigger_event => {
    await chain({trigger_event});
    await fire('record.created');
    expect(await count()).toBe(trigger_event === 'record.updated' ? 0 : 1);
    await fire('record.updated',2);
    expect(await count()).toBe(trigger_event === 'record.saved' ? 2 : 1);
  });

  it('uses the real post-commit create event', async () => {
    await chain();
    const handler = jest.spyOn(h.app.get(ApprovalTriggerService),'handleRecordCreated');
    const record = await h.app.get(RecordService).createRecord(1,{name:'Created'},1,2);
    expect(handler).toHaveBeenCalledTimes(1);
    await handler.mock.results[0].value;
    const saved = await h.prisma.automation_approval_requests.findFirst();
    expect(saved).toMatchObject({recordId:record.id,companyId:1,initiatedBy:2,status:'pending'});
  });

  it('uses the real update event and persisted merged data', async () => {
    await chain({trigger_event:'record.updated',condition:'{"status":"ready","name":"Record 1"}'});
    const handler = jest.spyOn(h.app.get(ApprovalTriggerService),'handleRecordUpdated');
    await h.app.get(RecordService).updateRecord(1,{status:'ready'},1,2);
    expect(handler).toHaveBeenCalledTimes(1);
    await handler.mock.results[0].value;
    expect(await count()).toBe(1);
  });

  it('ignores forged payload data and evaluates the latest persisted conditions', async () => {
    await chain({condition:'{"amount":{"$gte":10,"$lte":20}}'});
    const stale = await event();
    stale.record.data.amount = 15;
    await events.emitAsync('record.created',stale); expect(await count()).toBe(0);
    await h.prisma.entityRecord.update({where:{id:1},data:{data:'{"name":"Record 1","amount":15}'}});
    stale.record.data.amount = 999;
    await events.emitAsync('record.created',stale); expect(await count()).toBe(1);
  });

  it('deduplicates concurrent deliveries while a request is pending', async () => {
    await chain({trigger_event:'record.saved'});
    await Promise.all([fire(),fire(),fire('record.updated')]);
    expect(await count()).toBe(1);
  });

  it('allows a new matching update after the prior request completes', async () => {
    await chain({trigger_event:'record.saved'});
    await fire();
    const request = await h.prisma.automation_approval_requests.findFirst();
    await h.app.get(ApprovalChainEngineService).approveStep(request.id,0,{companyId:1,userId:1});
    await fire('record.updated');
    expect(await count()).toBe(2);
    expect(await h.prisma.automation_approval_requests.count({where:{status:'pending'}})).toBe(1);
  });

  it('ignores inactive and unrelated chains', async () => {
    await chain({status:'inactive'}); await chain({model:'entity_2'});
    await fire(); expect(await count()).toBe(0);
  });

  it('continues to later chains when one configuration fails', async () => {
    await chain({steps:'[]'});
    const valid = await chain();
    await fire();
    expect(await count()).toBe(1);
    expect((await h.prisma.automation_approval_requests.findFirst()).chainId).toBe(valid.id);
    expect(Logger.prototype.error).toHaveBeenCalled();
  });

  it.each(['read','write'])('enforces actor record %s rules', async action => {
    await chain();
    await h.prisma.recordRule.create({data:{name:'Deny',modelName:'entity_1',action,groups:'[2]',domain:'{"name":"Denied"}'}});
    await fire(); expect(await count()).toBe(0);
  });

  it('rejects malformed identity, forged tenant/entity and deleted record events', async () => {
    await chain();
    for (const change of [{userId:0},{entityId:2},{record:{id:1,entityId:1,companyId:2}},{record:{id:999,entityId:1,companyId:1}}]) {
      await events.emitAsync('record.created',Object.assign(await event(),change));
    }
    const deleted = await event();
    await h.prisma.entityRecord.update({where:{id:1},data:{deletedAt:new Date()}});
    await events.emitAsync('record.created',deleted);
    expect(await count()).toBe(0);
  });

  it('rechecks active actor and chain configuration inside the transaction', async () => {
    const configured = await chain();
    await h.prisma.user.update({where:{id:2},data:{isActive:false}});
    await fire(); expect(await count()).toBe(0);
    await h.prisma.user.update({where:{id:2},data:{isActive:true}});
    await h.prisma.automation_approval_chains.update({where:{id:configured.id},data:{trigger_event:'manual'}});
    expect(await h.app.get(ApprovalChainEngineService).startAutomatically({chainId:configured.id,recordEntityId:1,recordId:1},{companyId:1,userId:2},'record.created')).toBeNull();
    expect(await count()).toBe(0);
  });
});
