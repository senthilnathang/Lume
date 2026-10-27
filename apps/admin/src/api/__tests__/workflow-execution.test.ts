import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, shallowMount } from '@vue/test-utils';
import { Modal, PageHeader, Button, message } from 'ant-design-vue';
import Execution from '@modules/base_automation/static/views/workflow-execution.vue';
import { getWorkflowExecutionApi, transitionWorkflowStateApi, requestWorkflowApprovalApi } from '@modules/base_automation/static/api/index';

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@modules/base_automation/static/api/index', () => ({ getWorkflowExecutionApi: vi.fn(), transitionWorkflowStateApi: vi.fn(), requestWorkflowApprovalApi: vi.fn() }));
const detail = (status = 'active') => ({ execution: { id: 123, currentState: 'new', version: 3, status }, history: [{ version: 0, fromState: null, toState: 'new', transitionName: 'Started', userId: 7, transitionedAt: '2026-10-25T12:00:00Z' }],
  workflow: { name: 'Snapshot', transitions: [
    { code: 'go', name: 'Review', from_state: 'new', to_state: 'review' },
    { code: 'guarded', name: 'Approval', from_state: 'new', to_state: 'done', unavailableReason: 'Timed transitions are not supported yet' },
  ] } });
vi.spyOn(message, 'success').mockImplementation(() => (() => {}) as any);
vi.spyOn(message, 'error').mockImplementation(() => (() => {}) as any);
beforeEach(() => { vi.clearAllMocks(); vi.mocked(getWorkflowExecutionApi).mockResolvedValue(detail()); });
const mount = () => shallowMount(Execution, { props: { workflowId: 4, executionId: 123 },
  global: { renderStubDefaultSlot: true, stubs: {
    APageHeader: { props: ['title'], template: '<header><slot name="extra" /></header>' },
    Button: { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' },
  } } });
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
it('shows a blocked condition and enables the action after refreshing current data', async () => {
  const blocked = detail();
  blocked.workflow.transitions[0].unavailableReason = 'Transition condition is not met';
  vi.mocked(getWorkflowExecutionApi).mockResolvedValue(blocked);
  const wrapper = mount();
  await flushPromises();
  const action = () => wrapper.findAllComponents(Button).find(button => button.text().startsWith('Review'))!;
  expect(action().props('disabled')).toBe(true);
  expect(action().text()).toContain('Transition condition is not met');
  vi.mocked(getWorkflowExecutionApi).mockResolvedValue(detail());
  wrapper.findAllComponents(Button).find(button => button.text() === 'Refresh')!.vm.$emit('click');
  await flushPromises();
  expect(action().props('disabled')).toBe(false);
  expect(transitionWorkflowStateApi).not.toHaveBeenCalled();
  wrapper.unmount();
});
it.each([undefined, 'rejected'])('requests approval for the observed version and waits for completion (%s)', async status => {
  const response: any = detail();
  response.workflow.transitions[0] = { ...response.workflow.transitions[0], requiresApproval: true, canRequestApproval: true,
    unavailableReason: status ? 'Approval rejected' : 'Approval required', ...(status ? { approval: { requestId: 8, status } } : {}) };
  vi.mocked(getWorkflowExecutionApi).mockResolvedValue(response);
  const wrapper = mount(); await flushPromises();
  const pending = { ...response, workflow: { ...response.workflow, transitions: [{ ...response.workflow.transitions[0],
    canRequestApproval: false, unavailableReason: 'Approval pending', approval: { requestId: 9, status: 'pending' } }] } };
  vi.mocked(requestWorkflowApprovalApi).mockResolvedValue({ requestId: 9, status: 'pending' });
  vi.mocked(getWorkflowExecutionApi).mockResolvedValue(pending);
  wrapper.findAllComponents(Button).find(b => b.text().startsWith('Request approval'))!.vm.$emit('click');
  await flushPromises();
  expect(requestWorkflowApprovalApi).toHaveBeenCalledWith(4, 123, { transitionCode: 'go', version: 3 });
  expect(transitionWorkflowStateApi).not.toHaveBeenCalled();
  expect(wrapper.text()).toContain('Approval #9: pending');
  expect(wrapper.findAllComponents(Button).find(b => b.text().startsWith('Review'))!.props('disabled')).toBe(true);
  vi.mocked(getWorkflowExecutionApi).mockResolvedValue({ ...pending, workflow: { ...pending.workflow, transitions: [{ ...pending.workflow.transitions[0],
    unavailableReason: undefined, approval: { requestId: 9, status: 'completed' } }] } });
  wrapper.findAllComponents(Button).find(b => b.text() === 'Refresh')!.vm.$emit('click');
  await flushPromises();
  expect(wrapper.findAllComponents(Button).find(b => b.text() === 'Review')!.props('disabled')).toBe(false);
  wrapper.unmount();
});
