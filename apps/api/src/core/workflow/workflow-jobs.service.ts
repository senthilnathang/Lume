import { Injectable, Logger, OnModuleDestroy, OnApplicationBootstrap } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@core/services/prisma.service';
import { RecordService } from '@modules/base/services/record.service';
import { FieldPermissionService } from '@modules/base/services/field-permission.service';
import { MetadataRegistryService } from '@core/runtime/metadata-registry.service';
import { WorkflowExecutorService } from './workflow-executor.service';
import { WorkflowDeliveryService } from './workflow-delivery.service';
import { SecurityService } from '@modules/base/services/security.service';
import { workflowValue, workflowRecordVisible } from './workflow-actions.service';
import { RbacService } from '@core/services/rbac.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { assertTenantAccess, assertTenantActorAccess } from '@core/services/tenant-access';
import { assertActorCompany } from '@core/services/tenant-membership';

@Injectable()
export class WorkflowJobsService implements OnApplicationBootstrap, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private active?: Promise<boolean>;
  private readonly logger = new Logger(WorkflowJobsService.name);
  constructor(private prisma: PrismaService, private records: RecordService, private registry: MetadataRegistryService, private executor: WorkflowExecutorService, private delivery: WorkflowDeliveryService = new WorkflowDeliveryService(), private events:EventEmitter2 = new EventEmitter2()) {}
  onApplicationBootstrap() {
    if (process.env.AUTOMATION_WORKER_ENABLED === 'false') return;
    this.timer=setInterval(()=>{
      if (!this.active) this.active=this.processOne().catch(()=>{this.logger.error('Automation worker failed; retry on next poll');return false;}).finally(()=>{this.active=undefined;});
    },1000);
    this.timer.unref();
    this.logger.log(`Automation worker polling started; durable events ${process.env.AUTOMATION_DURABLE_EVENTS === 'true' ? 'enabled' : 'disabled'}`);
  }
  async onModuleDestroy() { if(this.timer)clearInterval(this.timer);await this.active; }

  async processOne(): Promise<boolean> {
    const token=randomUUID(), now=new Date();
    const job=await this.prisma.$transaction(async tx=>{
      const rows=await tx.$queryRaw<Array<{id:number}>>(Prisma.sql`
        SELECT id FROM automation_jobs WHERE kind IN ('workflow','delivery','record.created','record.updated','record.deleted','relationship.changed') AND
        ((status IN ('pending','retry') AND available_at<=${now}) OR (status='processing' AND lease_until<${now}))
        ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED`);
      if(!rows.length)return null;
      return tx.automationJob.update({where:{id:rows[0].id},data:{status:'processing',leaseToken:token,leaseUntil:new Date(Date.now()+60000),attempts:{increment:1}}});
    });
    if(!job)return false;
    const heartbeat=setInterval(()=>{void this.prisma.automationJob.updateMany({where:{id:job.id,leaseToken:token,status:'processing'},data:{leaseUntil:new Date(Date.now()+60000)}}).catch(()=>{});},10000);
    try {
      await assertTenantAccess(this.prisma, job.companyId);
      const payload=JSON.parse(job.payload);
      const user=await this.prisma.user.findUnique({where:{id:job.userId}});
      const role=user&&await this.prisma.role.findUnique({where:{id:user.role_id}});
      if(!user?.isActive||!role?.isActive)throw new Error('Active workflow actor required');
      assertActorCompany({ ...user, role }, job.companyId);
      if (payload.flowId) {
        const flow = await this.prisma.automation_flows.findUnique({ where: { id: payload.flowId } });
        if (!flow || flow.status !== 'active' || !await new RbacService(this.prisma).hasPermission(job.userId, 'base_automation.flows.manage')) {
          throw new Error('Flow is inactive, deleted or access revoked');
        }
      }
      if (payload.scheduleId) {
        const schedule = await this.prisma.workflowSchedule.findFirst({ where: {
          id: payload.scheduleId, userId: job.userId, companyId: job.companyId,
          status: 'active', version: payload.scheduleVersion,
        } });
        if (!schedule || !await new RbacService(this.prisma).hasPermission(job.userId, 'base_automation.scheduled.manage')) {
          throw new Error('Schedule changed, disabled or access revoked');
        }
      }
      if(job.kind.startsWith('record.')||job.kind==='relationship.changed'){
        if(!this.events.listenerCount(job.kind))throw new Error('No automation handlers registered');
        const event={...payload,durable:true,eventKey:job.eventKey,executionKey:String(job.id)};
        // Wait for every listener even when another throws synchronously or rejects.
        // Otherwise a retry can race unfinished work from the preceding attempt.
        const results=await Promise.allSettled(this.events.listeners(job.kind).map(listener=>Promise.resolve().then(()=>listener.call(this.events,event))));
        const failed=results.find(result=>result.status==='rejected') as PromiseRejectedResult|undefined;
        if(failed)throw failed.reason;
        await this.prisma.automationJob.updateMany({where:{id:job.id,leaseToken:token,status:'processing'},data:{status:'completed',result:'{}',lastError:null,leaseUntil:null,leaseToken:null}});
        return true;
      }
      if(job.kind==='delivery'){
        const source=await this.records.getRecord(payload.sourceRecordId,job.companyId,job.userId,payload.sourceEntityId);
        if(!source)throw new Error('Delivery source access revoked');
        if(payload.recipientId){
          if (!workflowRecordVisible(source, user.id, role.name) || !await new RbacService(this.prisma).hasPermission(user.id, 'base.entity_records.read')) throw new Error('Delivery source access revoked');
          const recipient=await this.prisma.user.findUnique({where:{id:payload.recipientId}});
          const recipientRole=recipient&&await this.prisma.role.findUnique({where:{id:recipient.role_id}});
          const entity=await this.prisma.entity.findUnique({where:{id:source.entityId}});
          if(!recipient?.isActive||!recipientRole?.isActive||!(await new SecurityService(this.prisma).recordPredicate(['EntityRecord','entity_records',entity.name],'read',{userId:recipient.id,roleId:recipient.role_id}))(source.data))throw new Error('Delivery recipient access revoked');
          if (!workflowRecordVisible(source, recipient.id, recipientRole.name)) throw new Error('Delivery recipient access revoked');
          if(!await new RbacService(this.prisma).hasPermission(recipient.id,'base.entity_records.read'))throw new Error('Recipient read permission revoked');
          const fields = new FieldPermissionService(this.prisma);
          const senderData = await fields.filterRecordForRole(entity.id, source.data, user.role_id);
          const data = await fields.filterRecordForRole(entity.id, senderData, recipient.role_id);
          payload.body.title=workflowValue(payload.titleTemplate,data);payload.body.message=workflowValue(payload.messageTemplate,data);
          if(payload.channel==='email')payload.body.to=recipient.email;
        }else{
          source.data=await new FieldPermissionService(this.prisma).filterRecordForRole(source.entityId,source.data,user.role_id);
          payload.body=workflowValue(payload.bodyTemplate,{...source.data,...source});
        }
        await assertTenantActorAccess(this.prisma, job.companyId, job.userId);
        const result=await this.delivery.deliver(payload,job.eventKey);
        await this.prisma.automationJob.updateMany({where:{id:job.id,leaseToken:token,status:'processing'},data:{status:'completed',result:JSON.stringify(result),lastError:null,leaseUntil:null,leaseToken:null}});
        return true;
      }
      const record=await this.records.getRecord(payload.recordId,job.companyId,job.userId,payload.entityId);
      const entity=await this.prisma.entity.findFirst({where:{id:payload.entityId,deletedAt:null}});
      if(!record||!entity)throw new Error('Workflow source is missing or inaccessible');
      if (payload.flowId && (!workflowRecordVisible(record, user.id, role.name) ||
        !await new RbacService(this.prisma).hasPermission(user.id, 'base.entity_records.read'))) throw new Error('Flow source access revoked');
      const definition=payload.definition || this.registry.getWorkflow(payload.workflowName);
      if(!definition||definition.entity!==entity.name)throw new Error('Matching workflow definition required');
      // Pin the definition before the first action, so retries cannot change its steps.
      if(!payload.definition){payload.definition=definition;await this.prisma.automationJob.updateMany({where:{id:job.id,leaseToken:token},data:{payload:JSON.stringify(payload)}});}
      record.data=await new FieldPermissionService(this.prisma).filterRecordForRole(entity.id,record.data,user.role_id);
      const run=await this.executor.execute(payload.workflowName,record,entity.name,{type:payload.outcome||'queued'},job.userId,
        {companyId:job.companyId,executionKey:String(job.id),definition});
      if(run.status!=='completed')throw new Error(run.errorMessage||'Workflow failed');
      await this.prisma.automationJob.updateMany({where:{id:job.id,leaseToken:token,status:'processing'},data:{status:'completed',result:JSON.stringify(run),lastError:null,leaseUntil:null,leaseToken:null}});
    }catch(error:any){
      await this.prisma.automationJob.updateMany({where:{id:job.id,leaseToken:token,status:'processing'},data:{
        status:job.attempts>=5?'failed':'retry',lastError:String(error.message||'Workflow failed').slice(0,2000),
        availableAt:new Date(Date.now()+Math.min(300000,1000*2**job.attempts)),leaseUntil:null,leaseToken:null,
      }});
    }finally{clearInterval(heartbeat);}
    return true;
  }
}
