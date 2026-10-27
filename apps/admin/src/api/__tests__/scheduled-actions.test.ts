import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, shallowMount } from '@vue/test-utils';
import Antd, { Button, Input, InputNumber, Modal, Select, Switch, message } from 'ant-design-vue';
import Schedules from '@modules/base_automation/static/views/scheduled-actions.vue';
import { createSchedule, listSchedules, listScheduledWorkflows, setScheduleActive } from '@modules/base_automation/static/api/schedules';
import { put } from '@/api/request';

vi.mock('@/api/request', () => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock('@modules/base_automation/static/api/schedules', async importOriginal => ({
  ...await importOriginal<any>(), listSchedules: vi.fn(), listScheduledWorkflows: vi.fn(), createSchedule: vi.fn(),
}));
vi.spyOn(message, 'success').mockImplementation(() => (() => {}) as any);
vi.spyOn(message, 'error').mockImplementation(() => (() => {}) as any);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listSchedules).mockResolvedValue({ items: [], schedulerEnabled: false });
  vi.mocked(listScheduledWorkflows).mockResolvedValue([{ name: 'followup', entity: 'Ticket' }]);
});
const mount = () => shallowMount(Schedules, { global: { plugins: [Antd], renderStubDefaultSlot: true } });

it('creates an inactive interval schedule without caller-supplied actor or tenant', async () => {
  const wrapper = mount(); await flushPromises();
  expect(wrapper.find('a-alert-stub').attributes('message')).toContain('Scheduler is paused');
  wrapper.findAllComponents(Button).find(button => button.text() === 'Add schedule')!.vm.$emit('click');
  await flushPromises();
  const modal = wrapper.findComponent(Modal);
  modal.findComponent(Input).vm.$emit('update:value', 'Follow up');
  modal.findComponent(Select).vm.$emit('update:value', 'followup');
  modal.findAllComponents(InputNumber)[0].vm.$emit('update:value', 12);
  modal.findAllComponents(InputNumber)[1].vm.$emit('update:value', 15);
  modal.vm.$emit('ok'); await flushPromises();
  expect(createSchedule).toHaveBeenCalledWith({ name: 'Follow up', workflowName: 'followup', recordId: 12, intervalMinutes: 15, cronExpression: null, status: 'inactive' });
  wrapper.unmount();
});
it('keeps the editor open when the backend rejects a schedule', async () => {
  vi.mocked(createSchedule).mockRejectedValue(new Error('Record inaccessible'));
  const wrapper = mount(); await flushPromises();
  wrapper.findAllComponents(Button).find(button => button.text() === 'Add schedule')!.vm.$emit('click'); await flushPromises();
  const modal = wrapper.findComponent(Modal);
  modal.findComponent(Input).vm.$emit('update:value', 'Follow up');
  modal.findComponent(Select).vm.$emit('update:value', 'followup');
  modal.findComponent(Switch).vm.$emit('update:checked', true);
  modal.vm.$emit('ok'); await flushPromises();
  expect(modal.props('open')).toBe(true); expect(message.error).toHaveBeenCalledWith('Record inaccessible');
  wrapper.unmount();
});
it('uses observed versions and explicit status changes', async () => {
  await setScheduleActive({ id: 7, version: 3 } as any, false);
  expect(put).toHaveBeenCalledWith('/automation/scheduled/7', { version: 3, status: 'inactive' });
});
