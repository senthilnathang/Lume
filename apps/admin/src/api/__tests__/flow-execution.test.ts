import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, shallowMount } from '@vue/test-utils';
import Antd, { Button, InputNumber, Textarea, message } from 'ant-design-vue';
import Panel from '@modules/base_automation/static/views/flow-execution-panel.vue';
import { getFlow, updateFlow } from '@modules/base_automation/static/api/index';
import { listFlowRuns, runFlow } from '@modules/base_automation/static/api/flow-runs';
vi.mock('@modules/base_automation/static/api/index', () => ({ getFlow: vi.fn(), updateFlow: vi.fn(), activateFlow: vi.fn(), deactivateFlow: vi.fn() }));
vi.mock('@modules/base_automation/static/api/flow-runs', () => ({ listFlowRuns: vi.fn(), runFlow: vi.fn() }));
vi.spyOn(message, 'success').mockImplementation(() => (() => {}) as any);
vi.spyOn(message, 'error').mockImplementation(() => (() => {}) as any);
const definition = { id: 4, code: '4', name: 'Flow', model: 'Ticket', status: 'active' as const, trigger_type: 'manual' as const, nodes: [], edges: [] };
beforeEach(() => {
  vi.clearAllMocks(); vi.mocked(getFlow).mockResolvedValue(definition);
  vi.mocked(listFlowRuns).mockResolvedValue({ items: [], workerEnabled: false });
});
const mount = () => shallowMount(Panel, { props: { flowId: 4 }, global: { plugins: [Antd], renderStubDefaultSlot: true } });
it('submits saved flow identity and reuses the idempotency key after a network failure', async () => {
  const wrapper = mount(); await flushPromises();
  wrapper.findComponent(InputNumber).vm.$emit('update:value', 12);
  vi.mocked(runFlow).mockRejectedValueOnce(new Error('Network failure')).mockResolvedValueOnce({ id: 7 } as any);
  const button = wrapper.findAllComponents(Button).find(b => b.text() === 'Run saved flow')!;
  button.vm.$emit('click'); await flushPromises();
  button.vm.$emit('click'); await flushPromises();
  expect(runFlow).toHaveBeenCalledTimes(2);
  expect(vi.mocked(runFlow).mock.calls[0]).toEqual([4, 12, expect.any(String)]);
  expect(vi.mocked(runFlow).mock.calls[1]).toEqual(vi.mocked(runFlow).mock.calls[0]);
  expect(message.success).toHaveBeenCalledWith('Run 7 queued');
  wrapper.unmount();
});
it('rejects malformed JSON before saving and preserves the entered graph', async () => {
  const wrapper = mount(); await flushPromises();
  const areas = wrapper.findAllComponents(Textarea);
  areas[0].vm.$emit('update:value', '{}'); await flushPromises();
  wrapper.findAllComponents(Button).find(b => b.text() === 'Save graph')!.vm.$emit('click');
  await flushPromises();
  expect(updateFlow).not.toHaveBeenCalled(); expect(message.error).toHaveBeenCalledWith('Nodes and edges must be JSON arrays');
  expect(areas[0].props('value')).toBe('{}'); wrapper.unmount();
});
it('keeps draft execution disabled and reloads persisted runs', async () => {
  vi.mocked(getFlow).mockResolvedValue({ ...definition, status: 'draft' });
  vi.mocked(listFlowRuns).mockResolvedValue({ items: [{ id: 9, status: 'completed' } as any], workerEnabled: true });
  const wrapper = mount(); await flushPromises();
  expect(wrapper.findAllComponents(Button).find(b => b.text() === 'Run saved flow')!.props('disabled')).toBe(true);
  expect(listFlowRuns).toHaveBeenCalledWith(4); wrapper.unmount();
});
