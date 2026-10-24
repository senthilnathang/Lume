import { beforeEach, expect, it, vi } from 'vitest';
import { get, post, put } from '@/api/request';
import { createApproval, getApprovals, updateApproval, listApprovalRequests, approveTaskApi, rejectTaskApi } from '@modules/base_automation/static/api/index';

vi.mock('@/api/request', () => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

it('carries the server cursor forward, including empty filtered pages', async () => {
  vi.mocked(get).mockResolvedValue({ items: [], nextCursor: 42 });
  expect(await listApprovalRequests('pending')).toEqual({ items: [], nextCursor: 42 });
  await listApprovalRequests('history', 42);
  expect(get).toHaveBeenLastCalledWith('/automation/approval-requests', { view: 'history', before: 42, limit: 25 });
});

it('sends the displayed step index and rejection reason without caller identity', async () => {
  await approveTaskApi(8, { stepIndex: 2, userId: 99 } as any);
  expect(post).toHaveBeenLastCalledWith('/automation/approval-requests/8/approve', { stepIndex: 2 });
  await rejectTaskApi(8, { stepIndex: 2, reason: 'Needs revision', userId: 99 } as any);
  expect(post).toHaveBeenLastCalledWith('/automation/approval-requests/8/reject', { stepIndex: 2, reason: 'Needs revision' });
});

it('decodes steps returned as JSON text by MySQL', async () => {
  vi.mocked(get).mockResolvedValue([{ id: 1, status: 'active', steps: '[{"approverId":7}]' }]);
  expect((await getApprovals())[0].steps[0]).toMatchObject({ approver_type: 'USER', approver_id: '7' });
});

it('maps persisted status and numeric approvers to editor fields', async () => {
  vi.mocked(get).mockResolvedValue([{ id: 1, model: 'Ticket', status: 'inactive', steps: [{ approverId: 7 }, { roleId: 2 }] }]);
  expect((await getApprovals())[0]).toMatchObject({ model: 'Ticket', is_active: false, chain_type: 'SEQUENTIAL',
    steps: [{ approver_type: 'USER', approver_id: '7', sequence: 1 }, { approver_type: 'ROLE', approver_id: '2', sequence: 2 }] });
});

it('writes sorted numeric approvers without mutating the editor', async () => {
  vi.mocked(post).mockResolvedValue({ id: 1, steps: [] });
  const steps = [
    { sequence: 2, approver_type: 'ROLE' as const, approver_id: '2', required: true },
    { sequence: 1, approver_type: 'USER' as const, approver_id: '7', required: true },
  ];
  await createApproval({ name: 'Review', model: 'Ticket', is_active: true, chain_type: 'SEQUENTIAL', steps });
  expect(post).toHaveBeenCalledWith('/automation/approvals', expect.objectContaining({ model: 'Ticket', status: 'active', steps: [{ approverId: 7 }, { roleId: 2 }] }));
  expect(steps[0].sequence).toBe(2);
  expect(vi.mocked(post).mock.calls[0][1]).not.toHaveProperty('chain_type');
});

it('preserves deactivation and omitted steps in partial updates', async () => {
  vi.mocked(put).mockResolvedValue({ id: 1, status: 'inactive', steps: [] });
  expect((await updateApproval(1, { is_active: false })).is_active).toBe(false);
  expect(put).toHaveBeenCalledWith('/automation/approvals/1', expect.objectContaining({ status: 'inactive', steps: undefined }));
});

it.each([
  { chain_type: 'PARALLEL' },
  { steps: [{ sequence: 1, approver_type: 'GROUP', approver_id: '2', required: true }] },
  { steps: [{ sequence: 1, approver_type: 'USER', approver_id: 'bad', required: true }] },
  { steps: [{ sequence: 1, approver_type: 'USER', approver_id: '2', required: false }] },
  { steps: [{ sequence: 1, approver_type: 'USER', approver_id: '2', required: true, escalation_days: 1 }] },
])('rejects unsupported settings before writing: %j', async data => {
  await expect(createApproval(data as any)).rejects.toThrow();
  expect(post).not.toHaveBeenCalled();
});
