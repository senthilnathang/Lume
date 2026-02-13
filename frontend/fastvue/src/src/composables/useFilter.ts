import { ref, computed, type Ref, type ComputedRef } from 'vue';

// Types matching FilterBuilder component
export type FieldType = 'text' | 'number' | 'date' | 'select' | 'boolean';
export type Operator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'is_empty'
  | 'is_not_empty'
  | 'is_true'
  | 'is_false';

export type LogicalOperator = 'and' | 'or';

export interface FilterField {
  key: string;
  label: string;
  type: FieldType;
  options?: { label: string; value: any }[];
}

export interface FilterCondition {
  id: string;
  field: string;
  operator: Operator;
  value: any;
}

export interface FilterGroup {
  id: string;
  logic: LogicalOperator;
  conditions: FilterCondition[];
}

export interface UseFilterOptions {
  defaultLogic?: LogicalOperator;
  onApply?: (params: Record<string, any>) => void;
}

export interface UseFilterReturn {
  filterGroup: Ref<FilterGroup>;
  activeFilterCount: ComputedRef<number>;
  hasActiveFilters: ComputedRef<boolean>;
  toQueryParams: () => Record<string, any>;
  toDjangoFilter: () => Record<string, any>;
  applyFilters: () => Record<string, any>;
  clearFilters: () => void;
  setFilters: (group: FilterGroup) => void;
}

/**
 * Composable for managing filter state and converting to API parameters
 */
export function useFilter(options: UseFilterOptions = {}): UseFilterReturn {
  const { defaultLogic = 'and', onApply } = options;

  const filterGroup = ref<FilterGroup>({
    id: generateId(),
    logic: defaultLogic,
    conditions: [],
  });

  const activeFilterCount = computed(() => filterGroup.value.conditions.length);
  const hasActiveFilters = computed(() => filterGroup.value.conditions.length > 0);

  function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  /**
   * Convert operator to Django ORM lookup suffix
   */
  function operatorToLookup(operator: Operator): string {
    const lookupMap: Record<Operator, string> = {
      equals: '',
      not_equals: '__ne', // Will need custom handling
      contains: '__icontains',
      not_contains: '__icontains', // Will need exclude handling
      starts_with: '__istartswith',
      ends_with: '__iendswith',
      greater_than: '__gt',
      less_than: '__lt',
      greater_than_or_equal: '__gte',
      less_than_or_equal: '__lte',
      is_empty: '__isnull',
      is_not_empty: '__isnull',
      is_true: '',
      is_false: '',
    };
    return lookupMap[operator] || '';
  }

  /**
   * Convert filters to generic query parameters
   */
  function toQueryParams(): Record<string, any> {
    const params: Record<string, any> = {};

    if (filterGroup.value.conditions.length === 0) {
      return params;
    }

    // For simple cases, create flat query params
    filterGroup.value.conditions.forEach((condition) => {
      const { field, operator, value } = condition;

      // Handle valueless operators
      if (operator === 'is_empty') {
        params[`${field}__isnull`] = true;
        return;
      }
      if (operator === 'is_not_empty') {
        params[`${field}__isnull`] = false;
        return;
      }
      if (operator === 'is_true') {
        params[field] = true;
        return;
      }
      if (operator === 'is_false') {
        params[field] = false;
        return;
      }

      // Handle operators with values
      const lookup = operatorToLookup(operator);
      const paramKey = `${field}${lookup}`;

      // Handle negation operators specially
      if (operator === 'not_equals' || operator === 'not_contains') {
        params[`exclude_${field}`] = value;
      } else {
        params[paramKey] = value;
      }
    });

    // Add logic operator if multiple conditions
    if (filterGroup.value.conditions.length > 1) {
      params._filter_logic = filterGroup.value.logic;
    }

    return params;
  }

  /**
   * Convert filters to Django REST Framework compatible format
   * This creates a more structured filter object
   */
  function toDjangoFilter(): Record<string, any> {
    const filters: Record<string, any> = {};

    if (filterGroup.value.conditions.length === 0) {
      return filters;
    }

    filterGroup.value.conditions.forEach((condition) => {
      const { field, operator, value } = condition;

      switch (operator) {
        case 'equals':
          filters[field] = value;
          break;
        case 'not_equals':
          filters[`${field}__ne`] = value;
          break;
        case 'contains':
          filters[`${field}__icontains`] = value;
          break;
        case 'not_contains':
          filters[`${field}__not_icontains`] = value;
          break;
        case 'starts_with':
          filters[`${field}__istartswith`] = value;
          break;
        case 'ends_with':
          filters[`${field}__iendswith`] = value;
          break;
        case 'greater_than':
          filters[`${field}__gt`] = value;
          break;
        case 'less_than':
          filters[`${field}__lt`] = value;
          break;
        case 'greater_than_or_equal':
          filters[`${field}__gte`] = value;
          break;
        case 'less_than_or_equal':
          filters[`${field}__lte`] = value;
          break;
        case 'is_empty':
          filters[`${field}__isnull`] = true;
          break;
        case 'is_not_empty':
          filters[`${field}__isnull`] = false;
          break;
        case 'is_true':
          filters[field] = true;
          break;
        case 'is_false':
          filters[field] = false;
          break;
      }
    });

    return filters;
  }

  /**
   * Apply filters and optionally call the onApply callback
   */
  function applyFilters(): Record<string, any> {
    const params = toQueryParams();
    onApply?.(params);
    return params;
  }

  /**
   * Clear all filter conditions
   */
  function clearFilters(): void {
    filterGroup.value.conditions = [];
  }

  /**
   * Set filters from external source
   */
  function setFilters(group: FilterGroup): void {
    filterGroup.value = group;
  }

  return {
    filterGroup,
    activeFilterCount,
    hasActiveFilters,
    toQueryParams,
    toDjangoFilter,
    applyFilters,
    clearFilters,
    setFilters,
  };
}

/**
 * Helper to create filter field definitions
 */
export function createFilterFields(
  fields: Array<{
    key: string;
    label: string;
    type?: FieldType;
    options?: { label: string; value: any }[];
  }>
): FilterField[] {
  return fields.map((f) => ({
    key: f.key,
    label: f.label,
    type: f.type || 'text',
    options: f.options,
  }));
}

/**
 * Preset filter field definitions for common model fields
 */
export const commonFilterFields = {
  isActive: {
    key: 'is_active',
    label: 'Active Status',
    type: 'boolean' as FieldType,
  },
  createdAt: {
    key: 'created_at',
    label: 'Created Date',
    type: 'date' as FieldType,
  },
  updatedAt: {
    key: 'updated_at',
    label: 'Updated Date',
    type: 'date' as FieldType,
  },
  name: {
    key: 'name',
    label: 'Name',
    type: 'text' as FieldType,
  },
};
