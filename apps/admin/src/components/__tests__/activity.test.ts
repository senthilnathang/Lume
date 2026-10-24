import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import Antd from 'ant-design-vue';
import ActivityTimeline from '../ActivityTimeline.vue';

vi.mock('@/api/request', () => ({
  get: vi.fn(),
}));

import { get } from '@/api/request';

const globalPlugins = { plugins: [Antd] };

describe('ActivityTimeline (FastVue port)', () => {
  beforeEach(() => {
    vi.mocked(get).mockReset();
  });

  it('renders fetched entries with colors', async () => {
    vi.mocked(get).mockResolvedValueOnce({
      rows: [
        { id: 1, action: 'create', model: 'deal', recordId: '7', userId: 9, createdAt: '2026-09-01T10:00:00Z' },
        { id: 2, action: 'login', model: null, recordId: null, userId: 9, createdAt: 'bad-date' },
      ],
    });
    const wrapper = mount(ActivityTimeline, { global: globalPlugins, props: { title: 'Activity' } });
    await flushPromises();
    expect(wrapper.text()).toContain('Activity');
    expect(wrapper.text()).toContain('create');
    expect(wrapper.text()).toContain('bad-date');
    expect(get).toHaveBeenCalledWith('/audit', expect.objectContaining({ limit: 50 }));
  });

  it('shows empty state on failure', async () => {
    vi.mocked(get).mockRejectedValueOnce(new Error('denied'));
    const wrapper = mount(ActivityTimeline, { global: globalPlugins, props: { showFilters: false } });
    await flushPromises();
    expect(wrapper.text()).toContain('No activity yet');
  });

  it('passes user filter through', async () => {
    vi.mocked(get).mockResolvedValueOnce({ rows: [] });
    mount(ActivityTimeline, { global: globalPlugins, props: { userId: 9 } });
    await flushPromises();
    expect(get).toHaveBeenCalledWith('/audit', expect.objectContaining({ user_id: 9 }));
  });
});
