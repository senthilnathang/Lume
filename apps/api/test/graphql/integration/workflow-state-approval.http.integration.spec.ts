import { jest } from '@jest/globals';
import request from 'supertest';
import { createHarness, Harness } from './harness';

jest.setTimeout(120000);
describe('version-bound workflow transition approvals', () => {
  let h: Harness, workflowId: number, chainId: number, failBinding = false, failHistory = false;
  const states = [{ code: 'new', is_start: true }, { code: 'review' }, { code: 'done', is_end: true }];
  const transitions = () => [
    { code: 'review', from_state: 'new', to_state: 'review', requires_approval: true, approval_chain_id: chainId, condition: { name: 'Record 1' } },
    { code: 'back', from_state: 'review', to_state: 'new' },
    { code: 'finish', from_state: 'review', to_state: 'done' },
  ];
  beforeAll(async () => {
    h = await createHarness();
    h.prisma.$use(async (params, next) => {
      if (failBinding && params.model === 'WorkflowStateApproval' && params.action === 'create') throw new Error('Injected binding failure');
      if (failHistory && params.model === 'WorkflowStateHistory' && params.action === 'create') throw new Error('Injected history failure');
      return next(params);
    });
  });
  afterAll(async () => { await h?.close(); });
  beforeEach(async () => {
    failBinding = false; failHistory = false;
    await h.prisma.workflowStateExecution.deleteMany();
    await h.prisma.automation_workflows.deleteMany();
    await h.prisma.notifications.deleteMany();
    await h.prisma.automation_approval_requests.deleteMany();
    await h.prisma.automation_approval_chains.deleteMany();
    await h.prisma.recordRule.deleteMany();
    await h.seed();
    await h.prisma.entityRecord.updateMany({ data: { visibility: 'public' } });
    for (const name of ['base_automation.workflows', 'base_automation.workflows.manage', 'base_automation.approvals', 'base.records.read', 'base.records.write']) {
      const permission = await h.prisma.permission.create({ data: { name, display_name: name } });
      await h.prisma.rolePermission.create({ data: { roleId: 2, permissionId: permission.id } });
    }
    chainId = (await h.prisma.automation_approval_chains.create({ data: { name: 'Review', model: 'entity_1', steps: '[{"approverId":1}]', condition: '{}' } })).id;
    workflowId = (await h.prisma.automation_workflows.create({ data: { name: 'Approval gate', model: 'entity_1', status: 'active', initial_state: 'new', states: JSON.stringify(states), transitions: JSON.stringify(transitions()) } })).id;
  });
  const api = (method: string, path: string, body?: unknown, token = h.token('member')) => {
    const req = request(h.app.getHttpServer())[method](`/automation/workflows/${workflowId}/${path}`).auth(token, { type: 'bearer' });
    return body === undefined ? req : req.send(body);
  };
  const start = async () => { const response = await api('post', 'run/1', {}); expect(response.status).toBe(201); return response.body.data.id; };
  const ask = (id: number, version = 0, extra = {}) => api('post', `executions/${id}/approval`, { transitionCode: 'review', version, ...extra });
  const step = (id: number, transitionCode = 'review', version = 0) => api('post', `executions/${id}/transition`, { transitionCode, version });
  const decide = (id: number, decision = 'approve') => request(h.app.getHttpServer()).post(`/api/automation/approval-requests/${id}/${decision}`)
    .auth(h.token(), { type: 'bearer' }).send({ stepIndex: 0, ...(decision === 'reject' ? { reason: 'Revise' } : {}) });
  const detail = async (id: number) => (await api('get', `executions/${id}`)).body.data;

  it('requires completion of a bound approval and records its ID in atomic transition history', async () => {
    const id = await start();
    expect((await detail(id)).workflow.transitions[0]).toMatchObject({ canRequestApproval: true, unavailableReason: 'Approval required' });
    expect((await step(id)).status).toBe(409);
    const approval = await ask(id); expect(approval.status).toBe(201);
    expect((await detail(id)).workflow.transitions[0]).toMatchObject({ canRequestApproval: false, approval: { requestId: approval.body.data.requestId, status: 'pending' } });
    expect((await step(id)).status).toBe(409);
    expect((await decide(approval.body.data.requestId)).status).toBe(200);
    expect((await detail(id)).execution).toMatchObject({ currentState: 'new', version: 0 });
    const responses = await Promise.all([step(id), step(id)]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    expect((await detail(id)).history[1].approvalRequestId).toBe(approval.body.data.requestId);
  });

  it('deduplicates concurrent requests and retains rejected attempts when requesting again', async () => {
    const id = await start();
    const responses = await Promise.all([ask(id), ask(id)]);
    expect(responses.map(r => r.status)).toEqual([201, 201]);
    const requestId = responses[0].body.data.requestId;
    expect(responses[1].body.data.requestId).toBe(requestId);
    expect(await h.prisma.workflowStateApproval.count()).toBe(1);
    expect(await h.prisma.notifications.count()).toBe(1);
    expect((await decide(requestId, 'reject')).status).toBe(200);
    expect((await step(id)).status).toBe(409);
    expect((await detail(id)).workflow.transitions[0]).toMatchObject({ canRequestApproval: true, unavailableReason: 'Approval rejected' });
    const retry = await ask(id); expect(retry.status).toBe(201);
    expect(retry.body.data.requestId).not.toBe(requestId);
    expect(await h.prisma.workflowStateApproval.count()).toBe(2);
    expect((await decide(retry.body.data.requestId)).status).toBe(200);
    expect((await step(id)).status).toBe(200);
  });

  it('does not reuse approvals for another execution or a later visit to the same state', async () => {
    const id = await start(), second = await start();
    const approval = (await ask(id)).body.data;
    expect((await ask(second)).status).toBe(409); // Unrelated pending approval is not adopted.
    expect((await decide(approval.requestId)).status).toBe(200);
    expect((await step(second)).status).toBe(409);
    expect((await step(id)).status).toBe(200);
    expect((await step(id, 'back', 1)).status).toBe(200);
    expect((await step(id, 'review', 2)).status).toBe(409);
    expect((await ask(id, 0)).status).toBe(409);
    const next = await ask(id, 2); expect(next.status).toBe(201);
    expect(next.body.data.requestId).not.toBe(approval.requestId);
  });

  it('rejects caller-supplied approval IDs and scopes requests to the tenant and permissions', async () => {
    const id = await start();
    expect((await ask(id, 0, { approvalRequestId: 1 })).status).toBe(400);
    expect((await ask(id, 0, { chainId })).status).toBe(400);
    expect((await api('post', `executions/${id}/approval`, { transitionCode: 'review', version: 0 }, h.token('member', 2))).status).toBe(404);
    await h.prisma.rolePermission.deleteMany({ where: { roleId: 2, permission: { name: 'base_automation.approvals' } } });
    expect((await ask(id)).status).toBe(403);
    expect(await h.prisma.workflowStateApproval.count()).toBe(0);
  });

  it.each(['Review', 'review '])('does not reuse approval for a distinct transition code %j', async alternateCode => {
    await h.prisma.automation_workflows.update({ where: { id: workflowId }, data: { transitions: JSON.stringify([
      ...transitions(), { ...transitions()[0], code: alternateCode, to_state: 'done' },
    ]) } });
    const id = await start(), approval = (await ask(id)).body.data;
    expect((await decide(approval.requestId)).status).toBe(200);
    expect((await step(id, alternateCode)).status).toBe(409);
    const alternate = await ask(id, 0, { transitionCode: alternateCode });
    expect(alternate.status).toBe(201);
    expect(alternate.body.data.requestId).not.toBe(approval.requestId);
    expect((await step(id)).status).toBe(200);
  });

  it.each(['condition', 'private', 'field', 'permission', 'inactive-chain', 'deleted-chain', 'missing-request'])('rechecks %s after approval completion', async reason => {
    const id = await start(), approval = (await ask(id)).body.data;
    expect((await decide(approval.requestId)).status).toBe(200);
    if (reason === 'condition') await h.prisma.entityRecord.update({ where: { id: 1 }, data: { data: '{"name":"Changed"}' } });
    if (reason === 'private') await h.prisma.entityRecord.update({ where: { id: 1 }, data: { visibility: 'private' } });
    if (reason === 'field') await h.prisma.entityFieldPermission.create({ data: { fieldId: 1, roleId: 2, canRead: false } });
    if (reason === 'permission') await h.prisma.rolePermission.deleteMany({ where: { roleId: 2, permission: { name: 'base.records.write' } } });
    if (reason === 'inactive-chain') await h.prisma.automation_approval_chains.update({ where: { id: chainId }, data: { status: 'inactive' } });
    if (reason === 'deleted-chain') await h.prisma.automation_approval_chains.delete({ where: { id: chainId } });
    if (reason === 'missing-request') await h.prisma.automation_approval_requests.delete({ where: { id: approval.requestId } });
    expect([403, 409]).toContain((await step(id)).status);
    expect(await h.prisma.workflowStateHistory.count()).toBe(1);
  });

  it('rolls back approval creation and notifications if its binding fails', async () => {
    const id = await start(); failBinding = true;
    expect((await ask(id)).status).toBe(500);
    expect(await h.prisma.automation_approval_requests.count()).toBe(0);
    expect(await h.prisma.workflowStateApproval.count()).toBe(0);
    expect(await h.prisma.notifications.count()).toBe(0);
  });

  it('keeps the completed approval usable when a history write rolls back', async () => {
    const id = await start(), approval = (await ask(id)).body.data;
    await decide(approval.requestId); failHistory = true;
    expect((await step(id)).status).toBe(500);
    expect((await detail(id)).execution.version).toBe(0);
    failHistory = false;
    expect((await step(id)).status).toBe(200);
    expect((await detail(id)).history[1].approvalRequestId).toBe(approval.requestId);
  });

  it.each([{ requires_approval: true }, { requires_approval: 'true', approval_chain_id: 1 }, { requires_approval: true, approval_chain_id: -1 }, { requires_approval: false, approval_chain_id: 1 }])('rejects malformed approval configuration %j', async config => {
    await h.prisma.automation_workflows.update({ where: { id: workflowId }, data: { transitions: JSON.stringify([{ code: 'bad', from_state: 'new', to_state: 'done', ...config }]) } });
    expect((await api('post', 'run/1', {})).status).toBe(400);
    expect(await h.prisma.workflowStateExecution.count()).toBe(0);
  });
});
