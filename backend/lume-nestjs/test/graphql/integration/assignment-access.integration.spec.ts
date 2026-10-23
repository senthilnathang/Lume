import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHarness, type Harness } from './harness';
import { AssignmentRuleEngineService } from '../../../src/modules/base_automation/services/assignment-rule-engine.service';
import { RecordService } from '../../../src/modules/base/services/record.service';
import { RecordCreatedEvent } from '../../../src/modules/base/events/record.events';

jest.setTimeout(120000);
describe('Assignment automation (real MySQL)', () => {
  let h: Harness;
  let engine: AssignmentRuleEngineService;
  beforeAll(async () => { h = await createHarness(); engine = new AssignmentRuleEngineService(h.prisma,h.app.get(RecordService)); });
  afterAll(async () => { await h?.close(); });
  beforeEach(async () => {
    await h.prisma.automation_assignment_rules.deleteMany();
    await h.prisma.recordRule.deleteMany();
    await h.seed();
    for (const id of [4,5]) await h.prisma.user.create({data:{id,role_id:2,email:`assignee${id}@test.local`,password:'test',firstName:'Assignee',lastName:String(id),isActive:id===4}});
    jest.spyOn(console,'error').mockImplementation(()=>{});
  });
  afterEach(()=>jest.restoreAllMocks());
  const add = (extra = {}) => h.prisma.automation_assignment_rules.create({data:{name:'Assignment',model:'entity_1',assign_to:'user',assignee_id:4,condition:'{}',...extra}});
  const event = async (id = 1) => {
    const record = await h.prisma.entityRecord.findUnique({where:{id}});
    return new RecordCreatedEvent(record.entityId,{...record,data:JSON.parse(record.data)},2);
  };
  const assigned = async (id = 1) => JSON.parse((await h.prisma.entityRecord.findUnique({where:{id}})).data).assignedTo;

  it('applies the cursor migration to an existing rule with a safe initial default', async () => {
    await add();
    await h.prisma.$executeRawUnsafe('ALTER TABLE automation_assignment_rules DROP COLUMN last_assigned_index');
    const sql = readFileSync(resolve('migrations/010_add_assignment_round_robin_cursor.sql'),'utf8');
    await h.prisma.$executeRawUnsafe(sql);
    expect((await h.prisma.automation_assignment_rules.findFirst()).last_assigned_index).toBe(-1);
  });

  it('assigns an active user from parsed persisted data and emits no recursive event', async () => {
    await add({condition:'{"name":"Record 1"}'});
    const emit = jest.spyOn(h.app.get(EventEmitter2),'emit');
    await engine.handleRecordCreated(await event());
    expect(await assigned()).toBe(4);
    expect(emit).not.toHaveBeenCalledWith('record.updated',expect.anything());
  });

  it('selects the first active role member in stable ID order', async () => {
    await add({assign_to:'role',assignee_id:2});
    await engine.handleRecordCreated(await event());
    expect(await assigned()).toBe(2);
  });

  it('rotates round-robin assignments across active users and persists the cursor', async () => {
    const rule = await add({assign_to:'round_robin',assignee_id:2});
    for (const id of [1,2,3]) await engine.handleRecordCreated(await event(id));
    expect(await Promise.all([1,2,3].map(id=>assigned(id)))).toEqual([2,4,2]);
    expect((await h.prisma.automation_assignment_rules.findUnique({where:{id:rule.id}})).last_assigned_index).toBe(0);
  });

  it('serializes concurrent round-robin assignments', async () => {
    const rule = await add({assign_to:'round_robin',assignee_id:2});
    const events = await Promise.all([1,2].map(id=>event(id)));
    await Promise.all(events.map(e=>engine.handleRecordCreated(e)));
    expect((await Promise.all([1,2].map(id=>assigned(id)))).sort()).toEqual([2,4]);
    expect((await h.prisma.automation_assignment_rules.findUnique({where:{id:rule.id}})).last_assigned_index).toBe(1);
  });

  it('uses persisted conditions, all operators, and priority zero', async () => {
    await add({condition:'{"name":"Stale"}',priority:0});
    await add({condition:'{"name":{"$eq":"Record 1","$ne":"Record 1"}}',priority:1});
    await add({assignee_id:2,priority:2});
    const e = await event(); e.record.data.name='Stale';
    await engine.handleRecordCreated(e);
    expect(await assigned()).toBe(2);
    await h.prisma.automation_assignment_rules.deleteMany();
    await add({priority:10,assignee_id:2});
    await add({priority:0,assignee_id:4});
    await engine.handleRecordCreated(await event(2));
    expect(await assigned(2)).toBe(4);
  });

  it.each(['read','write'])('enforces actor %s rules without advancing the cursor', async action => {
    const rule = await add({assign_to:'round_robin',assignee_id:2});
    await h.prisma.recordRule.create({data:{name:'Deny',modelName:'entity_1',action,groups:'[2]',domain:'{"name":"Denied"}'}});
    await engine.handleRecordCreated(await event());
    expect(await assigned()).toBeUndefined();
    expect((await h.prisma.automation_assignment_rules.findUnique({where:{id:rule.id}})).last_assigned_index).toBe(-1);
  });

  it('rolls back record assignment if cursor persistence fails', async () => {
    const rule = await add({assign_to:'round_robin',assignee_id:2});
    let fail = true;
    h.prisma.$use(async (params: any,next: any)=>{
      if (fail && params.model==='automation_assignment_rules' && params.action==='update') throw new Error('Simulated cursor failure');
      return next(params);
    });
    try {
      await engine.handleRecordCreated(await event());
      expect(await assigned()).toBeUndefined();
      expect((await h.prisma.automation_assignment_rules.findUnique({where:{id:rule.id}})).last_assigned_index).toBe(-1);
    } finally { fail=false; }
  });

  it.each([{assignee_id:999999},{assignee_id:5},{assign_to:'group',assignee_id:2},{condition:'[]'}])('rejects invalid or unsupported assignment configuration: %s',async config=>{
    await add(config);
    await engine.handleRecordCreated(await event());
    expect(await assigned()).toBeUndefined();
  });

  it('excludes inactive roles even when users remain active', async()=>{
    await add();
    await h.prisma.role.update({where:{id:2},data:{isActive:false}});
    await engine.handleRecordCreated(await event());
    expect(await assigned()).toBeUndefined();
  });

  it('rejects wrong-entity, wrong-tenant, missing-actor and deleted-record events', async()=>{
    await add();
    const e = await event();
    for (const invalid of [new RecordCreatedEvent(2,e.record,2),new RecordCreatedEvent(1,{...e.record,companyId:2},2),new RecordCreatedEvent(1,e.record,0),new RecordCreatedEvent(1,e.record,999999)]) await engine.handleRecordCreated(invalid);
    expect(await assigned()).toBeUndefined();
    await h.prisma.entityRecord.update({where:{id:1},data:{deletedAt:new Date()}});
    await engine.handleRecordCreated(e);
    expect(await assigned()).toBeUndefined();
  });
});
