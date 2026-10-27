import { compileFlow } from '../../../src/modules/base_automation/services/flow-definition';

function diamonds(count: number): any {
  return { name: 'Branches', model: 'entity_1', trigger: 'manual', nodes: [
    { id: 'start', type: 'trigger_manual' }, { id: 'end', type: 'end_success' },
    ...Array.from({ length: count }, (_, i) => ({ id: `c${i}`, type: 'condition_if', config: { condition: { name: 'x' } } })),
  ], edges: [
    { source: 'start', target: 'c0' },
    ...Array.from({ length: count }, (_, i) => ['then', 'else'].map(branch => ({ source: `c${i}`, target: i + 1 === count ? 'end' : `c${i + 1}`, branch }))).flat(),
  ] };
}

describe('bounded branch compilation', () => {
  it('supports nested branches with a shared destination', () => {
    const result = compileFlow(diamonds(2));
    expect(result.steps).toHaveLength(1);
    const first = result.steps[0] as any;
    expect(first.type).toBe('record_condition');
    expect(first.then[0]).toEqual(first.else[0]);
    expect(first.then[0].then).toEqual([]);
  });
  it('bounds DAG expansion even when the input graph is small', () => {
    expect(() => compileFlow(diamonds(9))).toThrow('expanded graph exceeds 1000');
  });
  it('bounds branch depth and therefore durable receipt key length', () => {
    const flow = diamonds(11);
    flow.edges.filter(e => e.branch === 'else').forEach(e => { e.target = 'end'; });
    expect(() => compileFlow(flow)).toThrow('at most 10 levels');
  });
  it('rejects unreachable nodes', () => {
    const flow = diamonds(1);
    flow.nodes.push({ id: 'orphan', type: 'action_set_field', config: { fieldName: 'name', value: 'x' } });
    flow.edges.push({ source: 'orphan', target: 'end' });
    expect(() => compileFlow(flow)).toThrow('reachable');
  });
});
