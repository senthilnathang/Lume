import { jest } from '@jest/globals';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHarness, type Harness } from './harness';
import { BusinessRuleEngineService } from '../../../src/modules/base_automation/services/business-rule-engine.service';
import { DrizzleService } from '../../../src/core/services/drizzle.service';
import { RecordService } from '../../../src/modules/base/services/record.service';
import { RecordCreatedEvent, RecordUpdatedEvent } from '../../../src/modules/base/events/record.events';

jest.setTimeout(120000);
describe('Business-rule secured writes (real MySQL)', () => {
  let h: Harness;
  let engine: BusinessRuleEngineService;
  beforeAll(async () => {
    h = await createHarness();
    engine = new BusinessRuleEngineService(h.app.get(DrizzleService), h.prisma, h.app.get(RecordService));
  });
  afterAll(async () => { await h?.close(); });
  beforeEach(async () => {
    await h.prisma.automation_business_rules.deleteMany();
    await h.prisma.recordRule.deleteMany();
    await h.seed();
    jest.spyOn(console,'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());
  const data = async () => JSON.parse((await h.prisma.entityRecord.findUnique({where:{id:1}})).data);
  const event = async () => {
    const record = await h.prisma.entityRecord.findUnique({where:{id:1}});
    return new RecordCreatedEvent(1,{...record,data:JSON.parse(record.data)},2);
  };
  const add = (condition: object, fieldName: string, value: any, extra = {}) => h.prisma.automation_business_rules.create({data:{
    name:'Rule',model:'entity_1',field:fieldName,condition:JSON.stringify(condition),action:JSON.stringify({type:'set_field',fieldName,value}),...extra,
  }});

  it.each(['created','updated'])('evaluates persisted JSON data on %s events and writes through the secured service', async kind => {
    await add({name:'Record 1'},'name','Changed');
    const e = await event();
    if (kind === 'created') await engine.handleRecordCreated(e);
    else await engine.handleRecordUpdated(new RecordUpdatedEvent(e.entityId,e.record,{name:'Before'},e.userId));
    expect((await data()).name).toBe('Changed');
  });

  it('reloads data rather than applying conditions to stale event contents', async () => {
    await add({name:'Stale'},'name','Wrong');
    const e = await event();
    e.record.data.name = 'Stale';
    await engine.handleRecordCreated(e);
    expect((await data()).name).toBe('Record 1');
  });

  it('checks every condition operator', async () => {
    await h.prisma.entityRecord.update({where:{id:1},data:{data:'{"name":"Record 1","score":50}'}});
    await add({score:{$gte:10,$lte:20}},'name','Wrong');
    await engine.handleRecordCreated(await event());
    expect((await data()).name).toBe('Record 1');
  });

  it('applies priority zero first and lets subsequent rules observe successful writes', async () => {
    await add({name:'First'},'name','Second',{priority:10});
    await add({name:'Record 1'},'name','First',{priority:0});
    await engine.handleRecordCreated(await event());
    expect((await data()).name).toBe('Second');
  });

  it('does not recursively emit record.updated from automation writes', async () => {
    await add({},'name','Changed');
    const emit = jest.spyOn(h.app.get(EventEmitter2),'emit');
    await engine.handleRecordCreated(await event());
    expect((await data()).name).toBe('Changed');
    expect(emit).not.toHaveBeenCalledWith('record.updated',expect.anything());
  });

  it.each(['read','write'])('honors %s rules for the event actor', async action => {
    await add({},'name','Denied');
    await h.prisma.recordRule.create({data:{name:'Restriction',modelName:'entity_1',action,groups:'[2]',domain:JSON.stringify({name:action === 'read' ? 'Invisible' : {ne:'Denied'}})}});
    await engine.handleRecordCreated(await event());
    expect((await data()).name).toBe('Record 1');
  });

  it('rejects invalid required-field updates and evaluates stored formulas', async () => {
    await add({},'name','');
    await engine.handleRecordCreated(await event());
    expect((await data()).name).toBe('Record 1');
    await h.prisma.automation_business_rules.deleteMany();
    await h.prisma.entityField.create({data:{entityId:1,name:'score',slug:'score',label:'Score',type:'number'}});
    await h.prisma.entityField.create({data:{entityId:1,name:'total',slug:'total',label:'Total',type:'formula',isStored:true,formulaExpression:'{score} * 2'}});
    await add({},'score',7);
    await engine.handleRecordCreated(await event());
    expect(await data()).toMatchObject({score:7,total:14});
  });

  it('rejects wrong entity, foreign tenant, missing actor and deleted records', async () => {
    await add({},'name','Wrong');
    const e = await event();
    for (const altered of [
      new RecordCreatedEvent(2,e.record,2),
      new RecordCreatedEvent(1,{...e.record,companyId:2},2),
      new RecordCreatedEvent(1,e.record,0),
      new RecordCreatedEvent(1,e.record,999999),
    ]) await engine.handleRecordCreated(altered);
    expect((await data()).name).toBe('Record 1');
    await h.prisma.entityRecord.update({where:{id:1},data:{deletedAt:new Date()}});
    await engine.handleRecordCreated(e);
    expect((await data()).name).toBe('Record 1');
  });

  it('skips inactive and unrelated-model rules', async () => {
    await add({},'name','Inactive',{status:'inactive'});
    await add({},'name','Other',{model:'entity_2'});
    await engine.handleRecordCreated(await event());
    expect((await data()).name).toBe('Record 1');
  });

  it('rejects malformed conditions and unsafe field names without writes', async () => {
    await add({},'name','Wrong',{condition:'[]'});
    await engine.handleRecordCreated(await event());
    await h.prisma.automation_business_rules.deleteMany();
    await add({},'__proto__',{polluted:true});
    await engine.handleRecordCreated(await event());
    expect((await data()).name).toBe('Record 1');
    expect(({} as any).polluted).toBeUndefined();
  });
});
