import { jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHarness, Harness } from './harness';
import { ValidatePipe } from '../../../src/core/pipes/validation.pipe';
import { MetadataRegistryService } from '../../../src/core/runtime/metadata-registry.service';
import { WorkflowExecutorService } from '../../../src/core/workflow/workflow-executor.service';
import { WorkflowActionsService } from '../../../src/core/workflow/workflow-actions.service';
import { WorkflowJobsService } from '../../../src/core/workflow/workflow-jobs.service';
import { RecordService } from '../../../src/modules/base/services/record.service';
import { EventBusService } from '../../../src/core/runtime/event-bus.service';
import { ExecutionPipelineService } from '../../../src/core/runtime/execution-pipeline.service';

jest.setTimeout(120000);
describe('manual flow graphs through the durable worker', () => {
  let h: Harness, worker: WorkflowJobsService, executor: WorkflowExecutorService, actions: WorkflowActionsService;
  beforeAll(async () => { h = await createHarness(); h.app.useGlobalPipes(new ValidatePipe()); });
  afterAll(async () => { await h?.close(); });
  beforeEach(async () => {
    await h.prisma.automationReceipt.deleteMany(); await h.prisma.automationJob.deleteMany(); await h.prisma.automation_flows.deleteMany();
    await h.prisma.recordRule.deleteMany(); await h.seed();
    // Shared flow fixtures must explicitly opt into visibility for the member actor.
    await h.prisma.entityRecord.updateMany({ data: { visibility: 'public' } });
    for (const name of ['base_automation.flows', 'base_automation.flows.manage']) {
      const permission = await h.prisma.permission.create({ data: { name, display_name: name } });
      await h.prisma.rolePermission.create({ data: { roleId: 2, permissionId: permission.id } });
    }
    const registry = new MetadataRegistryService();
    executor = new WorkflowExecutorService(registry, new EventBusService(new EventEmitter2()), new ExecutionPipelineService(), h.prisma);
    actions = new WorkflowActionsService(h.prisma, h.app.get(RecordService), executor); actions.onModuleInit();
    worker = new WorkflowJobsService(h.prisma, h.app.get(RecordService), registry, executor);
  });
  const graph = () => ({ name: 'Manual flow', model: 'entity_1', trigger: 'manual', status: 'active',
    // Array order is deliberately different from edge order.
    nodes: [
      { id: 'create', type: 'action_create_record', config: { entity: 'entity_1', data: { name: '${name}' } } },
      { id: 'end', type: 'end_success' }, { id: 'start', type: 'trigger_manual' },
      { id: 'set', type: 'action_set_field', config: { fieldName: 'name', value: 'Changed by flow' } },
    ], edges: [{ source: 'start', target: 'set' }, { source: 'set', target: 'create' }, { source: 'create', target: 'end' }],
  });
  const api = (method: string, path = '', data?: any, token?: string | null) => {
    const req = request(h.app.getHttpServer())[method](`/automation/flows${path}`);
    if (token !== null) req.auth(token ?? h.token('member'), { type: 'bearer' });
    return data === undefined ? req : req.send(data);
  };
  const create = async (changes = {}) => { const response = await api('post', '', { ...graph(), ...changes }); expect(response.status).toBe(201); return response.body.data.id; };
  const enqueue = (id: number, extra = {}) => api('post', `/${id}/run`, { recordId: 1, requestId: randomUUID(), ...extra });
  const record = async () => JSON.parse((await h.prisma.entityRecord.findUnique({ where: { id: 1 } })).data);

  describe('source record access across the run lifecycle', () => {
    it('rejects queueing another actor’s private record', async () => {
      const id = await create();
      await h.prisma.entityRecord.update({ where: { id: 1 }, data: { visibility: 'private' } });
      expect((await enqueue(id)).status).toBe(403);
      expect(await h.prisma.automationJob.count()).toBe(0);
    });
    it.each(['member', 'admin'])('allows a private record owner or administrator: %s', async actor => {
      const id = await create();
      await h.prisma.entityRecord.update({ where: { id: 1 }, data: { visibility: 'private', createdBy: 2 } });
      const queued = await api('post', `/${id}/run`, { recordId: 1, requestId: randomUUID() }, h.token(actor));
      expect(queued.status).toBe(201);
      await worker.processOne();
      expect((await h.prisma.automationJob.findUnique({ where: { id: queued.body.data.id } })).status).toBe('completed');
      expect((await api('get', `/${id}/runs/${queued.body.data.id}`, undefined, h.token(actor))).status).toBe(200);
    });
    it.each(['private', 'read-permission', 'inactive-actor', 'inactive-role'])('rechecks source access before queueing, history and execution: %s', async reason => {
      const id = await create(); const jobId = (await enqueue(id)).body.data.id;
      if (reason === 'private') await h.prisma.entityRecord.update({ where: { id: 1 }, data: { visibility: 'private' } });
      if (reason === 'read-permission') await h.prisma.rolePermission.deleteMany({ where: { roleId: 2, permission: { name: 'base.entity_records.read' } } });
      if (reason === 'inactive-actor') await h.prisma.user.update({ where: { id: 2 }, data: { isActive: false } });
      if (reason === 'inactive-role') await h.prisma.role.update({ where: { id: 2 }, data: { isActive: false } });
      expect([401, 403]).toContain((await enqueue(id)).status);
      expect([401, 403]).toContain((await api('get', `/${id}/runs/${jobId}`)).status);
      const listed = await api('get', `/${id}/runs`);
      if (listed.status === 200) expect(listed.body.data.items).toEqual([]);
      else expect([401, 403]).toContain(listed.status);
      await worker.processOne();
      expect((await record()).name).toBe('Record 1');
      expect(await h.prisma.entityRecord.count()).toBe(4);
      expect(await h.prisma.automationReceipt.count()).toBe(0);
      expect((await h.prisma.automationJob.findUnique({ where: { id: jobId } })).status).toBe('retry');
    });
    it('rechecks privacy on idempotent submission and retry after partial execution', async () => {
      const id = await create(), requestId = randomUUID();
      const jobId = (await enqueue(id, { requestId })).body.data.id;
      executor.registerActionHandler('create_record', async () => { throw new Error('Transient'); });
      await worker.processOne();
      expect((await record()).name).toBe('Changed by flow');
      await h.prisma.entityRecord.update({ where: { id: 1 }, data: { visibility: 'private' } });
      expect((await enqueue(id, { requestId })).status).toBe(403);
      await h.prisma.automationJob.update({ where: { id: jobId }, data: { availableAt: new Date(0) } });
      executor.registerActionHandler('create_record', (ctx, step) => actions.createRecord(ctx, step));
      await worker.processOne();
      expect(await h.prisma.entityRecord.count()).toBe(4);
      expect(await h.prisma.automationReceipt.count()).toBe(1);
      expect((await h.prisma.automationJob.findUnique({ where: { id: jobId } })).status).toBe('retry');
    });
  });

  describe('durable conditional branches', () => {
    beforeEach(async () => { await h.prisma.entityRecord.updateMany({ data: { visibility: 'public' } }); });
    const branching = (condition: any = { name: 'Record 1' }): any => ({ ...graph(), nodes: [
      { id: 'end', type: 'end_success' }, { id: 'start', type: 'trigger_manual' },
      { id: 'check', type: 'condition_if', config: { condition } },
      { id: 'yes', type: 'action_set_field', config: { fieldName: 'name', value: 'Then' } },
      { id: 'no', type: 'action_set_field', config: { fieldName: 'name', value: 'Else' } },
      { id: 'merge', type: 'action_create_record', config: { entity: 'entity_1', data: { name: '${name}' } } },
    ], edges: [
      { source: 'start', target: 'check' }, { source: 'check', target: 'yes', branch: 'then' },
      { source: 'check', target: 'no', branch: 'else' }, { source: 'yes', target: 'merge' },
      { source: 'no', target: 'merge' }, { source: 'merge', target: 'end' },
    ] });
    it.each([true, false])('executes only the selected path and shared suffix: %s', async matched => {
      const id = await create(branching({ name: matched ? 'Record 1' : 'Other' })); await enqueue(id);
      await worker.processOne();
      expect((await record()).name).toBe(matched ? 'Then' : 'Else');
      expect(await h.prisma.entityRecord.count()).toBe(5);
      expect(await h.prisma.automationReceipt.count()).toBe(3);
      expect(JSON.parse((await h.prisma.automationReceipt.findFirst({ where: { key: { endsWith: ':0' } } })).result)).toEqual({ matched });
      expect((await h.prisma.automationJob.findFirst()).status).toBe('completed');
    });
    it('keeps the saved decision after a branch changes the deciding field and a later action retries', async () => {
      const id = await create(branching()); const jobId = (await enqueue(id)).body.data.id;
      let attempts = 0;
      executor.registerActionHandler('create_record', async (ctx, step) => { if (++attempts === 1) throw new Error('Transient'); return actions.createRecord(ctx, step); });
      await worker.processOne();
      expect((await record()).name).toBe('Then');
      expect(await h.prisma.automationReceipt.count()).toBe(2);
      await h.prisma.automationJob.update({ where: { id: jobId }, data: { availableAt: new Date(0) } });
      await worker.processOne();
      expect((await record()).name).toBe('Then');
      expect(await h.prisma.entityRecord.count()).toBe(5);
      expect(await h.prisma.automationReceipt.count()).toBe(3);
      expect((await h.prisma.automationJob.findFirst()).status).toBe('completed');
    });
    it.each(['secret', 'masked', 'unknown'])('rejects unavailable condition fields: %s', async field => {
      const id = await create(branching({ [field]: 'hidden' })); await enqueue(id); await worker.processOne();
      expect(await h.prisma.automationReceipt.count()).toBe(0);
      expect((await record()).name).toBe('Record 1');
      expect((await h.prisma.automationJob.findFirst()).status).toBe('retry');
    });
    it('rejects another user’s private record', async () => {
      const id = await create(branching()); await enqueue(id);
      await h.prisma.entityRecord.update({ where: { id: 1 }, data: { visibility: 'private' } });
      await worker.processOne();
      expect(await h.prisma.automationReceipt.count()).toBe(0);
      expect((await record()).name).toBe('Record 1');
    });
    it('rechecks field access before replaying a saved decision', async () => {
      const id = await create(branching()); const jobId = (await enqueue(id)).body.data.id;
      executor.registerActionHandler('create_record', async () => { throw new Error('Transient'); });
      await worker.processOne();
      await h.prisma.entityFieldPermission.create({ data: { fieldId: 1, roleId: 2, canRead: false } });
      await h.prisma.automationJob.update({ where: { id: jobId }, data: { availableAt: new Date(0) } });
      executor.registerActionHandler('create_record', (ctx, step) => actions.createRecord(ctx, step));
      await worker.processOne();
      expect(await h.prisma.entityRecord.count()).toBe(4);
      expect((await h.prisma.automationJob.findFirst()).status).toBe('retry');
      expect(await h.prisma.automationReceipt.count()).toBe(2);
    });
    it('does not execute either path if decision receipt persistence fails', async () => {
      const id = await create(branching()); await enqueue(id);
      await h.prisma.$executeRawUnsafe("CREATE TRIGGER reject_branch_receipt BEFORE INSERT ON automation_receipts FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='test failure'");
      try { await worker.processOne(); } finally { await h.prisma.$executeRawUnsafe('DROP TRIGGER reject_branch_receipt'); }
      expect(await h.prisma.automationReceipt.count()).toBe(0);
      expect((await record()).name).toBe('Record 1');
      expect(await h.prisma.entityRecord.count()).toBe(4);
    });
    it.each([null, [], { name: { $script: 'x' } }, { name: { $gt: '1' } }])('rejects invalid predicates: %j', async condition => {
      expect((await api('post', '', branching(condition))).status).toBe(400);
    });
    it.each(['missing-label', 'duplicate-label', 'cycle', 'invalid-unselected'])('rejects invalid branch graphs: %s', async reason => {
      const definition = branching();
      if (reason === 'missing-label') delete definition.edges[1].branch;
      if (reason === 'duplicate-label') definition.edges[2].branch = 'then';
      if (reason === 'cycle') definition.edges[4].target = 'check';
      if (reason === 'invalid-unselected') definition.nodes[4].config = {};
      expect((await api('post', '', definition)).status).toBe(400);
    });
  });

  describe('in-app notification nodes', () => {
    beforeEach(async () => {
      await h.prisma.notifications.deleteMany();
      await h.prisma.entityRecord.updateMany({ data: { visibility: 'public' } });
      await h.prisma.user.create({ data: { id: 4, firstName: 'Recipient', lastName: 'Test', email: 'recipient@test.local', password: 'test', role_id: 2, isActive: true } });
    });
    const notificationGraph = (config: any = { recipientId: 4, title: 'Flow notice', message: '${name}' }) => {
      const definition: any = graph();
      definition.nodes[3] = { id: 'set', type: 'action_send_notification', config };
      return definition;
    };
    it('creates one scoped inbox notification and pins its configuration', async () => {
      const id = await create(notificationGraph()); await enqueue(id);
      await api('put', `/${id}`, { nodes: notificationGraph({ recipientId: 2, message: 'Later graph' }).nodes });
      await worker.processOne();
      expect(await h.prisma.notifications.findMany()).toEqual([expect.objectContaining({ user_id: 4, company_id: 1, channel: 'in_app', title: 'Flow notice', message: 'Record 1', related_model: 'entity_1', related_id: 1 })]);
      expect((await h.prisma.automationJob.findFirst()).status).toBe('completed');
      expect(await h.prisma.automationJob.count({ where: { kind: 'delivery' } })).toBe(0);
    });
    it.each([
      {}, { recipientId: '4', message: 'x' }, { recipientId: 0, message: 'x' }, { recipientId: 2147483648, message: 'x' },
      { recipientId: 4, message: '' }, { recipientId: 4, message: 'x'.repeat(10001) },
      { recipientId: 4, title: 'x'.repeat(256), message: 'x' }, { recipientId: 4, title: '', message: 'x' },
      { recipientId: 4, message: 'x', channel: 'email' }, { recipientId: 4, message: 'x', companyId: 2 },
    ])('rejects invalid or external notification configuration: %j', async config => {
      expect((await api('post', '', notificationGraph(config))).status).toBe(400);
      expect(await h.prisma.automation_flows.count()).toBe(0);
    });
    it.each(['inactive-recipient', 'missing-recipient', 'private-source', 'private-recipient', 'read-permission', 'record-rule', 'hidden-field', 'hidden-sender-field'])('blocks notification access failures: %s', async reason => {
      const config = { recipientId: reason === 'hidden-sender-field' ? 1 : 4, message: reason.includes('field') ? '${secret}' : '${name}' };
      const id = await create(notificationGraph(config)); await enqueue(id);
      if (reason === 'inactive-recipient') await h.prisma.user.update({ where: { id: 4 }, data: { isActive: false } });
      if (reason === 'missing-recipient') await h.prisma.user.delete({ where: { id: 4 } });
      if (reason === 'private-source') await h.prisma.entityRecord.update({ where: { id: 1 }, data: { visibility: 'private' } });
      if (reason === 'private-recipient') await h.prisma.entityRecord.update({ where: { id: 1 }, data: { visibility: 'private', createdBy: 2 } });
      if (reason === 'read-permission') await h.prisma.rolePermission.deleteMany({ where: { roleId: 2, permission: { name: 'base.entity_records.read' } } });
      if (reason === 'record-rule') await h.prisma.recordRule.create({ data: { name: 'Deny recipient', modelName: 'entity_1', action: 'read', users: '[4]', domain: '{"name":"Other"}' } });
      await worker.processOne();
      expect(await h.prisma.notifications.count()).toBe(0);
      expect(await h.prisma.automationReceipt.count()).toBe(0);
      expect((await h.prisma.automationJob.findFirst()).status).toBe('retry');
    });
    it.each([2, 1])('allows the owner and administrator recipients on private records: %s', async recipientId => {
      await h.prisma.entityRecord.update({ where: { id: 1 }, data: { visibility: 'private', createdBy: 2 } });
      const id = await create(notificationGraph({ recipientId, message: '${name}' })); await enqueue(id); await worker.processOne();
      expect(await h.prisma.notifications.findMany()).toEqual([expect.objectContaining({ user_id: recipientId, message: 'Record 1' })]);
    });
    it('masks template values before writing the notification', async () => {
      const id = await create(notificationGraph({ recipientId: 1, message: '${masked}' })); await enqueue(id); await worker.processOne();
      expect((await h.prisma.notifications.findFirst()).message).toBe('****');
    });
    it('does not duplicate a committed notification when the next action retries', async () => {
      const id = await create(notificationGraph()); const jobId = (await enqueue(id)).body.data.id;
      let attempts = 0;
      executor.registerActionHandler('create_record', async (ctx, step) => { if (++attempts === 1) throw new Error('Transient'); return actions.createRecord(ctx, step); });
      await worker.processOne();
      expect(await h.prisma.notifications.count()).toBe(1);
      await h.prisma.automationJob.update({ where: { id: jobId }, data: { availableAt: new Date(0) } });
      await worker.processOne();
      expect(await h.prisma.notifications.count()).toBe(1);
      expect((await h.prisma.automationJob.findUnique({ where: { id: jobId } })).status).toBe('completed');
    });
    it('rolls back notification creation when the durable receipt fails', async () => {
      const id = await create(notificationGraph()); await enqueue(id);
      await h.prisma.$executeRawUnsafe("CREATE TRIGGER reject_notification_receipt BEFORE INSERT ON automation_receipts FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='test failure'");
      try { await worker.processOne(); } finally { await h.prisma.$executeRawUnsafe('DROP TRIGGER reject_notification_receipt'); }
      expect(await h.prisma.notifications.count()).toBe(0);
      expect(await h.prisma.automationReceipt.count()).toBe(0);
    });
  });

  it('rejects invalid active graphs while preserving draft editing', async () => {
    const bad = [
      { trigger: 'record' }, { nodes: [] }, { edges: [] },
      { nodes: [...graph().nodes, graph().nodes[0]] },
      { nodes: [...graph().nodes, { id: 'orphan', type: 'action_set_field', config: { fieldName: 'name', value: 'x' } }] },
      { nodes: graph().nodes.map(n => n.id === 'set' ? { ...n, type: 'action_delete_record' } : n) },
      { edges: [...graph().edges, { source: 'start', target: 'end' }] },
      { edges: graph().edges.map(e => ({ ...e, condition: 'true' })) },
      { nodes: graph().nodes.map(n => n.id === 'set' ? { ...n, config: { fieldName: '__proto__', value: 'bad' } } : n) },
    ];
    for (const change of bad) expect((await api('post', '', { ...graph(), ...change })).status).toBe(400);
    expect(await h.prisma.automation_flows.count()).toBe(0);
    const id = await create({ status: 'draft', nodes: [], edges: [] });
    expect((await api('put', `/${id}`, { status: 'active' })).status).toBe(400);
    expect((await enqueue(id)).status).toBe(409);
    const active = await create();
    expect((await api('put', `/${active}`, { edges: [] })).status).toBe(400);
    expect((await api('get', `/${active}`)).body.data.edges).toEqual(graph().edges);
    expect((await api('put', `/${active}`, { status: null })).status).toBe(400);
  });
  it('requires identity, permissions, tenant and record access before queueing', async () => {
    const id = await create();
    for (const token of [null, h.token('none'), h.token('member', null)]) {
      expect([401, 403]).toContain((await api('post', `/${id}/run`, { recordId: 1, requestId: randomUUID() }, token)).status);
    }
    expect((await enqueue(id, { recordId: 4 })).status).toBe(403);
    expect((await enqueue(id, { userId: 1 })).status).toBe(400);
    expect((await enqueue(id, { requestId: 'invalid' })).status).toBe(400);
    expect(await h.prisma.automationJob.count()).toBe(0);
  });

  it('updates multiple source fields atomically with typed values and current variables', async () => {
    await h.prisma.entityField.createMany({ data: [
      { entityId: 1, name: 'count', slug: 'count', label: 'Count', type: 'integer' },
      { entityId: 1, name: 'enabled', slug: 'enabled', label: 'Enabled', type: 'boolean' },
      { entityId: 1, name: 'note', slug: 'note', label: 'Note', type: 'string' },
      { entityId: 1, name: 'details', slug: 'details', label: 'Details', type: 'json' },
    ] });
    const definition: any = graph();
    definition.nodes[3] = { id: 'set', type: 'action_update_record', config: { data: {
      name: 'Changed together', count: 0, enabled: false, note: null, details: { previousName: '${name}', values: [0, false, null] },
    } } };
    const id = await create(definition); await enqueue(id); await worker.processOne();
    expect(await record()).toMatchObject({ name: 'Changed together', count: 0, enabled: false, note: null,
      details: { previousName: 'Record 1', values: [0, false, null] } });
    // The next action observes the committed update, not the old input snapshot.
    expect(await h.prisma.entityRecord.count({ where: { data: { contains: 'Changed together' } } })).toBe(2);
    expect(await h.prisma.automationReceipt.count()).toBe(2);
    expect((await h.prisma.automationJob.findFirst()).status).toBe('completed');
  });

  it.each([
    {}, { data: {} }, { data: [] }, { data: null }, { data: { name: 'x' }, recordId: 2 },
    { data: { name: 'x' }, entity: 'entity_2' }, { data: { 'bad field': 1 } },
    { data: Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`field${i}`, i])) },
    JSON.parse('{"data":{"__proto__":{"polluted":true}}}'),
  ])('rejects invalid multi-field update configuration before activation: %j', async config => {
    const definition: any = graph();
    definition.nodes[3] = { id: 'set', type: 'action_update_record', config };
    expect((await api('post', '', definition)).status).toBe(400);
    expect(await h.prisma.automation_flows.count()).toBe(0);
  });

  it.each([
    { name: 'Must not persist', readonly: 'Denied' },
    { name: '', masked: 'Must not persist' },
    { name: 'Must not persist', unknown: 'Denied' },
    { name: 'Must not persist', masked: '${secret}' },
  ])('rolls back the entire action when one field fails: %j', async data => {
    const original = await record(), definition: any = graph();
    definition.nodes[3] = { id: 'set', type: 'action_update_record', config: { data } };
    const id = await create(definition); await enqueue(id); await worker.processOne();
    expect(await record()).toEqual(original);
    expect(await h.prisma.automationReceipt.count()).toBe(0);
    expect(await h.prisma.entityRecord.count()).toBe(4);
    expect((await h.prisma.automationJob.findFirst()).status).toBe('retry');
  });
  it('follows edges, persists changes, pins the graph, and scopes run history', async () => {
    const id = await create(); const run = await enqueue(id); expect(run.status).toBe(201);
    const jobId = run.body.data.id;
    const changed = graph(); changed.nodes[3].config.value = 'Later edit';
    expect((await api('put', `/${id}`, { nodes: changed.nodes })).status).toBe(200);
    await worker.processOne();
    expect((await record()).name).toBe('Changed by flow');
    expect(await h.prisma.entityRecord.count({ where: { data: { contains: 'Changed by flow' } } })).toBe(2);
    const detail = await api('get', `/${id}/runs/${jobId}`);
    expect(detail.body.data.status).toBe('completed'); expect(detail.body.data).not.toHaveProperty('result');
    expect(detail.body.data).not.toHaveProperty('payload');
    expect((await api('get', `/${id}/runs`)).body.data.items).toHaveLength(1);
    expect((await api('get', `/${id}/runs/${jobId}`, undefined, h.token())).status).toBe(404);
    expect((await api('get', `/${id}/runs/${jobId}`, undefined, h.token('member', 2))).status).toBe(404);
    await h.prisma.entityRecord.update({ where: { id: 1 }, data: { deletedAt: new Date() } });
    expect((await api('get', `/${id}/runs`)).body.data.items).toHaveLength(0);
  });
  it('deduplicates concurrent submissions and rejects reuse for another record', async () => {
    const id = await create(), requestId = randomUUID();
    const results = await Promise.all([enqueue(id, { requestId }), enqueue(id, { requestId })]);
    expect(results.map(r => r.status)).toEqual([201, 201]);
    expect(results[0].body.data.id).toBe(results[1].body.data.id);
    expect(await h.prisma.automationJob.count()).toBe(1);
    expect((await enqueue(id, { requestId, recordId: 2 })).status).toBe(409);
  });
  it.each(['single', 'multiple'])('does not repeat committed %s-field steps when a later step retries', async kind => {
    const definition: any = graph();
    if (kind === 'multiple') definition.nodes[3] = { id: 'set', type: 'action_update_record', config: { data: { name: 'Changed by flow', masked: 'Together' } } };
    const id = await create(definition); const response = await enqueue(id); const jobId = response.body.data.id;
    let attempts = 0;
    executor.registerActionHandler('create_record', async (ctx, step) => { if (++attempts === 1) throw new Error('Transient'); return actions.createRecord(ctx, step); });
    await worker.processOne();
    expect((await h.prisma.automationJob.findUnique({ where: { id: jobId } })).status).toBe('retry');
    expect(await h.prisma.automationReceipt.count()).toBe(1);
    await h.prisma.entityRecord.update({ where: { id: 1 }, data: { data: JSON.stringify({ ...(await record()), name: 'Changed between attempts', masked: 'Later' }) } });
    await h.prisma.automationJob.update({ where: { id: jobId }, data: { availableAt: new Date(0) } });
    await worker.processOne();
    expect((await record()).name).toBe('Changed between attempts');
    expect((await record()).masked).toBe('Later');
    expect(await h.prisma.automationReceipt.count()).toBe(2);
    expect(await h.prisma.entityRecord.count()).toBe(5);
    expect((await h.prisma.automationJob.findUnique({ where: { id: jobId } })).status).toBe('completed');
  });
  it.each(['readonly', 'hidden', 'permission', 'run-permission', 'record-rule', 'inactive', 'deleted-flow'])('blocks unauthorized effects: %s', async reason => {
    const definition = graph();
    if (reason === 'readonly') definition.nodes[3].config = { fieldName: 'readonly', value: 'Denied' };
    if (reason === 'hidden') definition.nodes[3].config = { fieldName: 'name', value: '${secret}' };
    const id = await create(definition); await enqueue(id);
    if (reason === 'permission') await h.prisma.rolePermission.deleteMany({ where: { roleId: 2, permission: { name: 'base.entity_records.update' } } });
    if (reason === 'run-permission') await h.prisma.rolePermission.deleteMany({ where: { roleId: 2, permission: { name: 'base_automation.flows.manage' } } });
    if (reason === 'record-rule') await h.prisma.recordRule.create({ data: { name: 'Deny', modelName: 'entity_1', action: 'write', groups: '[2]', domain: '{"name":"Other"}' } });
    if (reason === 'inactive') await api('put', `/${id}`, { status: 'inactive' });
    if (reason === 'deleted-flow') await api('delete', `/${id}`);
    await worker.processOne();
    expect((await h.prisma.automationJob.findFirst()).status).toBe('retry');
    expect((await record()).name).toBe('Record 1');
    expect((await record()).readonly).toBe('fixed');
    expect(await h.prisma.entityRecord.count()).toBe(4);
  });
  it.each(['single', 'multiple'])('rolls back a %s-field update when its idempotency receipt cannot persist', async kind => {
    const definition: any = graph();
    if (kind === 'multiple') definition.nodes[3] = { id: 'set', type: 'action_update_record', config: { data: { name: 'Changed by flow', masked: 'Together' } } };
    const id = await create(definition); await enqueue(id);
    await h.prisma.$executeRawUnsafe("CREATE TRIGGER reject_flow_receipt BEFORE INSERT ON automation_receipts FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='test failure'");
    try { await worker.processOne(); } finally { await h.prisma.$executeRawUnsafe('DROP TRIGGER reject_flow_receipt'); }
    expect((await record()).name).toBe('Record 1'); expect(await h.prisma.automationReceipt.count()).toBe(0);
    expect((await record()).masked).toBe('1234');
  });
});
