import { BadRequestException, ForbiddenException, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';
import { RecordService } from '@modules/base/services/record.service';
import { FieldPermissionService } from '@modules/base/services/field-permission.service';
import { RbacService } from '@core/services/rbac.service';
import { WorkflowExecutorService, WorkflowRunContext } from './workflow-executor.service';
import { Prisma } from '@prisma/client';
import { SecurityService } from '@modules/base/services/security.service';
import { randomUUID } from 'crypto';
import { AIAdapterService } from '@core/ai/ai-adapter.service';

export function workflowValue(value: any, variables: Record<string, any>): any {
  if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
    const key = value.slice(2,-1);
    if (!Object.prototype.hasOwnProperty.call(variables,key)) throw new BadRequestException('Unknown workflow variable');
    return variables[key];
  }
  if (Array.isArray(value)) return value.map(item=>workflowValue(item,variables));
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key,item] of Object.entries(value)) {
      if (['__proto__','constructor','prototype'].includes(key)) throw new BadRequestException('Invalid workflow key');
      result[key] = workflowValue(item,variables);
    }
    return result;
  }
  return value;
}

@Injectable()
export class WorkflowActionsService implements OnModuleInit {
  constructor(private prisma: PrismaService, private records: RecordService, private executor: WorkflowExecutorService, private ai: AIAdapterService = new AIAdapterService()) {}
  onModuleInit() {
    this.executor.registerActionHandler('create_record',(ctx,step)=>this.createRecord(ctx,step));
    this.executor.registerActionHandler('send_notification',(ctx,step)=>this.notify(ctx,step));
    this.executor.registerActionHandler('call_webhook',(ctx,step)=>this.webhook(ctx,step));
    this.executor.registerActionHandler('ai',(ctx,step)=>this.completeAI(ctx,step));
  }

  async once(ctx: WorkflowRunContext, operation: (tx: Prisma.TransactionClient)=>Promise<any>) {
    return this.prisma.$transaction(async tx=>{
      const key=ctx.executionKey ? `workflow:${ctx.executionKey}:${ctx.stepKey}` : null;
      if(key){
        const id=Number(ctx.executionKey);
        if(!Number.isSafeInteger(id)||id<1||!ctx.stepKey)throw new BadRequestException('Invalid workflow execution context');
        const jobs=await tx.$queryRaw<any[]>(Prisma.sql`SELECT id FROM automation_jobs WHERE id=${id} AND company_id=${ctx.companyId} AND user_id=${ctx.userId} FOR UPDATE`);
        if(!jobs.length)throw new ForbiddenException('Workflow job context mismatch');
        const receipt=await tx.automationReceipt.findUnique({where:{key}});
        if(receipt)return JSON.parse(receipt.result);
      }
      const result=await operation(tx);
      if(key)await tx.automationReceipt.create({data:{key,result:JSON.stringify(result)}});
      return result;
    });
  }

  async actor(ctx: WorkflowRunContext, db: any = this.prisma) {
    if (![ctx.companyId,ctx.userId].every(id=>Number.isSafeInteger(id)&&id>0)) throw new ForbiddenException('Workflow requires tenant and actor context');
    const user = await db.user.findUnique({where:{id:ctx.userId}});
    const role = user && await db.role.findUnique({where:{id:user.role_id}});
    if (!user?.isActive || !role?.isActive) throw new ForbiddenException('Active workflow actor required');
    return {user,role};
  }

  async createRecord(ctx: WorkflowRunContext, step: any) {
    return this.once(ctx,async tx=> {
      const {user} = await this.actor(ctx,tx);
      if (!await new RbacService(tx as any).hasPermission(user.id,'base.entity_records.create')) throw new ForbiddenException('Record creation permission required');
      const entity = typeof step.entity === 'string' && await tx.entity.findFirst({where:{name:step.entity,deletedAt:null}});
      if (!entity) throw new BadRequestException('Active target entity required');
      const data = workflowValue(step.data,ctx.variables);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new BadRequestException('Workflow record data must be an object');
      const writable = await new FieldPermissionService(tx as any).getWritableFields(entity.id,user.role_id);
      if (Object.keys(data).some(key=>!writable.includes(key))) throw new ForbiddenException('Workflow field write denied');
      const record = await this.records.withTransaction(tx).createRecord(entity.id,data,ctx.companyId,user.id,{emitEvent:false});
      return {id:record.id,entityId:record.entityId,companyId:record.companyId};
    });
  }

  async notify(ctx: WorkflowRunContext, step: any) {
    const channel=step.channel||'in_app';
    if(!['in_app','email','push'].includes(channel))throw new BadRequestException('Invalid notification channel');
    return this.once(ctx,async tx=>{
      await this.actor(ctx,tx);
      const userId=Number(workflowValue(step.to,ctx.variables));
      if(!Number.isSafeInteger(userId)||userId<1)throw new BadRequestException('Notification recipient ID required');
      const recipient=await tx.user.findUnique({where:{id:userId}});
      const role=recipient&&await tx.role.findUnique({where:{id:recipient.role_id}});
      if(!recipient?.isActive||!role?.isActive)throw new ForbiddenException('Active notification recipient required');
      if(!await new RbacService(tx as any).hasPermission(userId,'base.entity_records.read'))throw new ForbiddenException('Recipient read permission required');
      const source=await this.records.withTransaction(tx).getRecord(ctx.record.id,ctx.companyId,ctx.userId,ctx.record.entityId);
      if(!source)throw new ForbiddenException('Notification source access denied');
      const entity=await tx.entity.findUnique({where:{id:source.entityId}});
      const allowed=await new SecurityService(tx as any).recordPredicate(['EntityRecord','entity_records',entity.name],'read',{userId,roleId:role.id});
      if(!allowed(source.data))throw new ForbiddenException('Notification recipient record access denied');
      // Resolve templates only against data the recipient is allowed to read.
      const data=await new FieldPermissionService(tx as any).filterRecordForRole(entity.id,source.data,role.id);
      const title=workflowValue(step.title||'Workflow notification',data);
      const message=workflowValue(step.message??step.template,data);
      if(typeof title!=='string'||!title||title.length>255||typeof message!=='string'||message.length>10000)throw new BadRequestException('Invalid notification content');
      if(channel!=='in_app'){
        const job=await tx.automationJob.create({data:{eventKey:`delivery:${randomUUID()}`,kind:'delivery',companyId:ctx.companyId,userId:ctx.userId,
          payload:JSON.stringify({channel,sourceRecordId:source.id,sourceEntityId:source.entityId,recipientId:userId,titleTemplate:step.title||'Workflow notification',messageTemplate:step.message??step.template,
            body:{companyId:ctx.companyId,userId, ...(channel==='email'?{to:recipient.email}:{}),title,message}})}});
        return {jobId:job.id,channel,status:'queued'};
      }
      const result=await tx.notifications.create({data:{user_id:userId,company_id:ctx.companyId,title,message,type:'info',channel:'in_app',related_model:entity.name,related_id:source.id}});
      return {id:result.id,channel:'in_app'};
    });
  }

  async webhook(ctx: WorkflowRunContext,step:any){
    return this.once(ctx,async tx=>{
      await this.actor(ctx,tx);
      if(step.method?.toUpperCase()!=='POST')throw new BadRequestException('Workflow webhooks support POST');
      if(typeof step.url!=='string')throw new BadRequestException('Webhook URL required');
      const body=workflowValue(step.body??{},ctx.variables);
      const job=await tx.automationJob.create({data:{eventKey:`delivery:${randomUUID()}`,kind:'delivery',companyId:ctx.companyId,userId:ctx.userId,
        payload:JSON.stringify({channel:'webhook',url:step.url,sourceRecordId:ctx.record.id,sourceEntityId:ctx.record.entityId,body,bodyTemplate:step.body??{}})}});
      return {jobId:job.id,channel:'webhook',status:'queued'};
    });
  }

  async completeAI(ctx:WorkflowRunContext,step:any){
    await this.actor(ctx);
    if(typeof step.outputField!=='string'||!step.outputField||['__proto__','constructor','prototype'].includes(step.outputField))throw new BadRequestException('Valid AI output field required');
    const key=ctx.executionKey?`workflow:${ctx.executionKey}:${ctx.stepKey}`:null;
    const receipt=key&&await this.prisma.automationReceipt.findUnique({where:{key}});
    const result=receipt?JSON.parse(receipt.result):await this.ai.complete(workflowValue(step.prompt,ctx.variables));
    if(!receipt&&key)await this.prisma.automationReceipt.upsert({where:{key},create:{key,result:JSON.stringify(result)},update:{}});
    ctx.variables[step.outputField]=result.text;ctx.record[step.outputField]=result.text;
    return result;
  }
}
