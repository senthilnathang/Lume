import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@core/services/prisma.service';
import { RecordService } from '@modules/base/services/record.service';
import { compileFlow } from './flow-definition';
import { RbacService } from '@core/services/rbac.service';
import { workflowRecordVisible } from '@core/workflow/workflow-actions.service';

type Actor = { userId: number; companyId: number | null };
@Injectable()
export class FlowRunsService {
  constructor(private prisma: PrismaService, private records: RecordService) {}
  private scope(actor: Actor) {
    if (![actor.userId, actor.companyId].every(id => Number.isSafeInteger(id) && id > 0 && id <= 2147483647)) throw new ForbiddenException('Actor and tenant required');
    return { userId: actor.userId, companyId: actor.companyId as number };
  }
  private id(id: number) { if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) throw new BadRequestException('Invalid ID'); }
  private async accessibleRecord(recordId: number, entityId: number, actor: Actor, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const user = await db.user.findUnique({ where: { id: actor.userId } });
    const role = user && await db.role.findUnique({ where: { id: user.role_id } });
    if (!user?.isActive || !role?.isActive || !await new RbacService(db as any).hasPermission(user.id, 'base.entity_records.read')) throw new ForbiddenException('Flow record is inaccessible');
    const records = tx ? this.records.withTransaction(tx) : this.records;
    const record = await records.getRecord(recordId, actor.companyId, actor.userId, entityId);
    if (!record || !workflowRecordVisible(record, user.id, role.name)) throw new ForbiddenException('Flow record is inaccessible');
    return record;
  }
  private view(job: any) {
    return { id: job.id, status: job.status, attempts: job.attempts, createdAt: job.createdAt, updatedAt: job.updatedAt,
      error: job.lastError ? 'Execution failed; verify current record permissions and flow configuration' : null,
      workerEnabled: process.env.AUTOMATION_WORKER_ENABLED !== 'false' };
  }
  async run(flowId: number, recordId: number, requestId: string, actor: Actor) {
    this.id(flowId); const scope = this.scope(actor);
    const eventKey = `flow:${flowId}:${scope.companyId}:${scope.userId}:${requestId}`;
    const data = await this.prisma.$transaction(async tx => {
      const rows = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`SELECT id FROM automation_flows WHERE id=${flowId} FOR UPDATE`);
      if (!rows.length) throw new NotFoundException('Flow not found');
      const flow = await tx.automation_flows.findUniqueOrThrow({ where: { id: flowId } });
      if (flow.status !== 'active') throw new ConflictException('Activate the flow before running it');
      const definition = compileFlow(flow);
      const entity = await tx.entity.findFirst({ where: { name: flow.model, deletedAt: null } });
      const record = entity && await this.accessibleRecord(recordId, entity.id, scope, tx);
      if (!record) throw new ForbiddenException('Flow record is inaccessible');
      const existing = await tx.automationJob.findUnique({ where: { eventKey } });
      if (existing) {
        if (JSON.parse(existing.payload).recordId !== recordId) throw new ConflictException('Request ID was already used for another record');
        return this.view(existing);
      }
      const job = await tx.automationJob.create({ data: { eventKey, kind: 'workflow', ...scope,
        payload: JSON.stringify({ flowId, workflowName: definition.name, definition, entityId: entity.id, recordId }) } });
      return this.view(job);
    });
    return { success: true, data };
  }
  async get(flowId: number, jobId: number, actor: Actor) {
    this.id(flowId); this.id(jobId); const scope = this.scope(actor);
    const job = await this.prisma.automationJob.findFirst({ where: { id: jobId, kind: 'workflow', ...scope } });
    if (!job) throw new NotFoundException('Flow run not found');
    const payload = JSON.parse(job.payload);
    if (payload.flowId !== flowId) throw new NotFoundException('Flow run not found');
    await this.accessibleRecord(payload.recordId, payload.entityId, scope);
    return { success: true, data: this.view(job) };
  }
  async list(flowId: number, actor: Actor) {
    this.id(flowId); const scope = this.scope(actor);
    const rows = await this.prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      SELECT id FROM automation_jobs WHERE kind='workflow' AND company_id=${scope.companyId} AND user_id=${scope.userId}
      AND CASE WHEN JSON_VALID(payload) THEN JSON_EXTRACT(payload,'$.flowId') ELSE NULL END = ${flowId}
      ORDER BY id DESC LIMIT 25`);
    const items = [];
    for (const row of rows) {
      try { items.push((await this.get(flowId, row.id, actor)).data); }
      catch (error) { if (!(error instanceof ForbiddenException || error instanceof NotFoundException)) throw error; }
    }
    return { success: true, data: { items, workerEnabled: process.env.AUTOMATION_WORKER_ENABLED !== 'false' } };
  }
}
