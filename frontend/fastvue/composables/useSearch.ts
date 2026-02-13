import { ref, watch, type Ref } from 'vue';

export interface UseSearchOptions {
  debounceMs?: number;
  minLength?: number;
}

export interface UseSearchReturn {
  searchText: Ref<string>;
  debouncedSearch: Ref<string>;
  isSearching: Ref<boolean>;
  clearSearch: () => void;
}

export function useSearch(
  onSearch?: (value: string) => void,
  options: UseSearchOptions = {}
): UseSearchReturn {
  const { debounceMs = 300, minLength = 0 } = options;

  const searchText = ref('');
  const debouncedSearch = ref('');
  const isSearching = ref(false);
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  watch(searchText, (newValue) => {
    isSearching.value = true;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      if (newValue.length >= minLength || newValue.length === 0) {
        debouncedSearch.value = newValue;
        onSearch?.(newValue);
      }
      isSearching.value = false;
    }, debounceMs);
  });

  function clearSearch() {
    searchText.value = '';
    debouncedSearch.value = '';
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    isSearching.value = false;
  }

  return {
    searchText,
    debouncedSearch,
    isSearching,
    clearSearch,
  };
}

/**
 * Composable for managing multiple filters
 */
export interface UseFiltersOptions<T> {
  defaultFilters?: Partial<T>;
  onFilterChange?: (filters: T) => void;
}

export function useFilters<T extends Record<string, any>>(
  options: UseFiltersOptions<T> = {}
): {
  filters: Ref<T>;
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  resetFilters: () => void;
  clearFilter: <K extends keyof T>(key: K) => void;
  hasActiveFilters: Ref<boolean>;
  activeFilterCount: Ref<number>;
} {
  const { defaultFilters = {} as Partial<T>, onFilterChange } = options;

  const filters = ref({ ...defaultFilters } as T) as Ref<T>;
  const hasActiveFilters = ref(false);
  const activeFilterCount = ref(0);

  function updateFilterState() {
    const entries = Object.entries(filters.value);
    const active = entries.filter(([_, value]) => {
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    });
    hasActiveFilters.value = active.length > 0;
    activeFilterCount.value = active.length;
  }

  function setFilter<K extends keyof T>(key: K, value: T[K]) {
    filters.value[key] = value;
    updateFilterState();
    onFilterChange?.(filters.value);
  }

  function clearFilter<K extends keyof T>(key: K) {
    filters.value[key] = (defaultFilters as T)[key];
    updateFilterState();
    onFilterChange?.(filters.value);
  }

  function resetFilters() {
    Object.assign(filters.value, defaultFilters);
    updateFilterState();
    onFilterChange?.(filters.value);
  }

  updateFilterState();

  return {
    filters,
    setFilter,
    resetFilters,
    clearFilter,
    hasActiveFilters,
    activeFilterCount,
  };
}
