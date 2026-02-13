/**
 * Unit tests for useSearch and useFilters composables.
 */
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFilters, useSearch } from './useSearch';

describe('useSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should have empty search text initially', () => {
      const { searchText, debouncedSearch, isSearching } = useSearch();

      expect(searchText.value).toBe('');
      expect(debouncedSearch.value).toBe('');
      expect(isSearching.value).toBe(false);
    });
  });

  describe('search behavior', () => {
    it('should update searchText immediately', () => {
      const { searchText } = useSearch();

      searchText.value = 'test';

      expect(searchText.value).toBe('test');
    });

    it('should debounce the search value', async () => {
      const onSearch = vi.fn();
      const { searchText, debouncedSearch } = useSearch(onSearch, { debounceMs: 300 });

      searchText.value = 'test';
      await nextTick(); // Wait for Vue reactivity

      // Before debounce delay
      expect(debouncedSearch.value).toBe('');
      expect(onSearch).not.toHaveBeenCalled();

      // After debounce delay
      vi.advanceTimersByTime(300);
      expect(debouncedSearch.value).toBe('test');
      expect(onSearch).toHaveBeenCalledWith('test');
    });

    it('should set isSearching while debouncing', async () => {
      const { searchText, isSearching } = useSearch();

      searchText.value = 'test';
      await nextTick(); // Wait for Vue reactivity

      expect(isSearching.value).toBe(true);

      vi.advanceTimersByTime(300);
      expect(isSearching.value).toBe(false);
    });

    it('should respect minLength option', async () => {
      const onSearch = vi.fn();
      const { searchText, debouncedSearch } = useSearch(onSearch, {
        debounceMs: 100,
        minLength: 3,
      });

      // Too short
      searchText.value = 'ab';
      await nextTick();
      vi.advanceTimersByTime(100);
      expect(debouncedSearch.value).toBe('');
      expect(onSearch).not.toHaveBeenCalled();

      // Long enough
      searchText.value = 'abc';
      await nextTick();
      vi.advanceTimersByTime(100);
      expect(debouncedSearch.value).toBe('abc');
      expect(onSearch).toHaveBeenCalledWith('abc');
    });

    it('should allow empty string even with minLength', async () => {
      const onSearch = vi.fn();
      const { searchText, debouncedSearch } = useSearch(onSearch, {
        debounceMs: 100,
        minLength: 3,
      });

      // Start with something
      searchText.value = 'abc';
      await nextTick();
      vi.advanceTimersByTime(100);

      // Clear to empty
      searchText.value = '';
      await nextTick();
      vi.advanceTimersByTime(100);
      expect(debouncedSearch.value).toBe('');
      expect(onSearch).toHaveBeenCalledWith('');
    });

    it('should cancel previous debounce on rapid typing', async () => {
      const onSearch = vi.fn();
      const { searchText } = useSearch(onSearch, { debounceMs: 300 });

      searchText.value = 't';
      await nextTick();
      vi.advanceTimersByTime(100);

      searchText.value = 'te';
      await nextTick();
      vi.advanceTimersByTime(100);

      searchText.value = 'tes';
      await nextTick();
      vi.advanceTimersByTime(100);

      searchText.value = 'test';
      await nextTick();
      vi.advanceTimersByTime(300);

      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onSearch).toHaveBeenCalledWith('test');
    });
  });

  describe('clearSearch', () => {
    it('should clear all search state', () => {
      const { searchText, debouncedSearch, isSearching, clearSearch } = useSearch();

      searchText.value = 'test';
      vi.advanceTimersByTime(300);

      clearSearch();

      expect(searchText.value).toBe('');
      expect(debouncedSearch.value).toBe('');
      expect(isSearching.value).toBe(false);
    });

    it('should cancel pending debounce', () => {
      const onSearch = vi.fn();
      const { searchText, clearSearch } = useSearch(onSearch, { debounceMs: 300 });

      searchText.value = 'test';
      vi.advanceTimersByTime(100);

      clearSearch();
      vi.advanceTimersByTime(300);

      expect(onSearch).not.toHaveBeenCalled();
    });
  });
});

describe('useFilters', () => {
  describe('initial state', () => {
    it('should have empty filters initially', () => {
      const { filters, hasActiveFilters, activeFilterCount } = useFilters();

      expect(filters.value).toEqual({});
      expect(hasActiveFilters.value).toBe(false);
      expect(activeFilterCount.value).toBe(0);
    });

    it('should accept default filters', () => {
      const { filters } = useFilters({
        defaultFilters: { status: 'active', department: null },
      });

      expect(filters.value).toEqual({ status: 'active', department: null });
    });

    it('should count only active filters', () => {
      const { hasActiveFilters, activeFilterCount } = useFilters({
        defaultFilters: { status: 'active', department: null, search: '' },
      });

      expect(hasActiveFilters.value).toBe(true);
      expect(activeFilterCount.value).toBe(1);
    });
  });

  describe('setFilter', () => {
    it('should set a filter value', () => {
      const { filters, setFilter } = useFilters<{
        status?: string;
        department?: number;
      }>();

      setFilter('status', 'active');

      expect(filters.value.status).toBe('active');
    });

    it('should update active filter counts', () => {
      const { setFilter, hasActiveFilters, activeFilterCount } = useFilters<{
        status?: string;
        department?: number;
      }>();

      setFilter('status', 'active');
      expect(hasActiveFilters.value).toBe(true);
      expect(activeFilterCount.value).toBe(1);

      setFilter('department', 1);
      expect(activeFilterCount.value).toBe(2);
    });

    it('should call onFilterChange callback', () => {
      const onFilterChange = vi.fn();
      const { setFilter } = useFilters({
        onFilterChange,
      });

      setFilter('status', 'active');

      expect(onFilterChange).toHaveBeenCalledWith({ status: 'active' });
    });
  });

  describe('clearFilter', () => {
    it('should clear a specific filter to default value', () => {
      const { filters, setFilter, clearFilter } = useFilters({
        defaultFilters: { status: 'all' },
      });

      setFilter('status', 'active');
      expect(filters.value.status).toBe('active');

      clearFilter('status');
      expect(filters.value.status).toBe('all');
    });

    it('should update active filter counts', () => {
      const { setFilter, clearFilter, activeFilterCount } = useFilters<{
        status?: string;
        department?: number;
      }>();

      setFilter('status', 'active');
      setFilter('department', 1);
      expect(activeFilterCount.value).toBe(2);

      clearFilter('status');
      expect(activeFilterCount.value).toBe(1);
    });
  });

  describe('resetFilters', () => {
    it('should reset all filters to default values', () => {
      const { filters, setFilter, resetFilters } = useFilters<{ status: string; department: number | null }>({
        defaultFilters: { status: 'all', department: null },
      });

      setFilter('status', 'active');
      setFilter('department', 5);

      resetFilters();

      expect(filters.value).toEqual({ status: 'all', department: null });
    });

    it('should call onFilterChange callback', () => {
      const onFilterChange = vi.fn();
      const { setFilter, resetFilters } = useFilters({
        defaultFilters: { status: 'all' },
        onFilterChange,
      });

      setFilter('status', 'active');
      onFilterChange.mockClear();

      resetFilters();

      expect(onFilterChange).toHaveBeenCalledWith({ status: 'all' });
    });
  });

  describe('active filter detection', () => {
    it('should not count null as active', () => {
      const { setFilter, hasActiveFilters } = useFilters<{ value?: null }>();

      setFilter('value', null);

      expect(hasActiveFilters.value).toBe(false);
    });

    it('should not count undefined as active', () => {
      const { setFilter, hasActiveFilters } = useFilters<{ value?: undefined }>();

      setFilter('value', undefined);

      expect(hasActiveFilters.value).toBe(false);
    });

    it('should not count empty string as active', () => {
      const { setFilter, hasActiveFilters } = useFilters<{ value?: string }>();

      setFilter('value', '');

      expect(hasActiveFilters.value).toBe(false);
    });

    it('should not count empty array as active', () => {
      const { setFilter, hasActiveFilters } = useFilters<{ value?: string[] }>();

      setFilter('value', []);

      expect(hasActiveFilters.value).toBe(false);
    });

    it('should count non-empty array as active', () => {
      const { setFilter, hasActiveFilters } = useFilters<{ value?: string[] }>();

      setFilter('value', ['item']);

      expect(hasActiveFilters.value).toBe(true);
    });

    it('should count zero as active', () => {
      const { setFilter, hasActiveFilters } = useFilters<{ value?: number }>();

      setFilter('value', 0);

      expect(hasActiveFilters.value).toBe(true);
    });

    it('should count false as active', () => {
      const { setFilter, hasActiveFilters } = useFilters<{ value?: boolean }>();

      setFilter('value', false);

      expect(hasActiveFilters.value).toBe(true);
    });
  });
});
