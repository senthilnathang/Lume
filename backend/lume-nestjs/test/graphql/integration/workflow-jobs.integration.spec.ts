import { jest } from '@jest/globals';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHarness, Harness } from './harness';
import { WorkflowActionsService } from '../../../src/core/workflow/workflow-actions.service';
import { WorkflowJobsService } from '../../../src/core/workflow/workflow-jobs.service';
import { WorkflowExecutorService } from '../../../src/core/workflow/workflow-executor.service';
import { MetadataRegistryService } from '../../../src/core/runtime/metadata-registry.service';
import { ExecutionPipelineService } from '../../../src/core/runtime/execution-pipeline.service';
import { EventBusService } from '../../../src/core/runtime/event-bus.service';
import { RecordService } from '../../../src/modules/base/services/record.service';
import { ApprovalChainEngineService } from '../../../src/modules/base_automation/services/approval-chain-engine.service';
import { WorkflowDeliveryService } from '../../../src/core/workflow/workflow-delivery.service';
import { ApprovalTriggerService } from '../../../src/modules/base_automation/services/approval-trigger.service';
import { readFileSync } from 'node:fs';
import { sqlStatements } from '../../../migrations/sql-statements';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../../src/core/services/prisma.service';
import { DrizzleService } from '../../../src/core/services/drizzle.service';
import { CatalogSeederService } from '../../../src/modules/plugins/services/catalog-seeder.service';
jest.setTimeout(120000);
describe('Durable approval workflows and notifications',()=>{
  let h:Harness, registry:MetadataRegistryService, executor:WorkflowExecutorService, actions:WorkflowActionsService, worker:WorkflowJobsService;
  const context={companyId:1,userId:1};
  const previousDurable=process.env.AUTOMATION_DURABLE_EVENTS;
  beforeAll(async()=>{
    h=await createHarness();
    for(const file of ['008_create_plugin_management_tables.sql','016_create_marketplace_tables.sql']){
      for(const sql of sqlStatements(readFileSync(`migrations/${file}`,'utf8')))await h.prisma.$executeRawUnsafe(sql);
    }
    await h.prisma.$executeRawUnsafe('DROP TABLE automation_jobs');
    await h.prisma.$executeRawUnsafe('DROP TABLE automation_receipts');
    await h.prisma.$executeRawUnsafe('ALTER TABLE automation_approval_chains DROP COLUMN on_completed, DROP COLUMN on_rejected');
    await h.prisma.$executeRawUnsafe('ALTER TABLE automation_approval_requests DROP COLUMN workflow_data');
    for(const sql of sqlStatements(readFileSync('migrations/014_add_durable_workflows.sql','utf8')))await h.prisma.$executeRawUnsafe(sql);
    await h.prisma.$executeRawUnsafe('ALTER TABLE entities DROP COLUMN is_publishable, DROP COLUMN is_published, DROP COLUMN published_at');
    await h.prisma.$executeRawUnsafe('ALTER TABLE entity_fields DROP COLUMN is_stored, DROP COLUMN formula_type');
    for(const sql of sqlStatements(readFileSync('migrations/015_align_entity_runtime_columns.sql','utf8')))await h.prisma.$executeRawUnsafe(sql);
  });
  afterAll(async()=>{await h?.close();});
  beforeEach(async()=>{
    process.env.AUTOMATION_DURABLE_EVENTS='false';
    await h.prisma.automationReceipt.deleteMany();await h.prisma.automationJob.deleteMany();
    await h.prisma.notifications.deleteMany();await h.prisma.automation_approval_requests.deleteMany();await h.prisma.automation_approval_chains.deleteMany();
    await h.prisma.recordRule.deleteMany();await h.seed();
    registry=new MetadataRegistryService();
    executor=new WorkflowExecutorService(registry,new EventBusService(new EventEmitter2()),new ExecutionPipelineService(),h.prisma as any);
    actions=new WorkflowActionsService(h.prisma as any,h.app.get(RecordService),executor);actions.onModuleInit();
    worker=new WorkflowJobsService(h.prisma as any,h.app.get(RecordService),registry,executor);
  });
  afterEach(()=>{jest.restoreAllMocks();if(previousDurable===undefined)delete process.env.AUTOMATION_DURABLE_EVENTS;else process.env.AUTOMATION_DURABLE_EVENTS=previousDurable;});
  function workflow(steps:any[]){registry.registerWorkflow({name:'review_done',entity:'entity_1',trigger:{type:'manual',key:'review'},steps});}
  const enqueue=(extra={})=>h.prisma.automationJob.create({data:{eventKey:'test-job',kind:'workflow',companyId:1,userId:1,payload:JSON.stringify({workflowName:'review_done',entityId:1,recordId:1}),...extra}});
  it('runs durable approvals and retry-safe outcomes through the full application polling worker',async()=>{
    const previousWorker=process.env.AUTOMATION_WORKER_ENABLED;
    process.env.AUTOMATION_WORKER_ENABLED='true';
    process.env.AUTOMATION_DURABLE_EVENTS='true';
    let app:any;
    try {
      const {AppModule}=await import('../../../src/app.module');
      const module=await Test.createTestingModule({imports:[AppModule]})
        .overrideProvider(PrismaService).useValue(h.prisma)
        .overrideProvider(DrizzleService).useValue(h.app.get(DrizzleService)).compile();
      app=module.createNestApplication({logger:false});
      await app.listen(0,'127.0.0.1');
      const liveRegistry=app.get(MetadataRegistryService);
      const liveExecutor=app.get(WorkflowExecutorService);
      let attempts=0;
      liveExecutor.registerCustomHandler('transient',async()=>{if(++attempts===1)throw new Error('Temporary outage');});
      liveRegistry.registerWorkflow({name:'polled_outcome',entity:'entity_1',trigger:{type:'manual',key:'review'},steps:[
        {type:'send_notification',to:'2',message:'Polling outcome'},
        {type:'custom',handler:'transient'},
      ]});
      const chain=await h.prisma.automation_approval_chains.create({data:{name:'Polled approval',model:'entity_1',steps:'[{"approverId":1}]',trigger_event:'record.created',on_completed:'polled_outcome'}});
      const record=await app.get(RecordService).createRecord(1,{name:'Polled record'},1,1);
      async function until<T>(read:()=>Promise<T>,ready:(value:T)=>boolean):Promise<T>{
        const deadline=Date.now()+20000;
        do{const value=await read();if(ready(value))return value;await new Promise(resolve=>setTimeout(resolve,100));}while(Date.now()<deadline);
        throw new Error('Polling worker did not reach the expected state');
      }
      const request:any=await until(()=>h.prisma.automation_approval_requests.findFirst({where:{chainId:chain.id,recordId:record.id}}),Boolean);
      await app.get(ApprovalChainEngineService).approveStep(request.id,0,context);
      const job:any=await until(()=>h.prisma.automationJob.findFirst({where:{kind:'workflow'}}),(row:any)=>row?.status==='completed');
      expect(job.attempts).toBe(2);
      expect(attempts).toBe(2);
      expect(await h.prisma.notifications.count({where:{message:'Polling outcome',user_id:2,company_id:1}})).toBe(1);
      expect(await h.prisma.automationJob.count({where:{kind:'record.created',status:'completed'}})).toBe(1);
      expect(await app.get(CatalogSeederService).seed()).toMatchObject({success:true});
      const categories:any[]=await h.prisma.$queryRawUnsafe('SELECT COUNT(*) AS total FROM marketplace_categories');
      expect(Number(categories[0].total)).toBe(8);
      const plugins:any[]=await h.prisma.$queryRawUnsafe('SELECT COUNT(*) AS total FROM marketplace_plugins');
      expect(Number(plugins[0].total)).toBe(10);
      await h.prisma.$executeRawUnsafe("UPDATE marketplace_plugins SET display_name='Operator title' WHERE name='sales-assistant'");
      await h.prisma.$executeRawUnsafe("DELETE FROM marketplace_plugins WHERE name='payment-gateway'");
      expect(await app.get(CatalogSeederService).seed()).toMatchObject({success:true});
      expect(await h.prisma.$queryRawUnsafe('SELECT COUNT(*) AS total FROM marketplace_plugins')).toEqual(plugins);
      expect(await h.prisma.$queryRawUnsafe("SELECT display_name FROM marketplace_plugins WHERE name='sales-assistant'")).toEqual([{display_name:'Operator title'}]);
      await h.prisma.$executeRawUnsafe("DELETE FROM marketplace_plugins WHERE name='payment-gateway'");
      await h.prisma.$executeRawUnsafe("DELETE FROM marketplace_categories WHERE slug='crm'");
      await h.prisma.$executeRawUnsafe("CREATE TRIGGER fail_catalog_seed BEFORE INSERT ON marketplace_plugins FOR EACH ROW BEGIN IF NEW.name='payment-gateway' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Test catalog failure'; END IF; END");
      try {
        expect(await app.get(CatalogSeederService).seed()).toMatchObject({success:false});
        expect(await h.prisma.$queryRawUnsafe("SELECT id FROM marketplace_categories WHERE slug='crm'")).toEqual([]);
      }finally{
        await h.prisma.$executeRawUnsafe('DROP TRIGGER fail_catalog_seed');
      }
      expect(await app.get(CatalogSeederService).seed()).toMatchObject({success:true});
      // Reapplying the additive migration must preserve seeded catalog data.
      for(const sql of sqlStatements(readFileSync('migrations/016_create_marketplace_tables.sql','utf8')))await h.prisma.$executeRawUnsafe(sql);
      expect(await h.prisma.$queryRawUnsafe('SELECT COUNT(*) AS total FROM marketplace_categories')).toEqual(categories);
    }finally{
      await app?.close();
      if(previousWorker===undefined)delete process.env.AUTOMATION_WORKER_ENABLED;else process.env.AUTOMATION_WORKER_ENABLED=previousWorker;
    }
  });
  it('snapshots approval outcome configuration and atomically queues exactly one workflow',async()=>{
    workflow([{type:'send_notification',to:'2',message:'Approved',title:'Review'}]);
    const chain=await h.prisma.automation_approval_chains.create({data:{name:'Review',model:'entity_1',steps:'[{"approverId":1}]',on_completed:'review_done'}});
    const approvals=new ApprovalChainEngineService(h.prisma as any);
    const request=await approvals.createApprovalRequest({chainId:chain.id,recordEntityId:1,recordId:1},context);
    await h.prisma.automation_approval_chains.update({where:{id:chain.id},data:{on_completed:'changed'}});
    const results=await Promise.allSettled([approvals.approveStep(request.id,0,context),approvals.approveStep(request.id,0,context)]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(await h.prisma.automationJob.count()).toBe(1);
    await worker.processOne();
    expect((await h.prisma.automationJob.findFirst()).status).toBe('completed');
    expect(await h.prisma.notifications.count({where:{user_id:2,company_id:1,title:'Review'}})).toBe(1);
  });
  it('uses rejection workflows without queuing completion workflows',async()=>{
    const chain=await h.prisma.automation_approval_chains.create({data:{name:'Review',model:'entity_1',steps:'[{"approverId":1}]',on_completed:'accepted',on_rejected:'rejected'}});
    const approvals=new ApprovalChainEngineService(h.prisma as any);
    const request=await approvals.createApprovalRequest({chainId:chain.id,recordEntityId:1,recordId:1},context);
    await approvals.rejectApproval(request.id,0,'Needs revision',context);
    expect(JSON.parse((await h.prisma.automationJob.findFirst()).payload)).toMatchObject({workflowName:'rejected',outcome:'rejected'});
  });
  it('does not duplicate record creation when a later step fails and the process restarts',async()=>{
    workflow([{type:'create_record',entity:'entity_1',data:{name:'Exactly once'}},{type:'custom',handler:'later'}]);
    const job=await enqueue();
    await worker.processOne();
    expect((await h.prisma.automationJob.findUnique({where:{id:job.id}})).status).toBe('retry');
    expect(await h.prisma.entityRecord.count()).toBe(5);
    executor.registerCustomHandler('later',async()=>{});
    await h.prisma.automationJob.update({where:{id:job.id},data:{availableAt:new Date(0)}});
    const restarted=new WorkflowJobsService(h.prisma as any,h.app.get(RecordService),registry,executor);
    await restarted.processOne();
    expect(await h.prisma.entityRecord.count()).toBe(5);
    expect((await h.prisma.automationJob.findUnique({where:{id:job.id}})).status).toBe('completed');
  });
  it('reclaims expired leases and permits only one competing worker',async()=>{
    workflow([{type:'send_notification',to:'2',message:'Once'}]);
    const job=await enqueue({status:'processing',leaseUntil:new Date(0),leaseToken:'old'});
    await Promise.all([worker.processOne(),worker.processOne()]);
    expect(await h.prisma.notifications.count({where:{message:'Once'}})).toBe(1);
    expect((await h.prisma.automationJob.findUnique({where:{id:job.id}})).status).toBe('completed');
  });
  it('dead-letters repeated failures and rejects cross-tenant source records',async()=>{
    workflow([{type:'send_notification',to:'2',message:'No leak'}]);
    const job=await enqueue({companyId:2,attempts:4});
    await worker.processOne();
    expect((await h.prisma.automationJob.findUnique({where:{id:job.id}})).status).toBe('failed');
    expect(await h.prisma.notifications.count()).toBe(0);
  });
  it('does not expose fields hidden from a notification recipient',async()=>{
    workflow([{type:'send_notification',to:'2',message:'${secret}'}]);
    const job=await enqueue();await worker.processOne();
    expect((await h.prisma.automationJob.findUnique({where:{id:job.id}})).status).toBe('retry');
    expect(await h.prisma.notifications.count()).toBe(0);
  });
  it('queues external notifications and records delivery results with stable keys',async()=>{
    workflow([{type:'send_notification',to:'2',message:'Notice',channel:'email'}]);
    await enqueue();await worker.processOne();
    const deliveryJob=await h.prisma.automationJob.findFirst({where:{kind:'delivery'}});
    expect(deliveryJob.status).toBe('pending');
    const delivery=new WorkflowDeliveryService();const send=jest.spyOn(delivery,'deliver').mockResolvedValue({status:202,accepted:true});
    const deliveryWorker=new WorkflowJobsService(h.prisma as any,h.app.get(RecordService),registry,executor,delivery);
    await deliveryWorker.processOne();
    expect(send).toHaveBeenCalledWith(expect.objectContaining({channel:'email',body:expect.objectContaining({to:'member@test.local'})}),deliveryJob.eventKey);
    expect((await h.prisma.automationJob.findUnique({where:{id:deliveryJob.id}})).status).toBe('completed');
  });
  it('does not send queued content after recipient field access is revoked',async()=>{
    workflow([{type:'send_notification',to:'2',message:'${name}',channel:'push'}]);
    await enqueue();await worker.processOne();
    await h.prisma.entityFieldPermission.create({data:{fieldId:1,roleId:2,canRead:false}});
    const delivery=new WorkflowDeliveryService();const send=jest.spyOn(delivery,'deliver').mockResolvedValue({status:202,accepted:true});
    await new WorkflowJobsService(h.prisma as any,h.app.get(RecordService),registry,executor,delivery).processOne();
    expect(send).not.toHaveBeenCalled();
    expect((await h.prisma.automationJob.findFirst({where:{kind:'delivery'}})).status).toBe('retry');
  });
  it('persists record events atomically and deduplicates approval triggers across retries',async()=>{
    process.env.AUTOMATION_DURABLE_EVENTS='true';
    const chain=await h.prisma.automation_approval_chains.create({data:{name:'Automatic',model:'entity_1',steps:'[{"approverId":1}]',trigger_event:'record.created'}});
    const records=h.app.get(RecordService);
    const record=await records.createRecord(1,{name:'Queued'},1,1);
    expect(await h.prisma.automation_approval_requests.count()).toBe(0);
    const eventJob=await h.prisma.automationJob.findFirst({where:{kind:'record.created'}});
    expect(JSON.parse(eventJob.payload).record.id).toBe(record.id);
    const events=new EventEmitter2();const approvals=new ApprovalChainEngineService(h.prisma as any);
    const trigger=new ApprovalTriggerService(h.prisma as any,approvals);
    events.on('record.created',event=>trigger.handleRecordCreated(event));
    let fail=true;events.on('record.created',()=>{if(fail)throw new Error('Later listener unavailable');});
    const eventWorker=new WorkflowJobsService(h.prisma as any,records,registry,executor,new WorkflowDeliveryService(),events);
    await eventWorker.processOne();
    expect((await h.prisma.automationJob.findUnique({where:{id:eventJob.id}})).status).toBe('retry');
    const request=await h.prisma.automation_approval_requests.findFirst({where:{chainId:chain.id}});
    await approvals.approveStep(request.id,0,context);
    fail=false;await h.prisma.automationJob.update({where:{id:eventJob.id},data:{availableAt:new Date(0)}});
    await eventWorker.processOne();
    expect(await h.prisma.automation_approval_requests.count()).toBe(1);
    expect((await h.prisma.automationJob.findUnique({where:{id:eventJob.id}})).status).toBe('completed');
  });
});
