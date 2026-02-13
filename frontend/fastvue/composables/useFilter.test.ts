/**
 * Unit tests for the useFilter composable.
 */
import { describe, expect, it, vi } from 'vitest';

import {
  useFilter,
  createFilterFields,
  commonFilterFields,
  type FilterGroup,
  type Operator,
} from './useFilter';

describe('useFilter', () => {
  describe('initial state', () => {
    it('should have empty filter group initially', () => {
      const { filterGroup } = useFilter();
      expect(filterGroup.value.conditions).toEqual([]);
      expect(filterGroup.value.logic).toBe('and');
    });

    it('should use custom default logic', () => {
      const { filterGroup } = useFilter({ defaultLogic: 'or' });
      expect(filterGroup.value.logic).toBe('or');
    });

    it('should have generated id', () => {
      const { filterGroup } = useFilter();
      expect(filterGroup.value.id).toBeDefined();
      expect(typeof filterGroup.value.id).toBe('string');
    });
  });

  describe('activeFilterCount', () => {
    it('should return 0 when no filters', () => {
      const { activeFilterCount } = useFilter();
      expect(activeFilterCount.value).toBe(0);
    });

    it('should return correct count with filters', () => {
      const { filterGroup, activeFilterCount } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'name', operator: 'contains', value: 'test' },
        { id: '2', field: 'status', operator: 'equals', value: 'active' },
      ];
      expect(activeFilterCount.value).toBe(2);
    });
  });

  describe('hasActiveFilters', () => {
    it('should return false when no filters', () => {
      const { hasActiveFilters } = useFilter();
      expect(hasActiveFilters.value).toBe(false);
    });

    it('should return true with filters', () => {
      const { filterGroup, hasActiveFilters } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'name', operator: 'equals', value: 'test' },
      ];
      expect(hasActiveFilters.value).toBe(true);
    });
  });

  describe('toQueryParams', () => {
    it('should return empty object when no filters', () => {
      const { toQueryParams } = useFilter();
      expect(toQueryParams()).toEqual({});
    });

    it('should convert equals operator', () => {
      const { filterGroup, toQueryParams } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'status', operator: 'equals', value: 'active' },
      ];
      expect(toQueryParams()).toEqual({ status: 'active' });
    });

    it('should convert contains operator', () => {
      const { filterGroup, toQueryParams } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'name', operator: 'contains', value: 'john' },
      ];
      expect(toQueryParams()).toEqual({ name__icontains: 'john' });
    });

    it('should convert starts_with operator', () => {
      const { filterGroup, toQueryParams } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'name', operator: 'starts_with', value: 'A' },
      ];
      expect(toQueryParams()).toEqual({ name__istartswith: 'A' });
    });

    it('should convert ends_with operator', () => {
      const { filterGroup, toQueryParams } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'email', operator: 'ends_with', value: '.com' },
      ];
      expect(toQueryParams()).toEqual({ email__iendswith: '.com' });
    });

    it('should convert greater_than operator', () => {
      const { filterGroup, toQueryParams } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'age', operator: 'greater_than', value: 18 },
      ];
      expect(toQueryParams()).toEqual({ age__gt: 18 });
    });

    it('should convert less_than operator', () => {
      const { filterGroup, toQueryParams } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'price', operator: 'less_than', value: 100 },
      ];
      expect(toQueryParams()).toEqual({ price__lt: 100 });
    });

    it('should convert greater_than_or_equal operator', () => {
      const { filterGroup, toQueryParams } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'count', operator: 'greater_than_or_equal', value: 5 },
      ];
      expect(toQueryParams()).toEqual({ count__gte: 5 });
    });

    it('should convert less_than_or_equal operator', () => {
      const { filterGroup, toQueryParams } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'count', operator: 'less_than_or_equal', value: 10 },
      ];
      expect(toQueryParams()).toEqual({ count__lte: 10 });
    });

    it('should convert is_empty operator', () => {
      const { filterGroup, toQueryParams } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'notes', operator: 'is_empty', value: null },
      ];
      expect(toQueryParams()).toEqual({ notes__isnull: true });
    });

    it('should convert is_not_empty operator', () => {
      const { filterGroup, toQueryParams } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'notes', operator: 'is_not_empty', value: null },
      ];
      expect(toQueryParams()).toEqual({ notes__isnull: false });
    });

    it('should convert is_true operator', () => {
      const { filterGroup, toQueryParams } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'is_active', operator: 'is_true', value: null },
      ];
      expect(toQueryParams()).toEqual({ is_active: true });
    });

    it('should convert is_false operator', () => {
      const { filterGroup, toQueryParams } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'is_active', operator: 'is_false', value: null },
      ];
      expect(toQueryParams()).toEqual({ is_active: false });
    });

    it('should handle not_equals operator', () => {
      const { filterGroup, toQueryParams } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'status', operator: 'not_equals', value: 'draft' },
      ];
      expect(toQueryParams()).toEqual({ exclude_status: 'draft' });
    });

    it('should handle not_contains operator', () => {
      const { filterGroup, toQueryParams } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'name', operator: 'not_contains', value: 'test' },
      ];
      expect(toQueryParams()).toEqual({ exclude_name: 'test' });
    });

    it('should add _filter_logic for multiple conditions', () => {
      const { filterGroup, toQueryParams } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'name', operator: 'contains', value: 'john' },
        { id: '2', field: 'status', operator: 'equals', value: 'active' },
      ];
      const params = toQueryParams();
      expect(params._filter_logic).toBe('and');
    });
  });

  describe('toDjangoFilter', () => {
    it('should return empty object when no filters', () => {
      const { toDjangoFilter } = useFilter();
      expect(toDjangoFilter()).toEqual({});
    });

    it('should convert equals operator', () => {
      const { filterGroup, toDjangoFilter } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'status', operator: 'equals', value: 'active' },
      ];
      expect(toDjangoFilter()).toEqual({ status: 'active' });
    });

    it('should convert not_equals operator', () => {
      const { filterGroup, toDjangoFilter } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'status', operator: 'not_equals', value: 'draft' },
      ];
      expect(toDjangoFilter()).toEqual({ status__ne: 'draft' });
    });

    it('should convert contains operator', () => {
      const { filterGroup, toDjangoFilter } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'name', operator: 'contains', value: 'john' },
      ];
      expect(toDjangoFilter()).toEqual({ name__icontains: 'john' });
    });

    it('should convert not_contains operator', () => {
      const { filterGroup, toDjangoFilter } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'name', operator: 'not_contains', value: 'test' },
      ];
      expect(toDjangoFilter()).toEqual({ name__not_icontains: 'test' });
    });
  });

  describe('applyFilters', () => {
    it('should call onApply callback', () => {
      const onApply = vi.fn();
      const { filterGroup, applyFilters } = useFilter({ onApply });
      filterGroup.value.conditions = [
        { id: '1', field: 'name', operator: 'equals', value: 'test' },
      ];
      applyFilters();
      expect(onApply).toHaveBeenCalledWith({ name: 'test' });
    });

    it('should return query params', () => {
      const { filterGroup, applyFilters } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'status', operator: 'equals', value: 'active' },
      ];
      const result = applyFilters();
      expect(result).toEqual({ status: 'active' });
    });
  });

  describe('clearFilters', () => {
    it('should clear all conditions', () => {
      const { filterGroup, clearFilters } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'name', operator: 'equals', value: 'test' },
        { id: '2', field: 'status', operator: 'equals', value: 'active' },
      ];
      clearFilters();
      expect(filterGroup.value.conditions).toEqual([]);
    });
  });

  describe('setFilters', () => {
    it('should set filter group', () => {
      const { filterGroup, setFilters } = useFilter();
      const newGroup: FilterGroup = {
        id: 'custom-id',
        logic: 'or',
        conditions: [
          { id: '1', field: 'name', operator: 'contains', value: 'john' },
        ],
      };
      setFilters(newGroup);
      expect(filterGroup.value).toEqual(newGroup);
    });
  });
});

describe('createFilterFields', () => {
  it('should create filter field definitions', () => {
    const fields = createFilterFields([
      { key: 'name', label: 'Name' },
      { key: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'active' }] },
    ]);

    expect(fields).toHaveLength(2);
    expect(fields[0]).toEqual({ key: 'name', label: 'Name', type: 'text' });
    expect(fields[1]!.type).toBe('select');
    expect(fields[1]!.options).toBeDefined();
  });

  it('should default to text type', () => {
    const fields = createFilterFields([
      { key: 'name', label: 'Name' },
    ]);
    expect(fields[0]!.type).toBe('text');
  });
});

describe('commonFilterFields', () => {
  it('should have isActive field', () => {
    expect(commonFilterFields.isActive).toBeDefined();
    expect(commonFilterFields.isActive.key).toBe('is_active');
    expect(commonFilterFields.isActive.type).toBe('boolean');
  });

  it('should have createdAt field', () => {
    expect(commonFilterFields.createdAt).toBeDefined();
    expect(commonFilterFields.createdAt.key).toBe('created_at');
    expect(commonFilterFields.createdAt.type).toBe('date');
  });

  it('should have updatedAt field', () => {
    expect(commonFilterFields.updatedAt).toBeDefined();
    expect(commonFilterFields.updatedAt.key).toBe('updated_at');
    expect(commonFilterFields.updatedAt.type).toBe('date');
  });

  it('should have name field', () => {
    expect(commonFilterFields.name).toBeDefined();
    expect(commonFilterFields.name.key).toBe('name');
    expect(commonFilterFields.name.type).toBe('text');
  });
});

describe('operator conversion edge cases', () => {
  it('should handle all operators in toDjangoFilter', () => {
    const operators: Operator[] = [
      'equals',
      'not_equals',
      'contains',
      'not_contains',
      'starts_with',
      'ends_with',
      'greater_than',
      'less_than',
      'greater_than_or_equal',
      'less_than_or_equal',
      'is_empty',
      'is_not_empty',
      'is_true',
      'is_false',
    ];

    operators.forEach((operator) => {
      const { filterGroup, toDjangoFilter } = useFilter();
      filterGroup.value.conditions = [
        { id: '1', field: 'test_field', operator, value: 'test_value' },
      ];
      const result = toDjangoFilter();
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });
  });
});
