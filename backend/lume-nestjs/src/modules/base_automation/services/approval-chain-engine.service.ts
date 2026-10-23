import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@core/services/prisma.service';
import { SecurityService } from '@modules/base/services/security.service';

export interface ApprovalContext { companyId: number; userId: number }
export interface ApprovalStep {
  name?: string; approverId?: number; roleId?: number;
  status: 'pending' | 'approved' | 'rejected';
  actedBy?: number; actedAt?: string; reason?: string;
}
export interface ApprovalRequest {
  id: number; chainId: number; recordEntityId: number; recordId: number; companyId: number;
  currentStep: number; status: 'pending' | 'rejected' | 'completed';
  stepsData: ApprovalStep[]; initiatedBy: number; completedAt: Date | null;
  workflowData?: string;
}

@Injectable()
export class ApprovalChainEngineService {
  constructor(private prisma: PrismaService) {}

  private ids(...values: number[]) {
    if (values.some(value => !Number.isSafeInteger(value) || value < 1)) throw new BadRequestException('Valid IDs required');
  }

  private async actor(tx: Prisma.TransactionClient, context: ApprovalContext) {
    if (!context) throw new ForbiddenException('Approval requires tenant and actor context');
    this.ids(context.companyId,context.userId);
    const user = await tx.user.findUnique({where:{id:context.userId}});
    const role = user && await tx.role.findUnique({where:{id:user.role_id}});
    if (!user?.isActive || !role?.isActive) throw new ForbiddenException('Active actor and role required');
    return {userId:user.id,roleId:user.role_id};
  }

  private async record(tx: Prisma.TransactionClient, entityId: number, recordId: number, context: ApprovalContext, actor: {userId:number;roleId:number}, write: boolean) {
    const rows = await tx.$queryRaw<Array<{data:string;model:string}>>(Prisma.sql`
      SELECT r.data, e.name AS model FROM entity_records r JOIN entities e ON e.id = r.entity_id
      WHERE r.id = ${recordId} AND r.entity_id = ${entityId} AND r.company_id = ${context.companyId}
        AND r.deleted_at IS NULL AND e.deleted_at IS NULL FOR UPDATE
    `);
    if (!rows.length) throw new NotFoundException('Approval record not found');
    const row = rows[0], data = JSON.parse(row.data);
    const security = new SecurityService(tx as any);
    for (const action of write ? ['read','write'] : ['read']) {
      if (!(await security.recordPredicate(['EntityRecord','entity_records',row.model],action,actor))(data)) throw new ForbiddenException('Approval record access denied');
    }
    return {model:row.model,data};
  }

  private async steps(tx: Prisma.TransactionClient, raw: string | null): Promise<ApprovalStep[]> {
    let steps: any;
    try { steps = JSON.parse(raw ?? '[]'); } catch { throw new BadRequestException('Invalid approval steps'); }
    if (!Array.isArray(steps) || !steps.length) throw new BadRequestException('Approval chain needs steps');
    const result: ApprovalStep[] = [];
    for (const step of steps) {
      if (!step || typeof step !== 'object' || Array.isArray(step) ||
          (step.approverId === undefined) === (step.roleId === undefined) ||
          (step.name !== undefined && typeof step.name !== 'string')) throw new BadRequestException('Each step requires exactly one approverId or roleId');
      if (step.approverId !== undefined) {
        this.ids(step.approverId);
        const user = await tx.user.findUnique({where:{id:step.approverId}});
        const role = user && await tx.role.findUnique({where:{id:user.role_id}});
        if (!user?.isActive || !role?.isActive) throw new BadRequestException('Step approver is inactive or missing');
      } else {
        this.ids(step.roleId);
        if (!(await tx.role.findUnique({where:{id:step.roleId}}))?.isActive) throw new BadRequestException('Step role is inactive or missing');
      }
      result.push({...(step.name === undefined ? {} : {name:step.name}),
        ...(step.approverId === undefined ? {roleId:step.roleId} : {approverId:step.approverId}),status:'pending'});
    }
    return result;
  }

  private matches(raw: string | null, data: Record<string, any>) {
    let condition: any;
    try { condition = raw == null ? {} : JSON.parse(raw); } catch { throw new BadRequestException('Invalid approval condition'); }
    if (!condition || typeof condition !== 'object' || Array.isArray(condition)) throw new BadRequestException('Invalid approval condition');
    // Validate all operands before evaluation, including conditions after an unmatched field.
    for (const [field,value] of Object.entries(condition)) {
      if (!field || ['__proto__','constructor','prototype'].includes(field)) throw new BadRequestException('Invalid condition field');
      if (value !== null && typeof value === 'object') {
        if (Array.isArray(value) || !Object.keys(value).length) throw new BadRequestException('Invalid condition operators');
        for (const [op,operand] of Object.entries(value)) {
          if (!['$eq','$ne','$gt','$gte','$lt','$lte','$in','$nin'].includes(op)) throw new BadRequestException('Unsupported approval operator');
          if (op === '$in' || op === '$nin') {
            if (!Array.isArray(operand) || operand.some(item=>item !== null && typeof item === 'object')) throw new BadRequestException('Invalid membership operand');
          } else if (operand !== null && typeof operand === 'object') throw new BadRequestException('Invalid comparison operand');
        }
      }
    }
    for (const [field,value] of Object.entries(condition)) {
      if (!Object.prototype.hasOwnProperty.call(data,field)) return false;
      const actual = data[field];
      if (value === null || typeof value !== 'object') { if (actual !== value) return false; continue; }
      for (const [op,operand] of Object.entries(value)) {
        switch (op) {
          case '$eq': if (actual !== operand) return false; break;
          case '$ne': if (actual === operand) return false; break;
          case '$gt': if (!(actual > operand)) return false; break;
          case '$gte': if (!(actual >= operand)) return false; break;
          case '$lt': if (!(actual < operand)) return false; break;
          case '$lte': if (!(actual <= operand)) return false; break;
          case '$in': if (!(operand as any[]).includes(actual)) return false; break;
          case '$nin': if ((operand as any[]).includes(actual)) return false; break;
        }
      }
    }
    return true;
  }

  private view(row: any): ApprovalRequest { return {...row,stepsData:JSON.parse(row.stepsData)}; }

  private async notify(tx: Prisma.TransactionClient, request: ApprovalRequest, kind: 'pending' | 'completed' | 'rejected', record: {model:string;data:Record<string,any>}) {
    const step = request.stepsData[request.currentStep];
    const recipient = kind !== 'pending' ? Prisma.sql`u.id = ${request.initiatedBy}`
      : step.approverId !== undefined ? Prisma.sql`u.id = ${step.approverId}` : Prisma.sql`u.role_id = ${step.roleId}`;
    const candidates = await tx.$queryRaw<Array<{id:number;role_id:number}>>(Prisma.sql`
      SELECT u.id, u.role_id FROM users u JOIN roles r ON r.id = u.role_id
      WHERE u.is_active = 1 AND r.is_active = 1 AND ${recipient} ORDER BY u.id FOR UPDATE
    `);
    const security = new SecurityService(tx as any);
    const notifications = [];
    for (const user of candidates) {
      let allowed = true;
      try {
        for (const action of kind === 'pending' ? ['read','write'] : ['read']) {
          if (!(await security.recordPredicate(['EntityRecord','entity_records',record.model],action,{userId:user.id,roleId:user.role_id}))(record.data)) allowed = false;
        }
      } catch (error) {
        if (error instanceof ForbiddenException) allowed = false;
        else throw error;
      }
      if (!allowed) continue;
      notifications.push({user_id:user.id,company_id:request.companyId,
        type:kind === 'pending' ? 'action' : kind === 'completed' ? 'success' : 'warning',
        event_key:`approval:${request.id}:${kind}:${request.currentStep}`,
        title:kind === 'pending' ? 'Approval required' : kind === 'completed' ? 'Approval completed' : 'Approval rejected',
        message:kind === 'pending' ? `Approval request #${request.id} is awaiting your decision.` : `Approval request #${request.id} was ${kind}.`,
        related_model:'approval_request',related_id:request.id});
    }
    if (notifications.length) await tx.notifications.createMany({data:notifications,skipDuplicates:true});
  }

  async createApprovalRequest(input: {chainId:number;recordEntityId:number;recordId:number}, context: ApprovalContext): Promise<ApprovalRequest> {
    return this.start(input,context);
  }

  async startAutomatically(input: {chainId:number;recordEntityId:number;recordId:number}, context: ApprovalContext, event: 'record.created' | 'record.updated',eventKey?:string): Promise<ApprovalRequest | null> {
    return this.start(input,context,event,eventKey);
  }

  private async start(input: {chainId:number;recordEntityId:number;recordId:number}, context: ApprovalContext, event?: 'record.created' | 'record.updated',eventKey?:string): Promise<ApprovalRequest | null> {
    this.ids(input.chainId,input.recordEntityId,input.recordId);
    return this.prisma.$transaction(async tx => {
      const actor = await this.actor(tx,context);
      // Serialize starts, including duplicate pending-request detection.
      const chains = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM automation_approval_chains WHERE id = ${input.chainId} FOR UPDATE`);
      const chain = chains[0];
      if(eventKey){
        const key=`approval-trigger:${eventKey}:${input.chainId}`;
        const receipts=await tx.$queryRaw<any[]>(Prisma.sql`SELECT \`key\` FROM automation_receipts WHERE \`key\`=${key} FOR UPDATE`);
        if(receipts.length)return null;
        await tx.automationReceipt.create({data:{key,result:'{}'}});
      }
      if (event && (!chain || chain.status !== 'active' || ![event,'record.saved'].includes(chain.trigger_event))) return null;
      if (!chain || chain.status !== 'active') throw new NotFoundException('Active approval chain not found');
      const record = await this.record(tx,input.recordEntityId,input.recordId,context,actor,true);
      if (record.model !== chain.model) throw new BadRequestException('Chain model does not match record');
      if (!this.matches(chain.condition,record.data)) {
        if (event) return null;
        throw new BadRequestException('Approval condition is not satisfied');
      }
      const steps = await this.steps(tx,chain.steps);
      const existing = await tx.$queryRaw<Array<{id:number}>>(Prisma.sql`
        SELECT id FROM automation_approval_requests WHERE chain_id = ${input.chainId}
        AND record_entity_id = ${input.recordEntityId} AND record_id = ${input.recordId}
        AND company_id = ${context.companyId} AND status = 'pending' FOR UPDATE
      `);
      if (existing.length) {
        if (event) return null;
        throw new ConflictException('A pending approval request already exists');
      }
      const request = this.view(await tx.automation_approval_requests.create({data:{
        chainId:input.chainId,recordEntityId:input.recordEntityId,recordId:input.recordId,
        companyId:context.companyId,initiatedBy:context.userId,currentStep:0,status:'pending',stepsData:JSON.stringify(steps),
        workflowData:JSON.stringify({completed:chain.on_completed ?? null,rejected:chain.on_rejected ?? null}),
      }}));
      await this.notify(tx,request,'pending',record);
      return request;
    });
  }

  private async load(tx: Prisma.TransactionClient, requestId: number, context: ApprovalContext, write: boolean) {
    const actor = await this.actor(tx,context);
    const reference = await tx.automation_approval_requests.findFirst({where:{id:requestId,companyId:context.companyId},select:{chainId:true}});
    if (!reference) throw new NotFoundException('Approval request not found');
    // Use the same lock order as creation: chain, request, record. The chain ID
    // is immutable; current configuration is fetched by the locking read.
    const chains = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM automation_approval_chains WHERE id = ${reference.chainId} FOR UPDATE`);
    // Read current state, not a snapshot established before waiting on the request.
    const states = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT id, chain_id AS chainId, record_entity_id AS recordEntityId, record_id AS recordId,
        company_id AS companyId, current_step AS currentStep, status, steps_data AS stepsData,
        initiated_by AS initiatedBy, completed_at AS completedAt, workflow_data AS workflowData
      FROM automation_approval_requests WHERE id = ${requestId} AND company_id = ${context.companyId} FOR UPDATE
    `);
    if (!states.length) throw new NotFoundException('Approval request not found');
    const request = this.view(states[0]);
    const record = await this.record(tx,request.recordEntityId,request.recordId,context,actor,write);
    return {request,actor,chain:chains[0],record};
  }

  private assigned(step: ApprovalStep, actor: {userId:number;roleId:number}) {
    return step.approverId === actor.userId || step.roleId === actor.roleId;
  }

  async getApprovalRequest(requestId: number, context: ApprovalContext): Promise<ApprovalRequest> {
    this.ids(requestId);
    return this.prisma.$transaction(async tx => {
      const {request,actor} = await this.load(tx,requestId,context,false);
      if (request.initiatedBy !== actor.userId && !request.stepsData.some(step=>this.assigned(step,actor))) throw new ForbiddenException('Not an approval participant');
      return request;
    });
  }

  async approveStep(requestId: number, stepIndex: number, context: ApprovalContext): Promise<boolean> {
    return this.transition(requestId,stepIndex,context);
  }

  async rejectApproval(requestId: number, stepIndex: number, reason: string, context: ApprovalContext): Promise<boolean> {
    if (typeof reason !== 'string' || !reason.trim() || reason.length > 2000) throw new BadRequestException('A rejection reason of 1–2000 characters is required');
    return this.transition(requestId,stepIndex,context,reason.trim());
  }

  private async transition(requestId: number, stepIndex: number, context: ApprovalContext, reason?: string) {
    this.ids(requestId);
    if (!Number.isSafeInteger(stepIndex) || stepIndex < 0) throw new BadRequestException('Invalid approval step');
    return this.prisma.$transaction(async tx => {
      const {request,actor,chain,record} = await this.load(tx,requestId,context,true);
      if (request.status !== 'pending' || request.currentStep !== stepIndex || request.stepsData[stepIndex]?.status !== 'pending') throw new ConflictException('Approval request is not awaiting this step');
      if (!chain || chain.status !== 'active') throw new ConflictException('Approval chain is inactive or missing');
      const step = request.stepsData[stepIndex];
      if (!this.assigned(step,actor)) throw new ForbiddenException('Actor is not assigned to this step');
      const now = new Date();
      request.stepsData[stepIndex] = {...step,status:reason ? 'rejected' : 'approved',actedBy:actor.userId,actedAt:now.toISOString(),...(reason ? {reason} : {})};
      const completed = !reason && stepIndex + 1 === request.stepsData.length;
      const result = await tx.automation_approval_requests.updateMany({where:{id:requestId,companyId:context.companyId,status:'pending',currentStep:stepIndex},data:{
        status:reason ? 'rejected' : completed ? 'completed' : 'pending',
        currentStep:reason ? stepIndex : stepIndex + 1,
        stepsData:JSON.stringify(request.stepsData),completedAt:reason || completed ? now : null,
      }});
      if (result.count !== 1) throw new ConflictException('Approval request changed; retry');
      request.status = reason ? 'rejected' : completed ? 'completed' : 'pending';
      request.currentStep = reason ? stepIndex : stepIndex + 1;
      await this.notify(tx,request,request.status,record);
      if (request.status !== 'pending') {
        const workflow = JSON.parse(request.workflowData || '{}')[request.status];
        if (workflow) await tx.automationJob.create({data:{
          eventKey:`approval:${request.id}:${request.status}`,kind:'workflow',companyId:context.companyId,userId:context.userId,
          payload:JSON.stringify({workflowName:workflow,entityId:request.recordEntityId,recordId:request.recordId,approvalRequestId:request.id,outcome:request.status}),
        }});
      }
      return true;
    });
  }

  async evaluateApprovalCondition(chainId: number, record: Record<string, any>): Promise<boolean> {
    this.ids(chainId);
    const chain = await this.prisma.automation_approval_chains.findUnique({where:{id:chainId}});
    return !!chain && chain.status === 'active' && this.matches(chain.condition,record);
  }
}
