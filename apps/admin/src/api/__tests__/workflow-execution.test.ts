import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, shallowMount } from '@vue/test-utils';
import { Modal, PageHeader, Button, message } from 'ant-design-vue';
import Execution from '@modules/base_automation/static/views/workflow-execution.vue';
import { getWorkflowExecutionApi, transitionWorkflowStateApi } from '@modules/base_automation/static/api/index';

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@modules/base_automation/static/api/index', () => ({ getWorkflowExecutionApi: vi.fn(), transitionWorkflowStateApi: vi.fn() }));
const detail = (status = 'active') => ({ execution: { id: 123, currentState: 'new', version: 3, status }, history: [{ version: 0, fromState: null, toState: 'new', transitionName: 'Started', userId: 7, transitionedAt: '2026-10-25T12:00:00Z' }],
  workflow: { name: 'Snapshot', transitions: [
    { code: 'go', name: 'Review', from_state: 'new', to_state: 'review' },
    { code: 'guarded', name: 'Approval', from_state: 'new', to_state: 'done', unavailableReason: 'Approval transitions are not supported yet' },
  ] } });
vi.spyOn(message, 'success').mockImplementation(() => (() => {}) as any);
vi.spyOn(message, 'error').mockImplementation(() => (() => {}) as any);
beforeEach(() => { vi.clearAllMocks(); vi.mocked(getWorkflowExecutionApi).mockResolvedValue(detail()); });
const mount = () => shallowMount(Execution, { props: { workflowId: 4, executionId: 123 },
  global: { renderStubDefaultSlot: true, stubs: { Button: { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' } } } });
it('renders numeric IDs, blocks unsupported actions and submits the observed version', async () => {
  const wrapper = mount();
  await flushPromises();
  expect(wrapper.findComponent(PageHeader).props('title')).toBe('Execution: 123');
  expect(wrapper.text()).toContain('Start → new');
  expect(wrapper.text()).toContain('Started by user 7');
  const buttons = wrapper.findAllComponents(Button);
  expect(buttons.find(button => button.text().includes('Approval'))!.props('disabled')).toBe(true);
  await buttons.find(button => button.text() === 'Review')!.vm.$emit('click');
  vi.mocked(transitionWorkflowStateApi).mockResolvedValue({ ...detail().execution, currentState: 'review', version: 4 });
  wrapper.findComponent(Modal).vm.$emit('ok');
  await flushPromises();
  expect(transitionWorkflowStateApi).toHaveBeenCalledWith(4, 123, { transitionCode: 'go', version: 3 });
  wrapper.unmount();
});
it('does not offer transitions for completed executions', async () => {
  vi.mocked(getWorkflowExecutionApi).mockResolvedValue(detail('completed'));
  const wrapper = mount();
  await flushPromises();
  expect(wrapper.findAllComponents(Button).some(button => button.text() === 'Review')).toBe(false);
  wrapper.unmount();
});
