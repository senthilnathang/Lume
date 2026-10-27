import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, shallowMount } from '@vue/test-utils';
import Antd, { Button, Checkbox, Input, Modal, Select, SelectOption, Textarea, message } from 'ant-design-vue';
import WorkflowForm from '@modules/base_automation/static/views/workflow-form.vue';
import { getWorkflowDefinitionApi, getApprovalChainsApi, updateWorkflowDefinitionApi } from '@modules/base_automation/static/api/index';

vi.mock('@modules/base_automation/static/api/index', () => ({
  getWorkflowDefinitionApi: vi.fn(), getApprovalChainsApi: vi.fn(),
  updateWorkflowDefinitionApi: vi.fn(), createWorkflowDefinitionApi: vi.fn(),
}));
vi.spyOn(message, 'success').mockImplementation(() => (() => {}) as any);
vi.spyOn(message, 'error').mockImplementation(() => (() => {}) as any);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getApprovalChainsApi).mockResolvedValue([]);
  vi.mocked(updateWorkflowDefinitionApi).mockResolvedValue({} as any);
  vi.mocked(getWorkflowDefinitionApi).mockResolvedValue({ id: 4, code: '', name: 'Review', model_name: 'entity_1', is_active: true,
    states: [{ code: 'new', name: 'New', is_start: true }, { code: 'done', name: 'Done', is_end: true }],
    transitions: [{ code: 'finish', name: 'Finish', from_state: 'new', to_state: 'done', condition: { enabled: false } }],
  } as any);
});
const mount = async () => {
  const wrapper = shallowMount(WorkflowForm, { props: { workflowId: '4' }, global: { plugins: [Antd], renderStubDefaultSlot: true } });
  await flushPromises();
  return wrapper;
};
const edit = async (wrapper: any) => {
  wrapper.findAllComponents(Button).find((b: any) => b.attributes('aria-label') === 'Edit transition Finish').vm.$emit('click');
  await flushPromises();
  return wrapper.findAllComponents(Modal).find((m: any) => m.props('title') === 'Edit Transition');
};
const save = async (wrapper: any) => {
  wrapper.findAllComponents(Button).find((b: any) => b.text() === 'Save Changes').vm.$emit('click');
  await flushPromises();
};

it.each(['{"count":{"$gte":0},"enabled":false}', ''])('edits or clears an existing condition and persists it (%s)', async text => {
  const wrapper = await mount();
  const modal = await edit(wrapper);
  expect(modal.findComponent(Textarea).props('value')).toContain('false');
  modal.findComponent(Textarea).vm.$emit('update:value', text);
  modal.vm.$emit('ok');
  await flushPromises();
  await save(wrapper);
  expect(updateWorkflowDefinitionApi).toHaveBeenCalledWith('4', expect.objectContaining({
    transitions: [expect.objectContaining({ condition: text ? JSON.parse(text) : undefined })],
  }));
  wrapper.unmount();
});

it.each(['{', '[]', 'null', 'false'])('keeps invalid JSON/object input in the modal (%s)', async text => {
  const wrapper = await mount();
  const modal = await edit(wrapper);
  modal.findComponent(Textarea).vm.$emit('update:value', text);
  await flushPromises();
  modal.vm.$emit('ok');
  await flushPromises();
  expect(modal.props('open')).toBe(true);
  expect(modal.findComponent(Textarea).attributes('aria-invalid')).toBe('true');
  expect(updateWorkflowDefinitionApi).not.toHaveBeenCalled();
  wrapper.unmount();
});

it('adds a condition without carrying a cancelled edit into the new transition', async () => {
  const wrapper = await mount();
  const editing = await edit(wrapper);
  editing.findComponent(Textarea).vm.$emit('update:value', '{"cancelled":true}');
  editing.vm.$emit('update:open', false);
  wrapper.findAllComponents(Button).find(b => b.text() === 'Add Transition')!.vm.$emit('click');
  await flushPromises();
  const modal = wrapper.findAllComponents(Modal).find(m => m.props('title') === 'Add Transition')!;
  expect(modal.findComponent(Textarea).props('value')).toBe('');
  const selects = modal.findAllComponents(Select);
  selects[0].vm.$emit('update:value', 'new');
  selects[1].vm.$emit('update:value', 'done');
  const inputs = modal.findAllComponents(Input);
  inputs[0].vm.$emit('update:value', 'Alternate');
  inputs[1].vm.$emit('update:value', 'alternate');
  modal.findComponent(Textarea).vm.$emit('update:value', '{"count":0}');
  modal.vm.$emit('ok');
  await flushPromises();
  await save(wrapper);
  expect(updateWorkflowDefinitionApi).toHaveBeenCalledWith('4', expect.objectContaining({ transitions: [
    expect.objectContaining({ condition: { enabled: false } }),
    expect.objectContaining({ code: 'alternate', condition: { count: 0 } }),
  ] }));
  wrapper.unmount();
});

it('shows server predicate validation errors without leaving the editor', async () => {
  const wrapper = await mount();
  vi.mocked(updateWorkflowDefinitionApi).mockRejectedValue({ response: { data: { errors: ['Transition 1: Unsupported condition operator'] } } });
  await save(wrapper);
  expect(message.error).toHaveBeenCalledWith('Transition 1: Unsupported condition operator');
  expect(wrapper.emitted('saved')).toBeUndefined();
  wrapper.unmount();
});
it('offers active matching approval chains and saves a selected approval gate', async () => {
  vi.mocked(getApprovalChainsApi).mockResolvedValue([
    { id: 7, name: 'Review', model: 'entity_1', is_active: true },
    { id: 8, name: 'Other model', model: 'entity_2', is_active: true },
    { id: 9, name: 'Inactive', model: 'entity_1', is_active: false },
  ] as any);
  const wrapper = await mount();
  const modal = await edit(wrapper);
  modal.findComponent(Checkbox).vm.$emit('update:checked', true);
  await flushPromises();
  modal.vm.$emit('ok');
  await flushPromises();
  expect(message.error).toHaveBeenCalledWith('Select an approval chain for this transition');
  expect(modal.props('open')).toBe(true);
  const select = modal.findAllComponents(Select).find((s: any) => s.attributes('placeholder') === 'Select approval chain')!;
  expect(select.findAllComponents(SelectOption).map((o: any) => o.text())).toEqual(['Review']);
  select.vm.$emit('update:value', 7);
  modal.vm.$emit('ok'); await flushPromises(); await save(wrapper);
  expect(updateWorkflowDefinitionApi).toHaveBeenCalledWith('4', expect.objectContaining({ transitions: [
    expect.objectContaining({ requires_approval: true, approval_chain_id: 7, condition: { enabled: false } }),
  ] }));
  wrapper.unmount();
});
