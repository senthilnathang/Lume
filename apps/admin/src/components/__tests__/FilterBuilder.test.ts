import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Antd from 'ant-design-vue';
import FilterBuilder from '../FilterBuilder.vue';

const globalPlugins = { plugins: [Antd] };

const fields = [
  { key: 'status', label: 'Status', type: 'select' as const, options: ['new', 'done'] },
  { key: 'amount', label: 'Amount', type: 'number' as const },
];

describe('FilterBuilder (FastVue port)', () => {
  it('renders empty state with no conditions', () => {
    const wrapper = mount(FilterBuilder, { global: globalPlugins, props: { fields, modelValue: { logic: 'and', conditions: [] } } });
    expect(wrapper.text()).toContain('No filters');
  });

  it('emits add/remove condition updates', async () => {
    const wrapper = mount(FilterBuilder, { global: globalPlugins, props: { fields, modelValue: { logic: 'and', conditions: [] } } });
    const addButton = wrapper.findAll('button').find((b) => b.text().includes('Filter'));
    expect(addButton?.exists()).toBe(true);
    await addButton?.trigger('click');
    const emitted = wrapper.emitted('update:modelValue') || [];
    expect(emitted).toHaveLength(1);
    expect(emitted[0][0]).toMatchObject({ logic: 'and', conditions: [{ field: 'status', op: 'eq' }] });
  });

  it('shows number operators for number fields', () => {
    const wrapper = mount(FilterBuilder, {
      props: { fields, modelValue: { logic: 'and', conditions: [{ field: 'amount', op: 'gt', value: 5 }] } },
    });
    expect(wrapper.html()).toContain('number');
  });
});
