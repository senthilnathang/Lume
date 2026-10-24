import { beforeEach, expect, it, vi } from 'vitest';
import { post, put } from '@/api/request';
import { createRecordRule, updateRecordRule, createSequence, getNextSequenceNumber, updateMenu } from '@modules/base/static/api/settings';

vi.mock('@/api/request', () => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

it('serializes rule objects and leaves existing JSON strings intact', async () => {
  await createRecordRule({ domain: { id: { gt: 0 } }, groups: [1], users: [] });
  expect(post).toHaveBeenCalledWith('/admin/record-rules', expect.objectContaining({ domain: '{"id":{"gt":0}}', groups: '[1]', users: '[]' }));
  await updateRecordRule(3, { domain: '{"id":1}', isActive: false });
  expect(put).toHaveBeenCalledWith('/admin/record-rules/3', expect.objectContaining({ domain: '{"id":1}', isActive: false }));
});

it('preserves explicit menu parent clearing', async () => {
  await updateMenu(4, { parentId: null });
  expect(put).toHaveBeenCalledWith('/admin/settings/menus/4', { parentId: null });
});

it('uses a write request for allocation and preserves sequence model fields', async () => {
  await getNextSequenceNumber('ticket code');
  expect(post).toHaveBeenCalledWith('/admin/settings/sequences/ticket%20code/next');
  await createSequence({ modelName: 'Ticket', fieldName: 'number' });
  expect(post).toHaveBeenCalledWith('/admin/settings/sequences', { modelName: 'Ticket', fieldName: 'number' });
});
