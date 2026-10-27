import { matchesTransitionCondition, transitionConditionError } from '../../../src/modules/base_automation/services/workflow-transition-condition';

describe('transition condition language', () => {
  it.each([
    [{ value: null }, { value: null }, true],
    [{ value: true }, { value: 1 }, false],
    [{ value: { $ne: null } }, {}, false],
    [{ value: { $nin: [1] } }, {}, false],
    [{ value: { $gt: 1, $gte: 2, $lt: 3, $lte: 2 } }, { value: 2 }, true],
    [{ value: { $gt: 1 } }, { value: '2' }, false],
    [{ value: { $in: [1, 'two'], $ne: 1 } }, { value: 'two' }, true],
    [{ value: { $eq: 2 }, other: false }, { value: 2, other: true }, false],
    [{ value: { $nin: [] } }, { value: {} }, false],
  ])('uses strict scalar comparisons and AND semantics (%j)', (condition, record, expected) => {
    expect(transitionConditionError(condition)).toBeUndefined();
    expect(matchesTransitionCondition(condition, record)).toBe(expected);
  });
  it.each([
    [], { value: {} }, { value: { $in: [undefined] } }, { value: { $gte: Infinity } },
    { value: { $in: Array(1001).fill(1) } }, { constructor: 1 },
    Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`field${i}`, 1])),
  ])('rejects invalid or oversized predicates (%j)', condition => {
    expect(transitionConditionError(condition)).toBeDefined();
  });
});
