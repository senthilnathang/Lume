import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get, post, put } from '@/api/request';
import { getWorkflows, createWorkflow, updateWorkflow, activateFlow, deactivateFlow, cloneFlow, validateWorkflowDefinitionApi, startWorkflowExecutionApi, getWorkflowExecutionApi, transitionWorkflowStateApi, requestWorkflowApprovalApi } from '@modules/base_automation/static/api/index';
import { getGroups, updateGroup } from '@modules/rbac/static/api/groups';

vi.mock('@/api/request', () => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

describe('NestJS automation adapter', () => {
  it('uses persisted numeric IDs and maps workflow fields for the editor', async () => {
    vi.mocked(get).mockResolvedValue([{ id: 12, model: 'Ticket', status: 'active', initialState: 'new' }]);
    expect((await getWorkflows())[0]).toMatchObject({ id: 12, code: '12', model_name: 'Ticket', is_active: true, default_state: 'new' });
  });
  it('creates definitions using canonical fields without unsupported code/state-field writes', async () => {
    vi.mocked(post).mockResolvedValue({ id: 13, model: 'Ticket', status: 'active' });
    const result = await createWorkflow({ name: 'Review', model_name: 'Ticket', code: 'ignored', state_field: 'ignored', is_active: true });
    expect(result.code).toBe('13');
    expect(post).toHaveBeenCalledWith('/automation/workflows', expect.objectContaining({ model: 'Ticket', status: 'active' }));
    expect(vi.mocked(post).mock.calls[0][1]).not.toHaveProperty('code');
    expect(vi.mocked(post).mock.calls[0][1]).not.toHaveProperty('state_field');
  });
  it('maps explicit workflow deactivation to inactive status', async () => {
    vi.mocked(put).mockResolvedValue({ id: 12, status: 'inactive' });
    expect((await updateWorkflow('12', { is_active: false })).is_active).toBe(false);
    expect(put).toHaveBeenCalledWith('/automation/workflows/12', expect.objectContaining({ status: 'inactive' }));
  });
  it('validates the same canonical graph fields used by create/update', async () => {
    vi.mocked(post).mockResolvedValue({ errors: [] });
    const states = [{ code: 'new', name: 'New', sequence: 1, is_start: true, is_end: true }];
    expect(await validateWorkflowDefinitionApi({ name: 'Review', model_name: 'Ticket', default_state: 'new', states, transitions: [], code: 'legacy' })).toEqual({ errors: [] });
    expect(post).toHaveBeenCalledWith('/automation/workflows/validate', expect.objectContaining({ name: 'Review', model: 'Ticket', initialState: 'new', states, transitions: [] }));
    expect(vi.mocked(post).mock.calls[0][1]).not.toHaveProperty('model_name');
    expect(vi.mocked(post).mock.calls[0][1]).not.toHaveProperty('code');
  });
  it('rejects validation error envelopes instead of allowing the designer to save', async () => {
    vi.mocked(post).mockResolvedValue({ errors: ['Duplicate state code: new', 'Unknown destination'] });
    await expect(validateWorkflowDefinitionApi({ name: 'Review' })).rejects.toThrow('Duplicate state code: new; Unknown destination');
    vi.mocked(post).mockRejectedValue(new Error('Workflow validation failed'));
    await expect(validateWorkflowDefinitionApi({ name: 'Review' })).rejects.toThrow('Workflow validation failed');
  });
  it('uses canonical execution routes and the displayed version instead of caller-supplied destinations', async () => {
    await startWorkflowExecutionApi(4, '12');
    expect(post).toHaveBeenLastCalledWith('/automation/workflows/4/run/12', {});
    await getWorkflowExecutionApi(4, 7);
    expect(get).toHaveBeenLastCalledWith('/automation/workflows/4/executions/7');
    await transitionWorkflowStateApi(4, 7, { transitionCode: 'approve', version: 2 });
    expect(post).toHaveBeenLastCalledWith('/automation/workflows/4/executions/7/transition', { transitionCode: 'approve', version: 2 });
    await requestWorkflowApprovalApi(4, 7, { transitionCode: 'approve', version: 2 });
    expect(post).toHaveBeenLastCalledWith('/automation/workflows/4/executions/7/approval', { transitionCode: 'approve', version: 2 });
  });
  it('uses update operations for flow activation and deactivation', async () => {
    await activateFlow(7);
    await deactivateFlow(7);
    expect(put).toHaveBeenNthCalledWith(1, '/automation/flows/7', { status: 'active' });
    expect(put).toHaveBeenNthCalledWith(2, '/automation/flows/7', { status: 'inactive' });
  });
  it('clones the model and graph as a draft without reusing the source ID', async () => {
    vi.mocked(get).mockResolvedValue({ id: 7, name: 'Original', model: 'Ticket', trigger: 'manual', status: 'active', nodes: [{ id: 'start' }], edges: [] });
    vi.mocked(post).mockResolvedValue({ id: 8, name: 'Original (copy)', model: 'Ticket', status: 'draft' });
    expect((await cloneFlow(7)).id).toBe(8);
    expect(post).toHaveBeenCalledWith('/automation/flows', expect.objectContaining({ name: 'Original (copy)', model: 'Ticket', status: 'draft', nodes: [{ id: 'start' }] }));
    expect(vi.mocked(post).mock.calls[0][1]).not.toHaveProperty('id');
  });
});

describe('routed group adapter', () => {
  it('maps persisted group status and timestamps', async () => {
    vi.mocked(get).mockResolvedValue([{ id: 4, name: 'Inactive', isActive: false, createdAt: '2026-10-23' }]);
    expect((await getGroups())[0]).toMatchObject({ is_active: false, created_at: '2026-10-23' });
    expect(get).toHaveBeenCalledWith('/admin/groups', undefined);
  });
  it('preserves an explicit false status in partial updates', async () => {
    vi.mocked(put).mockResolvedValue({ id: 4, isActive: false });
    expect((await updateGroup(4, { is_active: false })).is_active).toBe(false);
    expect(put).toHaveBeenCalledWith('/admin/groups/4', expect.objectContaining({ isActive: false }));
  });
});
