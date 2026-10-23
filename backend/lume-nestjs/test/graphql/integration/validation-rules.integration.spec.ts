import { jest } from '@jest/globals';
import { createHarness, type Harness } from './harness';
import { ValidationRuleEngineService } from '../../../src/modules/base_automation/services/validation-rule-engine.service';
import { RecordService } from '../../../src/modules/base/services/record.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

jest.setTimeout(120000);
describe('Validation rules (real MySQL)', () => {
  let h: Harness;
  let engine: ValidationRuleEngineService;
  beforeAll(async () => { h = await createHarness(); engine = new ValidationRuleEngineService(h.prisma); });
  afterAll(async () => { await h?.close(); });
  beforeEach(async () => {
    await h.prisma.automation_validation_rules.deleteMany();
    await h.prisma.entityRelationshipRecord.deleteMany();
    await h.prisma.entityRelationship.deleteMany();
    await h.seed();
  });
  afterEach(() => jest.restoreAllMocks());
  const add = (rule_type: string, config: any = {}, extra = {}) => h.prisma.automation_validation_rules.create({ data: {
    name: 'Check', model: 'entity_1', field: 'value', rule_type, config: JSON.stringify(config), ...extra,
  } });
  const validate = (data: any, context?: any) => engine.validate('entity_1',data,context);

  it('loads only active model rules and preserves zero priority and stable ties', async () => {
    await add('required',{}, {name:'Later',priority:10});
    await add('required',{}, {name:'First',priority:0});
    await add('required',{}, {name:'Second',priority:0});
    await add('required',{}, {model:'entity_2'});
    await add('required',{}, {status:'inactive'});
    expect((await validate({})).map(error=>error.ruleName)).toEqual(['First','Second','Later']);
  });
  it('reports configured messages and accepts false and zero as required values', async () => {
    await add('required',{}, {error_message:'Value needed'});
    expect(await validate({})).toEqual([{field:'value',ruleName:'Check',message:'Value needed'}]);
    expect(await validate({value:0})).toEqual([]); expect(await validate({value:false})).toEqual([]);
  });
  it.each(['nonsense',true,{},[], '   ', Infinity])('rejects nonnumeric ranges: %j', async value => {
    await add('range',{min:0,max:10});
    expect(await validate({value})).toHaveLength(1);
  });
  it('accepts inclusive numeric bounds and checks both bounds', async () => {
    await add('range',{min:0,max:10});
    for (const value of [0,'0',10,'10']) expect(await validate({value})).toEqual([]);
    for (const value of [-1,11]) expect(await validate({value})).toHaveLength(1);
  });
  it.each([
    ['format',{format:'unknown'}],['range',{}],['range',{min:'0'}],['range',{min:10,max:0}],
    ['regex',{pattern:'['}],['regex',{}],['custom',{}],
    ['custom',{condition:{value:{$gte:0,$unknown:10}}}],
    ['custom',{condition:{value:{$in:3}}}],['unique',{model:'entity_2'}],
  ])('fails closed for invalid %s configuration %j', async (type, config) => {
    await add(type as string,config);
    expect((await validate({}))[0].message).toBe('Invalid validation rule configuration');
  });
  it('fails closed for malformed stored JSON', async () => {
    await add('required',{}, {config:'{'});
    expect(await validate({value:'present'})).toHaveLength(1);
  });
  it.each([
    ['email','a@example.com','invalid'],
    ['url','https://example.com/path','javascript:alert(1)'],
    ['phone','+1 (234) 567-8901','-------'],
    ['date','2024-02-29','2025-02-29'],
    ['datetime','2024-02-29T12:30:00Z','2025-02-29T12:30:00Z'],
    ['uuid','550e8400-e29b-41d4-a716-446655440000','invalid'],
  ])('validates %s format', async (format, good, bad) => {
    await add('format',{format});
    expect(await validate({value:good})).toEqual([]);
    expect(await validate({value:bad})).toHaveLength(1);
  });
  it('evaluates every custom operator, including inclusive bounds and exclusions', async () => {
    await add('custom',{condition:{value:{$gte:0,$lte:10,$nin:[5]},kind:{$in:['ok'],$ne:'bad'}}});
    expect(await validate({value:10,kind:'ok'})).toEqual([]);
    for (const value of [-1,11,5]) expect(await validate({value,kind:'ok'})).toHaveLength(1);
    expect(await validate({value:1})).toHaveLength(1);
  });
  it('matches regex rules and skips absent optional values', async () => {
    await add('regex',{pattern:'^[A-Z]{2}[0-9]{3}$'});
    expect(await validate({value:'AB123'})).toEqual([]);
    expect(await validate({value:'ab123'})).toHaveLength(1);
    expect(await validate({})).toEqual([]);
  });
  it('checks uniqueness within the tenant and excludes only the current valid record', async () => {
    await add('unique',{}, {field:'name'});
    expect(await validate({name:'Record 1'},{companyId:1})).toHaveLength(1);
    expect(await validate({name:'Record 1'},{companyId:2})).toEqual([]);
    expect(await validate({name:'Record 1'},{companyId:1,recordId:1})).toEqual([]);
    expect(await validate({name:'Record 2'},{companyId:1,recordId:1})).toHaveLength(1);
  });
  it('ignores deleted records and records of other entities for uniqueness', async () => {
    await add('unique',{}, {field:'name'});
    await h.prisma.entityRecord.update({where:{id:1},data:{deletedAt:new Date()}});
    await h.prisma.entityRecord.update({where:{id:2},data:{entityId:2}});
    expect(await validate({name:'Record 1'},{companyId:1})).toEqual([]);
    expect(await validate({name:'Record 2'},{companyId:1})).toEqual([]);
  });
  it.each([undefined,{companyId:0},{companyId:1,recordId:4},{companyId:1,recordId:999}])('rejects invalid unique scope %j', async context => {
    await add('unique',{}, {field:'name'});
    await expect(validate({},context)).rejects.toThrow();
  });
  it('does not turn database errors into successful validation', async () => {
    jest.spyOn(h.prisma.automation_validation_rules,'findMany').mockRejectedValue(new Error('database unavailable'));
    await expect(validate({})).rejects.toThrow('database unavailable');
  });
  it('does not swallow uniqueness query failures', async () => {
    await add('unique',{}, {field:'name'});
    jest.spyOn(h.prisma.entityRecord,'findMany').mockRejectedValue(new Error('query failed'));
    await expect(validate({name:'Candidate'},{companyId:1})).rejects.toThrow('query failed');
  });

  it('rejects invalid GraphQL creates before persistence', async () => {
    await add('required');
    const response = await h.query('mutation { createEntityRecord(entityId:1,input:{data:{name:"Candidate"}}) { id } }');
    expect(response.body.errors?.[0].message).toBe('Record validation failed');
    expect(await h.prisma.entityRecord.count()).toBe(4);
  });

  it('validates merged updates and allows unique values on the same record', async () => {
    await add('unique',{}, {field:'name'});
    const records = h.app.get(RecordService);
    await expect(records.updateRecord(1,{name:'Record 2'},1,2)).rejects.toThrow('Record validation failed');
    expect((await records.updateRecord(1,{status:'updated'},1,2)).data.name).toBe('Record 1');
  });

  it('validates stored formula results before writing or emitting an event', async () => {
    await h.prisma.entityField.create({data:{entityId:1,name:'total',slug:'total',label:'Total',type:'formula',formulaExpression:'2 * 5',isStored:true}});
    await add('range',{max:5},{field:'total'});
    const emit = jest.spyOn(h.app.get(EventEmitter2),'emit');
    await expect(h.app.get(RecordService).createRecord(1,{name:'Formula',total:0},1,2)).rejects.toThrow('Record validation failed');
    expect(await h.prisma.entityRecord.count()).toBe(4); expect(emit).not.toHaveBeenCalled();
  });

  it('rolls back the source and targets when a cascade fails a validation rule', async () => {
    const relation = await h.prisma.entityRelationship.create({data:{sourceEntityId:1,targetEntityId:1,type:'many_to_many',name:'peers',label:'Peers',cascadeUpdate:true}});
    await h.prisma.entityRelationshipRecord.createMany({data:[2,3].map(targetRecordId=>({relationshipId:relation.id,sourceRecordId:1,targetRecordId}))});
    await add('custom',{condition:{name:{$ne:'Record 3'}}});
    const emit = jest.spyOn(h.app.get(EventEmitter2),'emit');
    await expect(h.app.get(RecordService).updateRecord(1,{status:'new'},1,2)).rejects.toThrow('Record validation failed');
    for (const id of [1,2,3]) expect(JSON.parse((await h.prisma.entityRecord.findUnique({where:{id}})).data).status).toBeUndefined();
    expect(emit).not.toHaveBeenCalled();
  });
});
