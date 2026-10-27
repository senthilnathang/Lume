import { jest } from '@jest/globals';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { readFileSync } from 'node:fs';
import { createHarness, Harness } from './harness';
import { ValidatePipe } from '../../../src/core/pipes/validation.pipe';
import { WorkflowSchedulesService, nextScheduledRun } from '../../../src/modules/base_automation/services/workflow-schedules.service';
import { MetadataRegistryService } from '../../../src/core/runtime/metadata-registry.service';
import { WorkflowJobsService } from '../../../src/core/workflow/workflow-jobs.service';
import { WorkflowExecutorService } from '../../../src/core/workflow/workflow-executor.service';
import { WorkflowActionsService } from '../../../src/core/workflow/workflow-actions.service';
import { RecordService } from '../../../src/modules/base/services/record.service';
import { EventBusService } from '../../../src/core/runtime/event-bus.service';
import { ExecutionPipelineService } from '../../../src/core/runtime/execution-pipeline.service';
import { sqlStatements } from '../../../migrations/sql-statements';

jest.setTimeout(120000);
describe('tenant-bound durable workflow schedules', () => {
  let h: Harness, schedules: WorkflowSchedulesService, registry: MetadataRegistryService, worker: WorkflowJobsService;
  const priorScheduler = process.env.AUTOMATION_SCHEDULER_ENABLED;
  beforeAll(async () => {
    process.env.AUTOMATION_SCHEDULER_ENABLED = 'false';
    h = await createHarness({ schedules: true }); h.app.useGlobalPipes(new ValidatePipe());
    schedules = h.app.get(WorkflowSchedulesService); registry = h.app.get(MetadataRegistryService);
    const executor = new WorkflowExecutorService(registry, new EventBusService(new EventEmitter2()), new ExecutionPipelineService(), h.prisma);
    const actions = new WorkflowActionsService(h.prisma, h.app.get(RecordService), executor); actions.onModuleInit();
    worker = new WorkflowJobsService(h.prisma, h.app.get(RecordService), registry, executor);
  });
  afterAll(async () => { await h?.close(); if (priorScheduler === undefined) delete process.env.AUTOMATION_SCHEDULER_ENABLED; else process.env.AUTOMATION_SCHEDULER_ENABLED = priorScheduler; });
  beforeEach(async () => {
    await h.prisma.tenantRegistry.deleteMany();
    await h.prisma.workflowSchedule.deleteMany(); await h.prisma.automationReceipt.deleteMany(); await h.prisma.automationJob.deleteMany();
    await h.prisma.recordRule.deleteMany(); await h.seed();
    registry.registerWorkflow({ name: 'scheduled_copy', entity: 'entity_1', trigger: { type: 'manual', key: 'scheduled' }, steps: [{ type: 'create_record', entity: 'entity_1', data: { name: 'Scheduled result' } }] });
    for (const name of ['base_automation.scheduled', 'base_automation.scheduled.manage']) {
      const permission = await h.prisma.permission.create({ data: { name, display_name: name } });
      await h.prisma.rolePermission.create({ data: { roleId: 2, permissionId: permission.id } });
    }
  });
  const definition = () => ({ name: 'Copy', workflowName: 'scheduled_copy', recordId: 1, intervalMinutes: 5, status: 'active' });
  const api = (method: string, suffix = '', body?: any, token?: string | null) => {
    const req = request(h.app.getHttpServer())[method](`/automation/scheduled${suffix}`);
    if (token !== null) req.auth(token ?? h.token('member'), { type: 'bearer' });
    return body === undefined ? req : req.send(body);
  };
  const create = async () => {
    const response = await api('post', '', definition()); expect(response.status).toBe(201); return response.body.data;
  };
  const due = async (id: number) => h.prisma.workflowSchedule.update({ where: { id }, data: { nextRunAt: new Date(Date.now() - 60000) } });
  it('deactivates a due schedule without enqueueing work for an archived tenant', async () => {
    const schedule = await create(); await due(schedule.id);
    await h.prisma.tenantRegistry.create({ data: { id: 1, name: 'One', domain: 'one.example', config: '{}', active: false, deletedAt: new Date() } });
    expect(await schedules.dispatchOne()).toBe(true);
    expect(await h.prisma.automationJob.count()).toBe(0);
    expect(await h.prisma.workflowSchedule.findUnique({ where: { id: schedule.id } })).toMatchObject({ status: 'inactive', nextRunAt: null });
  });
  it('deactivates a due schedule when its member moves to another company', async () => {
    const schedule = await create(); await due(schedule.id);
    await h.prisma.user.update({ where: { id: 2 }, data: { metadata: '{"company_id":2}' } });
    expect(await schedules.dispatchOne()).toBe(true);
    expect(await h.prisma.automationJob.count()).toBe(0);
    expect(await h.prisma.workflowSchedule.findUnique({ where: { id: schedule.id } })).toMatchObject({ status: 'inactive', nextRunAt: null });
  });

  it('requires authentication, management permission, signed tenant and accessible record', async () => {
    expect((await api('post', '', definition(), null)).status).toBe(401);
    expect((await api('post', '', definition(), h.token('none'))).status).toBe(403);
    expect((await api('post', '', definition(), h.token('member', null))).status).toBe(403);
    expect((await api('post', '', { ...definition(), recordId: 4 })).status).toBe(403);
    expect((await api('post', '', { ...definition(), userId: 1 })).status).toBe(400);
    expect(await h.prisma.workflowSchedule.count()).toBe(0);
  });
  it.each([
    { intervalMinutes: 0 }, { intervalMinutes: 1.5 }, { intervalMinutes: null },
    { intervalMinutes: null, cronExpression: 'not cron' }, { cronExpression: '* * * * *' },
    { intervalMinutes: null, cronExpression: '* * * * * *' }, { name: ' ' }, { workflowName: 'unknown' }, { status: null },
  ])('rejects invalid schedules without writes: %j', async changes => {
    expect((await api('post', '', { ...definition(), ...changes })).status).toBe(400);
    expect(await h.prisma.workflowSchedule.count()).toBe(0);
  });
  it('lists only the current actor and tenant, reports disabled worker, and protects identities', async () => {
    const row = await create();
    expect(row).toMatchObject({ companyId: 1, userId: 2, entityId: 1, version: 0 });
    expect((await api('get')).body.data).toMatchObject({ schedulerEnabled: false, items: [expect.objectContaining({ id: row.id })] });
    expect((await api('get', '', undefined, h.token())).body.data.items).toHaveLength(0);
    expect((await api('get', `/${row.id}`, undefined, h.token('member', 2))).status).toBe(404);
    expect((await api('delete', `/${row.id}`, undefined, h.token())).status).toBe(404);
    expect((await api('put', `/${row.id}`, { version: 0, workflowName: 'other' })).status).toBe(400);
    expect((await api('get', '/9007199254740991')).status).toBe(400);
    expect((await api('delete', '/-1')).status).toBe(400);
  });
  it('checks stale versions and switches between interval and UTC cron atomically', async () => {
    const row = await create();
    const changed = await api('put', `/${row.id}`, { version: 0, intervalMinutes: null, cronExpression: '0 * * * *' });
    expect(changed.status).toBe(200); expect(changed.body.data.version).toBe(1);
    expect(new Date(changed.body.data.nextRunAt).getUTCMinutes()).toBe(0);
    expect((await api('put', `/${row.id}`, { version: 0, status: 'inactive' })).status).toBe(409);
    expect((await api('put', `/${row.id}`, { version: 1, cronExpression: 'bad' })).status).toBe(400);
    expect((await api('get', `/${row.id}`)).body.data.cronExpression).toBe('0 * * * *');
    expect((await api('put', `/${row.id}`, { version: 1, status: 'inactive' })).body.data.nextRunAt).toBeNull();
  });
  it('queues one occurrence across concurrent dispatchers, executes it and preserves the pinned definition', async () => {
    const row = await create(); await due(row.id);
    const now = new Date(); await Promise.all([schedules.dispatchOne(now), schedules.dispatchOne(now)]);
    expect(await h.prisma.automationJob.count()).toBe(1);
    const saved = (await api('get', `/${row.id}`)).body.data;
    expect(new Date(saved.nextRunAt).getTime()).toBe(now.getTime() + 300000);
    registry.registerWorkflow({ name: 'scheduled_copy', entity: 'entity_1', trigger: { type: 'manual' }, steps: [] });
    await worker.processOne();
    expect((await h.prisma.automationJob.findFirst()).status).toBe('completed');
    expect(await h.prisma.entityRecord.count({ where: { companyId: 1, data: { contains: 'Scheduled result' } } })).toBe(1);
    expect((await api('get')).body.data.items[0].lastJob.status).toBe('completed');
    expect(await schedules.dispatchOne(now)).toBe(false);
  });
  it('rolls back queue insertion if advancing the schedule fails', async () => {
    const row = await create(); const before = await due(row.id);
    await h.prisma.$executeRawUnsafe("CREATE TRIGGER reject_schedule_advance BEFORE UPDATE ON automation_workflow_schedules FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='test failure'");
    try { await expect(schedules.dispatchOne()).rejects.toThrow(); }
    finally { await h.prisma.$executeRawUnsafe('DROP TRIGGER reject_schedule_advance'); }
    expect(await h.prisma.automationJob.count()).toBe(0);
    expect((await h.prisma.workflowSchedule.findUnique({ where: { id: row.id } })).nextRunAt).toEqual(before.nextRunAt);
  });
  it('deactivates a due schedule when actor permission is revoked', async () => {
    const row = await create(); await due(row.id);
    await h.prisma.rolePermission.deleteMany({ where: { roleId: 2, permission: { name: 'base_automation.scheduled.manage' } } });
    await schedules.dispatchOne();
    expect(await h.prisma.automationJob.count()).toBe(0);
    expect((await h.prisma.workflowSchedule.findUnique({ where: { id: row.id } })).status).toBe('inactive');
  });
  it('does not retarget an existing schedule after workflow and record models change', async () => {
    const row = await create();
    registry.registerWorkflow({ name: 'scheduled_copy', entity: 'entity_2', trigger: { type: 'manual' }, steps: [] });
    await h.prisma.entityRecord.update({ where: { id: 1 }, data: { entityId: 2 } });
    expect((await api('put', `/${row.id}`, { version: 0, status: 'active' })).status).toBe(400);
    expect((await api('get', `/${row.id}`)).body.data).toMatchObject({ entityId: 1, version: 0 });
  });
  it.each(['disable', 'delete', 'revoked-record'])('blocks already queued work after %s', async kind => {
    const row = await create(); await due(row.id); await schedules.dispatchOne();
    if (kind === 'disable') await api('put', `/${row.id}`, { version: 0, status: 'inactive' });
    if (kind === 'delete') await api('delete', `/${row.id}`);
    if (kind === 'revoked-record') await h.prisma.entityRecord.update({ where: { id: 1 }, data: { deletedAt: new Date() } });
    await worker.processOne();
    expect((await h.prisma.automationJob.findFirst()).status).toBe('retry');
    expect(await h.prisma.entityRecord.count({ where: { data: { contains: 'Scheduled result' } } })).toBe(0);
  });
  it('replays migration 019 without modifying canonical or legacy rows', async () => {
    const row = await create();
    const legacy = await h.prisma.automation_scheduled_actions.create({ data: { name: 'Legacy code', config: '{"code":"preserve"}' } });
    const statements = sqlStatements(readFileSync('migrations/019_create_workflow_schedules.sql', 'utf8'));
    for (let i = 0; i < 2; i++) for (const sql of statements) await h.prisma.$executeRawUnsafe(sql);
    expect((await api('get', `/${row.id}`)).status).toBe(200);
    expect((await h.prisma.automation_scheduled_actions.findUnique({ where: { id: legacy.id } })).config).toBe('{"code":"preserve"}');
    await h.prisma.workflowSchedule.deleteMany();
    await h.prisma.$executeRawUnsafe('DROP TABLE automation_workflow_schedules');
    for (const sql of statements) await h.prisma.$executeRawUnsafe(sql);
    expect((await api('post', '', definition())).status).toBe(201);
  });
  it('uses UTC cron and respects the scheduler enable flag', () => {
    expect(nextScheduledRun({ cronExpression: '0 9 * * *' }, new Date('2026-10-26T10:00:00Z')).toISOString()).toBe('2026-10-27T09:00:00.000Z');
    expect(schedules.enabled()).toBe(false);
  });
  it('polls only when scheduler and worker are enabled, and stops cleanly', async () => {
    const row = await create(); await due(row.id);
    const previousWorker = process.env.AUTOMATION_WORKER_ENABLED;
    try {
      process.env.AUTOMATION_SCHEDULER_ENABLED = 'true';
      process.env.AUTOMATION_WORKER_ENABLED = 'false';
      expect(schedules.enabled()).toBe(false);
      process.env.AUTOMATION_WORKER_ENABLED = 'true';
      schedules.onApplicationBootstrap();
      const deadline = Date.now() + 15000;
      while (!await h.prisma.automationJob.count() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
      expect(await h.prisma.automationJob.count()).toBe(1);
    } finally {
      await schedules.onModuleDestroy(); process.env.AUTOMATION_SCHEDULER_ENABLED = 'false';
      if (previousWorker === undefined) delete process.env.AUTOMATION_WORKER_ENABLED; else process.env.AUTOMATION_WORKER_ENABLED = previousWorker;
    }
  });
});
