import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get, post, put } from '@/api/request';
import { createRule, getRules, updateRule, toggleRule } from '@modules/base_automation/static/api/index';
vi.mock('@/api/request', () => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
describe('business-rule adapter', () => {
  const row = { id: 3, name: 'Rule', model: 'Ticket', field: 'score', priority: 0, status: 'active' as const,
    condition: { score: { $gte: 0 } }, action: { type: 'set_field', fieldName: 'score', value: 0 } };
  it('decodes persisted JSON without losing false, zero or null values', async () => {
    vi.mocked(get).mockResolvedValue([{ ...row, condition: JSON.stringify({ active: false }), action: JSON.stringify({ ...row.action, value: null }) }]);
    expect((await getRules())[0]).toMatchObject({ condition: { active: false }, action: { value: null }, priority: 0 });
  });
  it('creates canonical rules and excludes identity fields from updates', async () => {
    vi.mocked(post).mockResolvedValue(row);
    vi.mocked(put).mockResolvedValue(row);
    await createRule(row);
    expect(post).toHaveBeenCalledWith('/automation/rules', { name: 'Rule', model: 'Ticket', field: 'score', status: 'active', priority: 0, condition: row.condition, action: row.action });
    await updateRule(3, row);
    expect(vi.mocked(put).mock.calls[0][1]).not.toHaveProperty('model');
    expect(vi.mocked(put).mock.calls[0][1]).not.toHaveProperty('field');
    expect(vi.mocked(put).mock.calls[0][1]).not.toHaveProperty('id');
  });
  it('sets the requested active status instead of toggling blindly', async () => {
    vi.mocked(put).mockResolvedValue({ ...row, status: 'inactive' });
    await toggleRule(3, false);
    expect(put).toHaveBeenLastCalledWith('/automation/rules/3', { status: 'inactive' });
    await toggleRule(3, true);
    expect(put).toHaveBeenLastCalledWith('/automation/rules/3', { status: 'active' });
    expect(post).not.toHaveBeenCalled();
  });
});
