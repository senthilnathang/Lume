import { resolveModel, stripAliases } from '../../src/modules/base_automation/api/model-alias.js';

describe('automation model aliases', () => {
  test('prefers model, then model_name, then entity_type', () => {
    expect(resolveModel({ model: 'a', model_name: 'b', entity_type: 'c' })).toBe('a');
    expect(resolveModel({ model_name: 'b', entity_type: 'c' })).toBe('b');
    expect(resolveModel({ entity_type: 'c' })).toBe('c');
    expect(resolveModel({})).toBeNull();
    expect(resolveModel(null)).toBeNull();
  });

  test('strips alias keys while keeping the rest', () => {
    expect(stripAliases({ model_name: 'x', entity_type: 'y', name: 'n', model: 'm' }))
      .toEqual({ name: 'n', model: 'm' });
  });
});
