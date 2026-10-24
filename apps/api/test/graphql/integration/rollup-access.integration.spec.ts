import { jest } from '@jest/globals';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHarness, type Harness } from './harness';
import { RollupEngineService } from '../../../src/modules/base_automation/services/rollup-engine.service';
import { RecordService } from '../../../src/modules/base/services/record.service';
import { RecordCreatedEvent, RecordUpdatedEvent, RecordDeletedEvent } from '../../../src/modules/base/events/record.events';

jest.setTimeout(120000);
describe('Linked rollup aggregation (real MySQL)', () => {
  let h: Harness;
  let engine: RollupEngineService;
  let relation: number;
  beforeAll(async()=>{ h=await createHarness(); engine=new RollupEngineService(h.prisma,h.app.get(RecordService)); });
  afterAll(async()=>{await h?.close();});
  beforeEach(async()=>{
    await h.prisma.automation_rollup_fields.deleteMany();
    await h.prisma.recordRule.deleteMany();
    await h.prisma.entityRelationshipRecord.deleteMany();
    await h.prisma.entityRelationship.deleteMany();
    await h.seed();
    for (const id of [1,2,3,4]) await h.prisma.entityRecord.update({where:{id},data:{data:JSON.stringify({name:`Child ${id}`,amount:id===4 ? 999 : id*10})}});
    for (const id of [5,6,7]) await h.prisma.entityRecord.create({data:{id,entityId:2,companyId:id===7 ? 2 : 1,createdBy:1,data:JSON.stringify({name:`Parent ${id}`,amount:500,total:-1})}});
    relation=(await h.prisma.entityRelationship.create({data:{sourceEntityId:2,targetEntityId:1,type:'many_to_many',name:'children',label:'Children'}})).id;
    await h.prisma.entityRelationshipRecord.createMany({data:[[5,1],[5,2],[5,2],[5,4],[6,3],[7,4]].map(([sourceRecordId,targetRecordId])=>({relationshipId:relation,sourceRecordId,targetRecordId}))});
    jest.spyOn(console,'error').mockImplementation(()=>{});
  });
  afterEach(()=>jest.restoreAllMocks());
  const add=(extra={})=>h.prisma.automation_rollup_fields.create({data:{name:'Total',parent_model:'entity_2',child_model:'entity_1',rollup_field:'amount',target_field:'total',operation:'sum',filter_condition:'{}',...extra}});
  const event=async(id=1)=>{const row=await h.prisma.entityRecord.findUnique({where:{id}});return new RecordCreatedEvent(row.entityId,{...row,data:JSON.parse(row.data)},2);};
  const total=async(id=5)=>JSON.parse((await h.prisma.entityRecord.findUnique({where:{id}})).data).total;

  it.each([['sum',30],['count',2],['avg',15],['min',10],['max',20]])('computes %s only from linked, deduplicated children in the tenant',async(operation,expected)=>{
    await add({operation});
    await engine.handleRecordCreated(await event());
    expect(await total()).toBe(expected);
    expect(await total(6)).toBe(-1);
    expect(await total(7)).toBe(-1);
  });

  it('supports reversed relationship direction',async()=>{
    await h.prisma.entityRelationshipRecord.deleteMany();
    await h.prisma.entityRelationship.update({where:{id:relation},data:{sourceEntityId:1,targetEntityId:2}});
    await h.prisma.entityRelationshipRecord.createMany({data:[1,2].map(sourceRecordId=>({relationshipId:relation,sourceRecordId,targetRecordId:5}))});
    await add(); await engine.handleRecordCreated(await event());
    expect(await total()).toBe(30);
  });

  it('uses all filter operators and persisted values after an update',async()=>{
    await add({filter_condition:'{"amount":{"$gte":10,"$lte":15}}'});
    const e=await event(); e.record.data.amount=999;
    await engine.handleRecordUpdated(new RecordUpdatedEvent(e.entityId,e.record,{amount:0},e.userId));
    expect(await total()).toBe(10);
  });

  it('counts nonnumeric values while sum ignores blanks and invalid numbers',async()=>{
    await h.prisma.entityRecord.update({where:{id:1},data:{data:'{"name":"Text","amount":"hello"}'}});
    await h.prisma.entityRecord.update({where:{id:2},data:{data:'{"name":"Blank","amount":""}'}});
    const rule=await add({operation:'count'});
    await engine.handleRecordCreated(await event()); expect(await total()).toBe(2);
    await h.prisma.automation_rollup_fields.update({where:{id:rule.id},data:{operation:'sum'}});
    await engine.handleRecordCreated(await event()); expect(await total()).toBe(0);
  });

  it.each([true,false])('recomputes after deleting the final child (soft=%s)',async soft=>{
    await add();
    const service=h.app.get(RecordService);
    await service.deleteRecord(1,soft,1,2);
    const emit=jest.spyOn(h.app.get(EventEmitter2),'emit');
    await service.deleteRecord(2,soft,1,2);
    const deletion=emit.mock.calls.find(call=>call[0]==='record.deleted')![1] as RecordDeletedEvent;
    expect(deletion.companyId).toBe(1);
    await engine.handleRecordDeleted(deletion);
    expect(await total()).toBe(0);
    expect(await total(6)).toBe(-1);
    expect(await total(7)).toBe(-1);
  });

  it('returns null for empty numeric averages',async()=>{
    await add({operation:'avg'});
    await h.prisma.entityRecord.updateMany({where:{id:{in:[1,2]}},data:{deletedAt:new Date()}});
    await engine.handleRecordDeleted(new RecordDeletedEvent(1,1,2,1));
    expect(await total()).toBeNull();
  });

  it.each([['entity_1','read'],['entity_2','read'],['entity_2','write']])('honors %s %s policies without publishing partial totals',async(modelName,action)=>{
    await add();
    await h.prisma.recordRule.create({data:{name:'Deny',modelName,action,groups:'[2]',domain:'{"name":"Denied"}'}});
    await engine.handleRecordCreated(await event());
    expect(await total()).toBe(-1);
  });

  it('rolls back earlier parents when a later affected parent is denied',async()=>{
    await add();
    await h.prisma.entityRelationshipRecord.create({data:{relationshipId:relation,sourceRecordId:6,targetRecordId:1}});
    await h.prisma.recordRule.create({data:{name:'Deny second',modelName:'entity_2',action:'write',groups:'[2]',domain:'{"name":{"ne":"Parent 6"}}'}});
    await engine.handleRecordCreated(await event());
    expect(await total()).toBe(-1); expect(await total(6)).toBe(-1);
  });

  it('ignores wrong-entity, foreign-tenant, missing-actor and deleted-record create events',async()=>{
    await add(); const e=await event();
    for (const bad of [new RecordCreatedEvent(2,e.record,2),new RecordCreatedEvent(1,{...e.record,companyId:2},2),new RecordCreatedEvent(1,e.record,0),new RecordCreatedEvent(1,e.record,999999)]) await engine.handleRecordCreated(bad);
    await h.prisma.entityRecord.update({where:{id:1},data:{deletedAt:new Date()}});
    await engine.handleRecordCreated(e); expect(await total()).toBe(-1);
  });

  it('does not publish results from malformed filters or emit recursive updates',async()=>{
    const rule=await add({filter_condition:'[]'});
    await engine.handleRecordCreated(await event()); expect(await total()).toBe(-1);
    await h.prisma.automation_rollup_fields.update({where:{id:rule.id},data:{filter_condition:'{}'}});
    const emit=jest.spyOn(h.app.get(EventEmitter2),'emit');
    await engine.handleRecordCreated(await event()); expect(await total()).toBe(30);
    expect(emit).not.toHaveBeenCalledWith('record.updated',expect.anything());
  });

  it('rejects unsupported filter operators even when their field is absent',async()=>{
    await add({filter_condition:'{"missing":{"$unknown":1}}'});
    await engine.handleRecordCreated(await event());
    expect(await total()).toBe(-1);
  });
});
