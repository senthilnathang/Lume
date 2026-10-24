import { executeFlow, fireRecordFlows } from '../../src/modules/base_automation/services/flow-runner.js';

function actionsStub() {
  const calls = { posts: [], updates: [], logs: [] };
  return {
    calls,
    actions: {
      httpPost: async (url, payload) => { calls.posts.push([url, payload]); },
      updateRecord: async (id, data) => { calls.updates.push([id, data]); },
      log: async (message) => { calls.logs.push(message); },
    },
  };
}

const linearFlow = {
  id: 1, trigger: 'record.created', model: 'deal', status: 'active',
  nodes: [
    { id: 't', type: 'trigger', config: { event: 'record.created' } },
    { id: 'w', type: 'webhook', config: { url: 'https://hooks/x' } },
    { id: 'l', type: 'log', config: { message: 'done' } },
  ],
  edges: [{ from: 't', to: 'w' }, { from: 'w', to: 'l' }],
};

describe('flow runner (F2.1)', () => {
  test('executes linear node chains', async () => {
    const { calls, actions } = actionsStub();
    const res = await executeFlow(linearFlow, { event: 'record.created', record: { id: 1 } }, actions);
    expect(res.executed).toBe(true);
    expect(res.steps.map((s) => s.type)).toEqual(['trigger', 'webhook', 'log']);
    expect(calls.posts).toHaveLength(1);
    expect(calls.logs).toEqual(['done']);
  });

  test('condition nodes branch on record data', async () => {
    const flow = {
      nodes: [
        { id: 't', type: 'trigger', config: {} },
        { id: 'c', type: 'condition', config: { expression: '{amount} > 100' } },
        { id: 'big', type: 'log', config: { message: 'big' } },
        { id: 'small', type: 'log', config: { message: 'small' } },
      ],
      edges: [
        { from: 't', to: 'c' },
        { from: 'c', to: 'big', label: 'true' },
        { from: 'c', to: 'small', label: 'false' },
      ],
    };
    const { calls, actions } = actionsStub();
    await executeFlow(flow, { event: 'record.created', record: { amount: 500 } }, actions);
    expect(calls.logs).toEqual(['big']);
  });

  test('unknown nodes are skipped without crashing, failures stop the chain', async () => {
    const flow = {
      nodes: [
        { id: 't', type: 'trigger', config: {} },
        { id: 'x', type: 'teleport', config: {} },
        { id: 'l', type: 'log', config: { message: 'never' } },
      ],
      edges: [{ from: 't', to: 'x' }, { from: 'x', to: 'l' }],
    };
    const { calls, actions } = actionsStub();
    const res = await executeFlow(flow, { event: 'record.created', record: {} }, actions);
    expect(res.steps.find((s) => s.type === 'teleport').skipped).toBe(true);
    const bad = {
      nodes: [
        { id: 't', type: 'trigger', config: {} },
        { id: 'w', type: 'webhook', config: {} },
        { id: 'l', type: 'log', config: { message: 'never' } },
      ],
      edges: [{ from: 't', to: 'w' }, { from: 'w', to: 'l' }],
    };
    const res2 = await executeFlow(bad, { event: 'record.created', record: {} }, actions);
    expect(calls.logs).not.toContain('never');
    expect(res2.steps.at(-1).type).toBe('webhook');
  });

  test('fireRecordFlows filters by trigger, model, and status', async () => {
    const { actions } = actionsStub();
    const flows = [
      { ...linearFlow, status: 'draft' },
      { ...linearFlow, id: 2, trigger: 'record.updated' },
      { ...linearFlow, id: 3, model: 'other' },
      { ...linearFlow, id: 4, status: 'active' },
    ];
    const results = await fireRecordFlows({
      findFlows: async () => flows,
      event: 'record.created',
      entityName: 'deal',
      record: { id: 1 },
      actions,
    });
    expect(results.filter((r) => r.executed).map((r) => r.flowId)).toEqual([4]);
  });
});
