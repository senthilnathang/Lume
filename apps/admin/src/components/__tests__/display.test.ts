import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Antd from 'ant-design-vue';
import StatusTag from '../StatusTag.vue';
import StatisticCard from '../StatisticCard.vue';
import EmptyState from '../EmptyState.vue';

const globalPlugins = { plugins: [Antd] };

describe('display components (FastVue port)', () => {
  it('StatusTag maps statuses to colors', () => {
    const active = mount(StatusTag, { global: globalPlugins, props: { status: 'active' } });
    expect(active.text()).toBe('Active');
    const custom = mount(StatusTag, { global: globalPlugins, props: { status: 'weird', text: 'W', color: 'pink' } });
    expect(custom.text()).toBe('W');
  });

  it('StatisticCard renders title, value, and trend', () => {
    const wrapper = mount(StatisticCard, {
      global: globalPlugins,
      props: { title: 'Revenue', value: 1200, prefix: '$', trend: 5 },
    });
    expect(wrapper.text()).toContain('Revenue');
    expect(wrapper.text()).toContain('5%');
  });

  it('EmptyState emits action on button click', async () => {
    const wrapper = mount(EmptyState, {
      global: globalPlugins,
      props: { title: 'Empty', description: 'Nothing here', showAction: true, actionText: 'Create' },
    });
    expect(wrapper.text()).toContain('Empty');
    const button = wrapper.findAll('button').find((b) => b.text().includes('Create'));
    await button?.trigger('click');
    expect(wrapper.emitted('action')).toHaveLength(1);
  });
});
