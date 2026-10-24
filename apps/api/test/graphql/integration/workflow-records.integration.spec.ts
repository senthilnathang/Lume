import { jest } from '@jest/globals';
import { createHarness, Harness } from './harness';
import { WorkflowActionsService } from '../../../src/core/workflow/workflow-actions.service';
import { RecordService } from '../../../src/modules/base/services/record.service';
jest.setTimeout(120000);
describe('Workflow record actions',()=>{
  let h:Harness, actions:WorkflowActionsService;
  beforeAll(async()=>{h=await createHarness();actions=new WorkflowActionsService(h.prisma as any,h.app.get(RecordService),null!);});
  afterAll(async()=>{await h?.close();});
  beforeEach(async()=>{await h.prisma.recordRule.deleteMany();await h.seed();});
  const context=(extra={})=>({companyId:1,userId:2,variables:{name:'Created from workflow'},...extra} as any);
  const step={type:'create_record',entity:'entity_1',data:{name:'${name}'}};
  it('persists a validated record with trusted tenant and actor',async()=>{
    const result=await actions.createRecord(context(),step);
    const row=await h.prisma.entityRecord.findUnique({where:{id:result.id}});
    expect(row).toMatchObject({companyId:1,createdBy:2,entityId:1});
    expect(JSON.parse(row.data)).toEqual({name:'Created from workflow'});
  });
  it('rejects missing tenant and inactive users',async()=>{
    await expect(actions.createRecord(context({companyId:undefined}),step)).rejects.toThrow('context');
    await h.prisma.user.update({where:{id:2},data:{isActive:false}});
    await expect(actions.createRecord(context(),step)).rejects.toThrow('Active');
  });
  it('enforces record-create RBAC and field write restrictions',async()=>{
    await expect(actions.createRecord(context({userId:3}),step)).rejects.toThrow('permission');
    await expect(actions.createRecord(context(),{...step,data:{name:'New',readonly:'tamper'}})).rejects.toThrow('field write');
  });
  it('rolls back invalid data and rejects unknown variables',async()=>{
    const before=await h.prisma.entityRecord.count();
    await expect(actions.createRecord(context(),{...step,data:{}})).rejects.toThrow();
    await expect(actions.createRecord(context(),{...step,data:{name:'${missing}'}})).rejects.toThrow('variable');
    expect(await h.prisma.entityRecord.count()).toBe(before);
  });
});
