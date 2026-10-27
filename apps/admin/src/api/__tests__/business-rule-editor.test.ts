import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, shallowMount } from '@vue/test-utils';
import Antd, { Button, Input, Modal, Textarea, message } from 'ant-design-vue';
import Automation from '@modules/base_automation/static/views/automation.vue';
import { createRule, getRules } from '@modules/base_automation/static/api/index';

vi.mock('vue-router', () => ({ useRoute: () => ({ path: '/settings/automation/business-rules' }) }));
vi.mock('@modules/base_automation/static/api/index', async importOriginal => ({
  ...await importOriginal<any>(), getRules: vi.fn(), createRule: vi.fn(),
}));
vi.spyOn(message, 'success').mockImplementation(() => (() => {}) as any);
vi.spyOn(message, 'error').mockImplementation(() => (() => {}) as any);
beforeEach(() => { vi.clearAllMocks(); vi.mocked(getRules).mockResolvedValue([]); });
const mount = () => shallowMount(Automation, { global: { plugins: [Antd], renderStubDefaultSlot: true } });

it('submits a field-update rule with typed JSON from the routed modal', async () => {
  const wrapper = mount();
  await flushPromises();
  wrapper.findAllComponents(Button).find(button => button.text().includes('Add Rule'))!.vm.$emit('click');
  await flushPromises();
  const modal = wrapper.findAllComponents(Modal).find(modal => modal.props('title') === 'Create Business Rule')!;
  const inputs = modal.findAllComponents(Input);
  inputs[0].vm.$emit('update:value', 'Set score');
  inputs[1].vm.$emit('update:value', 'entity_1');
  inputs[2].vm.$emit('update:value', 'score');
  const areas = modal.findAllComponents(Textarea);
  areas[0].vm.$emit('update:value', '{"enabled":false}');
  areas[1].vm.$emit('update:value', '0');
  modal.vm.$emit('ok');
  await flushPromises();
  expect(createRule).toHaveBeenCalledWith({ name: 'Set score', model: 'entity_1', field: 'score', priority: 10, status: 'active', condition: { enabled: false }, action: { type: 'set_field', fieldName: 'score', value: 0 } });
  expect(modal.text()).toContain('record creation and updates');
  wrapper.unmount();
});

it('keeps malformed condition input from reaching persistence', async () => {
  const wrapper = mount();
  await flushPromises();
  wrapper.findAllComponents(Button).find(button => button.text().includes('Add Rule'))!.vm.$emit('click');
  await flushPromises();
  const modal = wrapper.findAllComponents(Modal).find(modal => modal.props('title') === 'Create Business Rule')!;
  const inputs = modal.findAllComponents(Input);
  for (const [index, value] of ['Rule', 'entity_1', 'score'].entries()) inputs[index].vm.$emit('update:value', value);
  modal.findAllComponents(Textarea)[0].vm.$emit('update:value', '[]');
  modal.vm.$emit('ok');
  await flushPromises();
  expect(createRule).not.toHaveBeenCalled();
  expect(message.error).toHaveBeenCalledWith('Conditions must be a JSON object');
  expect(modal.props('open')).toBe(true);
  wrapper.unmount();
});
