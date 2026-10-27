import { jest } from '@jest/globals';
import request from 'supertest';
import { ValidatePipe } from '../../../src/core/pipes/validation.pipe';
import { createHarness, Harness } from './harness';

jest.setTimeout(120000);
describe('manual workflow state executions', () => {
  let h: Harness;
  let workflowId: number;
  let failHistory = false;
  const states = [{ code: 'new', name: 'New label', is_start: true }, { code: 'review', name: 'Review label' }, { code: 'done', name: 'Done label', is_end: true }];
  const transitions = [{ code: 'review', name: 'Review', from_state: 'new', to_state: 'review' }, { code: 'finish', name: 'Finish', from_state: 'review', to_state: 'done' }];
  beforeAll(async () => {
    h = await createHarness();
    h.app.useGlobalPipes(new ValidatePipe());
    h.prisma.$use(async (params, next) => {
      if (failHistory && params.model === 'WorkflowStateHistory' && params.action === 'create' && params.args.data.version === 1) throw new Error('Injected history failure');
      return next(params);
    });
  });
  afterAll(async () => { await h?.close(); });
  beforeEach(async () => {
    failHistory = false;
    await h.prisma.workflowStateExecution.deleteMany();
    await h.prisma.automation_workflows.deleteMany();
    await h.prisma.recordRule.deleteMany();
    await h.seed();
    await h.prisma.entityRecord.updateMany({ data: { visibility: 'public' } });
    for (const name of ['base_automation.workflows', 'base_automation.workflows.manage', 'base.records.read', 'base.records.write']) {
      const p = await h.prisma.permission.create({ data: { name, display_name: name } });
      await h.prisma.rolePermission.create({ data: { roleId: 2, permissionId: p.id } });
    }
    workflowId = (await h.prisma.automation_workflows.create({ data: {
      name: 'Manual review', model: 'entity_1', status: 'active', initial_state: 'new', states: JSON.stringify(states), transitions: JSON.stringify(transitions),
    } })).id;
  });
  const http = (method: 'get' | 'post', path: string, body = {}, token?: string | null, wf = workflowId) => {
    let req = request(h.app.getHttpServer())[method](`/automation/workflows/${wf}/${path}`);
    if (token !== null) req = req.auth(token ?? h.token('member'), { type: 'bearer' });
    return method === 'post' ? req.send(body) : req;
  };
  const start = async (record = 1) => {
    const response = await http('post', `run/${record}`);
    expect(response.status).toBe(201);
    return response.body.data;
  };
  const step = (id: number, transitionCode: string, version: number, token?: string) => http('post', `executions/${id}/transition`, { transitionCode, version }, token);

  it('persists state codes, server actor, snapshot and atomic history through completion', async () => {
    const original = await h.prisma.entityRecord.findUnique({ where: { id: 1 } });
    const execution = await start();
    expect(execution).toMatchObject({ recordId: 1, currentState: 'new', status: 'active', version: 0, initiatedBy: 2, companyId: 1 });
    expect(execution).not.toHaveProperty('definition');
    expect((await step(execution.id, 'review', 0)).body.data).toMatchObject({ currentState: 'review', version: 1 });
    const finished = await step(execution.id, 'finish', 1);
    expect(finished.status).toBe(200);
    expect(finished.body.data).toMatchObject({ status: 'completed', currentState: 'done', version: 2 });
    expect(finished.body.data.completedAt).not.toBeNull();
    const detail = await http('get', `executions/${execution.id}`);
    expect(detail.body.data.history.map((row: any) => [row.transitionCode, row.version, row.userId])).toEqual([['START', 0, 2], ['review', 1, 2], ['finish', 2, 2]]);
    expect(detail.body.data.workflow.name).toBe('Manual review');
    expect(await h.prisma.entityRecord.findUnique({ where: { id: 1 } })).toEqual(original);
    expect((await step(execution.id, 'finish', 2)).status).toBe(409);
  });
  it('requires authentication, tenant, workflow permission and record access', async () => {
    expect((await http('post', 'run/1', {}, null)).status).toBe(401);
    expect((await http('post', 'run/1', {}, h.token('member', null))).status).toBe(403);
    expect((await http('post', 'run/1', {}, h.token('none'))).status).toBe(403);
    expect((await http('post', 'run/4')).status).toBe(404);
    expect((await http('post', 'run/1').set('x-org-id', '2')).status).toBe(403);
    await h.prisma.entityRecord.update({ where: { id: 1 }, data: { visibility: 'private' } });
    expect((await http('post', 'run/1')).status).toBe(403);
    expect(await h.prisma.workflowStateExecution.count()).toBe(0);
  });
  it('binds reads and writes to the execution tenant and workflow', async () => {
    const execution = await start();
    expect((await http('get', `executions/${execution.id}`, {}, h.token('member', 2))).status).toBe(404);
    expect((await http('get', `executions/${execution.id}`, {}, undefined, workflowId + 1)).status).toBe(404);
    expect((await http('post', `executions/${execution.id}/transition`, { transitionCode: 'review', version: 0 }, h.token('member', 2))).status).toBe(404);
    expect(await h.prisma.workflowStateHistory.count()).toBe(1);
  });
  it('rechecks record rules and permissions after the execution was started', async () => {
    const execution = await start();
    await h.prisma.recordRule.create({ data: { name: 'Block writes', modelName: 'entity_1', action: 'write', domain: '{"name":{"eq":"not this record"}}', isActive: true } });
    expect((await step(execution.id, 'review', 0)).status).toBe(403);
    expect(await h.prisma.workflowStateHistory.count()).toBe(1);
    await h.prisma.recordRule.deleteMany();
    const permission = await h.prisma.permission.findFirst({ where: { name: 'base.records.read' } });
    await h.prisma.rolePermission.deleteMany({ where: { roleId: 2, permissionId: permission.id } });
    expect((await http('get', `executions/${execution.id}`)).status).toBe(403);
  });
  it('rejects arbitrary destinations, unknown codes, wrong-source transitions and stale/replayed decisions', async () => {
    const execution = await start();
    expect((await http('post', `executions/${execution.id}/transition`, { toState: 'done', transitionName: 'Skip', version: 0 })).status).toBe(400);
    expect((await step(execution.id, 'missing', 0)).status).toBe(400);
    expect((await step(execution.id, 'finish', 0)).status).toBe(400);
    const concurrent = await Promise.all([step(execution.id, 'review', 0), step(execution.id, 'review', 0)]);
    expect(concurrent.map(row => row.status).sort()).toEqual([200, 409]);
    expect((await step(execution.id, 'review', 0)).status).toBe(409);
    expect(await h.prisma.workflowStateHistory.count()).toBe(2);
  });
  it('rolls back the state update when history cannot be persisted', async () => {
    const execution = await start();
    failHistory = true;
    expect((await step(execution.id, 'review', 0)).status).toBe(500);
    const row = await h.prisma.workflowStateExecution.findUnique({ where: { id: execution.id } });
    expect(row).toMatchObject({ currentState: 'new', version: 0, status: 'active' });
    expect(await h.prisma.workflowStateHistory.count()).toBe(1);
  });
  it('keeps a definition snapshot when the original is edited or deleted', async () => {
    const execution = await start();
    await h.prisma.automation_workflows.delete({ where: { id: workflowId } });
    expect((await step(execution.id, 'review', 0)).status).toBe(200);
    const detail = await http('get', `executions/${execution.id}`);
    expect(detail.body.data.workflow.transitions[1].code).toBe('finish');
    expect(detail.body.data.workflow.name).toBe('Manual review');
  });
  it.each([{ required_groups: [1] }, { timer_hours: 1 }, { webhook_url: 'https://example.invalid' }, { actions: [{ type: 'request_approval' }] }])('fails closed for unsupported transition behavior %s', async config => {
    await h.prisma.automation_workflows.update({ where: { id: workflowId }, data: { transitions: JSON.stringify([{ ...transitions[0], ...config }, transitions[1]]) } });
    const execution = await start();
    expect((await http('get', `executions/${execution.id}`)).body.data.workflow.transitions[0].unavailableReason).toBeTruthy();
    expect((await step(execution.id, 'review', 0)).status).toBe(409);
    expect(await h.prisma.workflowStateHistory.count()).toBe(1);
  });
  it('evaluates snapshot conditions against current record data and leaves blocked history unchanged', async () => {
    await h.prisma.automation_workflows.update({ where: { id: workflowId }, data: { transitions: JSON.stringify([
      { ...transitions[0], condition: { name: { $eq: 'Ready', $nin: ['Blocked'] } } }, transitions[1],
    ]) } });
    const execution = await start();
    const detail = await http('get', `executions/${execution.id}`);
    expect(detail.body.data.workflow.transitions[0].unavailableReason).toBe('Transition condition is not met');
    expect(detail.body.data.workflow.transitions[0]).not.toHaveProperty('condition');
    expect((await step(execution.id, 'review', 0)).status).toBe(409);
    expect(await h.prisma.workflowStateHistory.count()).toBe(1);
    await h.prisma.automation_workflows.update({ where: { id: workflowId }, data: { transitions: JSON.stringify(transitions) } });
    expect((await step(execution.id, 'review', 0)).status).toBe(409);
    await h.prisma.entityRecord.update({ where: { id: 1 }, data: { data: JSON.stringify({ name: 'Ready' }) } });
    expect((await http('get', `executions/${execution.id}`)).body.data.workflow.transitions[0].unavailableReason).toBeUndefined();
    expect((await step(execution.id, 'review', 0)).status).toBe(200);
    expect(await h.prisma.workflowStateHistory.count()).toBe(2);
  });
  it.each(['secret', 'masked', 'unknown'])('does not disclose condition results for unavailable field %s', async field => {
    await h.prisma.automation_workflows.update({ where: { id: workflowId }, data: { transitions: JSON.stringify([
      { ...transitions[0], condition: { [field]: { $ne: null } } }, transitions[1],
    ]) } });
    const execution = await start();
    expect((await http('get', `executions/${execution.id}`)).body.data.workflow.transitions[0].unavailableReason).toBe('Transition condition is unavailable');
    expect((await step(execution.id, 'review', 0)).status).toBe(409);
    expect(await h.prisma.workflowStateHistory.count()).toBe(1);
  });
  it('rechecks field permission after preview before committing a transition', async () => {
    await h.prisma.automation_workflows.update({ where: { id: workflowId }, data: { transitions: JSON.stringify([
      { ...transitions[0], condition: { name: 'Record 1' } }, transitions[1],
    ]) } });
    const execution = await start();
    expect((await http('get', `executions/${execution.id}`)).body.data.workflow.transitions[0].unavailableReason).toBeUndefined();
    await h.prisma.entityFieldPermission.create({ data: { fieldId: 1, roleId: 2, canRead: false } });
    expect((await step(execution.id, 'review', 0)).status).toBe(409);
    expect(await h.prisma.workflowStateHistory.count()).toBe(1);
  });
  it.each([null, 'name == Ready', { name: { $regex: '.*' } }, { name: { $gt: '1' } }])('rejects malformed conditions before starting: %s', async condition => {
    await h.prisma.automation_workflows.update({ where: { id: workflowId }, data: { transitions: JSON.stringify([
      { ...transitions[0], condition }, transitions[1],
    ]) } });
    expect((await http('post', 'run/1')).status).toBe(400);
    expect(await h.prisma.workflowStateExecution.count()).toBe(0);
  });
  it('rejects inactive/malformed definitions and untrusted caller data without writes', async () => {
    expect((await http('post', 'run/1', { userId: 1, companyId: 2, data: { secret: 'spoof' } })).status).toBe(400);
    expect((await http('post', 'run/1x')).status).toBe(400);
    await h.prisma.automation_workflows.update({ where: { id: workflowId }, data: { status: 'inactive' } });
    expect((await http('post', 'run/1')).status).toBe(409);
    await h.prisma.automation_workflows.update({ where: { id: workflowId }, data: { status: 'active', states: '[]' } });
    expect((await http('post', 'run/1')).status).toBe(400);
    expect(await h.prisma.workflowStateExecution.count()).toBe(0);
  });
  it('completes single-state workflows at start and rejects unsupported state hooks', async () => {
    await h.prisma.automation_workflows.update({ where: { id: workflowId }, data: { states: JSON.stringify([{ code: 'new', is_start: true, is_end: true }]), transitions: '[]' } });
    expect(await start()).toMatchObject({ currentState: 'new', status: 'completed' });
    await h.prisma.automation_workflows.update({ where: { id: workflowId }, data: { states: JSON.stringify([{ code: 'new', is_start: true, is_end: true, onEnter: ['unsafe'] }]) } });
    expect((await http('post', 'run/1')).status).toBe(409);
  });
});
