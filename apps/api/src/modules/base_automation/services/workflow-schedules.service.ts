import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnApplicationBootstrap } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import cronParser from 'cron-parser';
import { PrismaService } from '@core/services/prisma.service';
import { assertTenantAccess } from '@core/services/tenant-access';
import { assertActorCompany } from '@core/services/tenant-membership';
import { MetadataRegistryService } from '@core/runtime/metadata-registry.service';
import { RbacService } from '@core/services/rbac.service';
import { RecordService } from '@modules/base/services/record.service';
import { CreateWorkflowScheduleDto, UpdateWorkflowScheduleDto } from '../dtos/workflow-schedule.dto';

type Actor = { userId: number; companyId: number | null };
type Timing = { cronExpression?: string | null; intervalMinutes?: number | null };

export function nextScheduledRun(timing: Timing, now: Date): Date {
  const cron = timing.cronExpression;
  const minutes = timing.intervalMinutes;
  if (cron != null && minutes != null || cron == null && minutes == null) throw new BadRequestException('Choose cron or interval, not both');
  if (cron != null) {
    if (typeof cron !== 'string' || cron.trim().split(/\s+/).length !== 5) throw new BadRequestException('Use a five-field UTC cron expression');
    try { return cronParser.parseExpression(cron, { currentDate: now, tz: 'UTC' }).next().toDate(); }
    catch { throw new BadRequestException('Invalid cron expression'); }
  }
  if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > 525600) throw new BadRequestException('Interval must be 1–525600 minutes');
  return new Date(now.getTime() + minutes * 60000);
}

@Injectable()
export class WorkflowSchedulesService implements OnApplicationBootstrap, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private active?: Promise<boolean>;
  private logger = new Logger(WorkflowSchedulesService.name);
  constructor(private prisma: PrismaService, private registry: MetadataRegistryService, private records: RecordService) {}
  enabled() { return process.env.AUTOMATION_SCHEDULER_ENABLED === 'true' && process.env.AUTOMATION_WORKER_ENABLED !== 'false'; }
  onApplicationBootstrap() {
    if (!this.enabled()) return;
    this.timer = setInterval(() => {
      if (!this.active) this.active = this.dispatchOne().catch(() => { this.logger.error('Schedule dispatch failed; will retry'); return false; }).finally(() => { this.active = undefined; });
    }, 5000);
    this.timer.unref();
  }
  async onModuleDestroy() { if (this.timer) clearInterval(this.timer); await this.active; }
  private scope(actor: Actor) {
    if (![actor.userId, actor.companyId].every(id => Number.isSafeInteger(id) && id > 0 && id <= 2147483647)) throw new ForbiddenException('Signed actor and tenant required');
    return { userId: actor.userId, companyId: actor.companyId as number };
  }
  workflows() { return this.registry.listWorkflows().map(w => ({ name: w.name, entity: w.entity })); }
  private async target(workflowName: string, recordId: number, actor: Actor) {
    const scope = this.scope(actor);
    await assertTenantAccess(this.prisma, scope.companyId);
    const user = await this.prisma.user.findUnique({ where: { id: actor.userId } });
    const role = user && await this.prisma.role.findUnique({ where: { id: user.role_id } });
    if (!user?.isActive || !role?.isActive || !await new RbacService(this.prisma).hasPermission(actor.userId, 'base_automation.scheduled.manage')) throw new ForbiddenException('Schedule actor access revoked');
    assertActorCompany({ ...user, role }, scope.companyId);
    const definition = this.registry.getWorkflow(workflowName);
    if (!definition) throw new BadRequestException('Registered workflow required');
    const entity = await this.prisma.entity.findFirst({ where: { name: definition.entity, deletedAt: null } });
    const record = entity && await this.records.getRecord(recordId, scope.companyId, scope.userId, entity.id);
    if (!record) throw new ForbiddenException('Schedule record is inaccessible');
    return { definition, entityId: entity.id };
  }
  async list(actor: Actor) {
    const rows = await this.prisma.workflowSchedule.findMany({ where: this.scope(actor), orderBy: { id: 'desc' }, take: 200 });
    const items = await Promise.all(rows.map(async row => ({ ...row, lastJob: row.lastJobId ? await this.prisma.automationJob.findFirst({
      where: { id: row.lastJobId, ...this.scope(actor) }, select: { id: true, status: true, attempts: true },
    }) : null })));
    return { success: true, data: { items, schedulerEnabled: this.enabled() } };
  }
  async get(id: number, actor: Actor) {
    this.validateId(id);
    const row = await this.prisma.workflowSchedule.findFirst({ where: { id, ...this.scope(actor) } });
    if (!row) throw new NotFoundException('Schedule not found');
    return { success: true, data: row };
  }
  async create(dto: CreateWorkflowScheduleDto, actor: Actor) {
    const scope = this.scope(actor);
    if (!dto.name.trim() || dto.status === null) throw new BadRequestException('Name and valid status required');
    const nextRunAt = nextScheduledRun(dto, new Date());
    const target = await this.target(dto.workflowName, dto.recordId, actor);
    const data = await this.prisma.workflowSchedule.create({ data: {
      name: dto.name.trim(), workflowName: dto.workflowName, recordId: dto.recordId, entityId: target.entityId, ...scope,
      cronExpression: dto.cronExpression ?? null, intervalMinutes: dto.intervalMinutes ?? null,
      status: dto.status ?? 'inactive', nextRunAt: dto.status === 'active' ? nextRunAt : null,
    } });
    return { success: true, data };
  }
  private async locked(tx: Prisma.TransactionClient, id: number, actor: Actor) {
    this.validateId(id);
    const scope = this.scope(actor);
    const rows = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`SELECT id FROM automation_workflow_schedules WHERE id=${id} AND company_id=${scope.companyId} AND user_id=${scope.userId} FOR UPDATE`);
    if (!rows.length) throw new NotFoundException('Schedule not found');
    return tx.workflowSchedule.findUniqueOrThrow({ where: { id } });
  }
  private validateId(id: number) {
    if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) throw new BadRequestException('Invalid schedule ID');
  }
  async update(id: number, dto: UpdateWorkflowScheduleDto, actor: Actor) {
    return this.prisma.$transaction(async tx => {
      const current = await this.locked(tx, id, actor);
      if (dto.version !== current.version) throw new ConflictException('Schedule changed; reload before saving');
      const updates = Object.fromEntries(Object.entries(dto).filter(([key, value]) => key !== 'version' && value !== undefined));
      const merged = { ...current, ...updates };
      if (!merged.name?.trim() || !['active', 'inactive'].includes(merged.status)) throw new BadRequestException('Name and valid status required');
      const next = nextScheduledRun(merged, new Date());
      if (merged.status === 'active') {
        const target = await this.target(current.workflowName, current.recordId, actor);
        if (target.entityId !== current.entityId) throw new BadRequestException('Workflow model changed; create a new schedule');
      }
      const reschedule = dto.cronExpression !== undefined || dto.intervalMinutes !== undefined || dto.status !== undefined;
      const data = await tx.workflowSchedule.update({ where: { id }, data: {
        ...updates, name: merged.name.trim(), version: { increment: 1 }, lastError: null,
        nextRunAt: merged.status !== 'active' ? null : reschedule ? next : current.nextRunAt,
      } });
      return { success: true, data };
    });
  }
  async remove(id: number, actor: Actor) {
    await this.prisma.$transaction(async tx => { await this.locked(tx, id, actor); await tx.workflowSchedule.delete({ where: { id } }); });
    return { success: true, data: { deleted: true } };
  }
  /** Atomic outbox dispatch. Missed occurrences coalesce to one job, then advance from now. */
  async dispatchOne(now = new Date()): Promise<boolean> {
    return this.prisma.$transaction(async tx => {
      const rows = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`SELECT id FROM automation_workflow_schedules WHERE status='active' AND next_run_at<=${now} ORDER BY next_run_at,id LIMIT 1 FOR UPDATE SKIP LOCKED`);
      if (!rows.length) return false;
      const schedule = await tx.workflowSchedule.findUniqueOrThrow({ where: { id: rows[0].id } });
      let target: Awaited<ReturnType<WorkflowSchedulesService['target']>>;
      let nextRunAt: Date;
      try {
        target = await this.target(schedule.workflowName, schedule.recordId, schedule);
        if (target.entityId !== schedule.entityId) throw new ForbiddenException('Schedule model changed');
        nextRunAt = nextScheduledRun(schedule, now);
      } catch (error) {
        if (!(error instanceof BadRequestException || error instanceof ForbiddenException || error instanceof NotFoundException)) throw error;
        await tx.workflowSchedule.update({ where: { id: schedule.id }, data: { status: 'inactive', nextRunAt: null, lastError: 'Workflow or record access is unavailable; review before reactivating', version: { increment: 1 } } });
        return true;
      }
      const job = await tx.automationJob.create({ data: {
        eventKey: `schedule:${schedule.id}:${schedule.version}:${schedule.nextRunAt.toISOString()}`, kind: 'workflow', userId: schedule.userId, companyId: schedule.companyId,
        payload: JSON.stringify({ workflowName: schedule.workflowName, entityId: schedule.entityId, recordId: schedule.recordId,
          definition: target.definition, scheduleId: schedule.id, scheduleVersion: schedule.version }),
      } });
      await tx.workflowSchedule.update({ where: { id: schedule.id }, data: { nextRunAt, lastQueuedAt: now, lastJobId: job.id, lastError: null } });
      return true;
    });
  }
}
