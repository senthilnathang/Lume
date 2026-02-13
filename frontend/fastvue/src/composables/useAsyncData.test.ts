/**
 * Unit tests for useAsyncData and usePaginatedData composables.
 */
import { describe, expect, it, vi } from 'vitest';

import { useAsyncData, usePaginatedData } from './useAsyncData';

// Mock ant-design-vue message
vi.mock('ant-design-vue', () => ({
  message: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
  },
}));

describe('useAsyncData', () => {
  describe('initial state', () => {
    it('should have null data initially', () => {
      const fetcher = vi.fn().mockResolvedValue({ id: 1 });
      const { data, loading, error } = useAsyncData(fetcher);

      expect(data.value).toBeNull();
      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
    });

    it('should not execute fetcher immediately by default', () => {
      const fetcher = vi.fn().mockResolvedValue({ id: 1 });
      useAsyncData(fetcher);

      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should execute immediately when immediate option is true', async () => {
      const fetcher = vi.fn().mockResolvedValue({ id: 1 });
      useAsyncData(fetcher, { immediate: true });

      expect(fetcher).toHaveBeenCalled();
    });
  });

  describe('execute', () => {
    it('should set loading to true during fetch', async () => {
      let resolvePromise: (value: any) => void;
      const fetcher = vi.fn().mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve; })
      );

      const { loading, execute } = useAsyncData(fetcher);

      const promise = execute();
      expect(loading.value).toBe(true);

      resolvePromise!({ id: 1 });
      await promise;
      expect(loading.value).toBe(false);
    });

    it('should update data on successful fetch', async () => {
      const mockData = { id: 1, name: 'Test' };
      const fetcher = vi.fn().mockResolvedValue(mockData);

      const { data, execute } = useAsyncData(fetcher);

      await execute();

      expect(data.value).toEqual(mockData);
    });

    it('should return the fetched data', async () => {
      const mockData = { id: 1, name: 'Test' };
      const fetcher = vi.fn().mockResolvedValue(mockData);

      const { execute } = useAsyncData(fetcher);

      const result = await execute();

      expect(result).toEqual(mockData);
    });

    it('should set error on fetch failure', async () => {
      const mockError = new Error('Network error');
      const fetcher = vi.fn().mockRejectedValue(mockError);

      const { error, execute } = useAsyncData(fetcher, { showErrorMessage: false });

      await execute();

      expect(error.value).toBe(mockError);
    });

    it('should return null on fetch failure', async () => {
      const fetcher = vi.fn().mockRejectedValue(new Error('Network error'));

      const { execute } = useAsyncData(fetcher, { showErrorMessage: false });

      const result = await execute();

      expect(result).toBeNull();
    });

    it('should clear previous error on new fetch', async () => {
      const fetcher = vi.fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce({ id: 1 });

      const { error, execute } = useAsyncData(fetcher, { showErrorMessage: false });

      await execute();
      expect(error.value).not.toBeNull();

      await execute();
      expect(error.value).toBeNull();
    });
  });

  describe('refresh', () => {
    it('should call execute', async () => {
      const mockData = { id: 1 };
      const fetcher = vi.fn().mockResolvedValue(mockData);

      const { data, refresh } = useAsyncData(fetcher);

      await refresh();

      expect(fetcher).toHaveBeenCalled();
      expect(data.value).toEqual(mockData);
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      const fetcher = vi.fn().mockResolvedValue({ id: 1 });

      const { data, loading, error, execute, reset } = useAsyncData(fetcher);

      await execute();
      expect(data.value).not.toBeNull();

      reset();

      expect(data.value).toBeNull();
      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
    });
  });
});

describe('usePaginatedData', () => {
  const createMockResponse = (count: number, results: any[]) => ({
    count,
    results,
    next: null,
    previous: null,
  });

  describe('initial state', () => {
    it('should have empty items initially', () => {
      const fetcher = vi.fn();
      const { items, total, loading, error } = usePaginatedData(fetcher);

      expect(items.value).toEqual([]);
      expect(total.value).toBe(0);
      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
    });

    it('should have default page and pageSize', () => {
      const fetcher = vi.fn();
      const { page, pageSize } = usePaginatedData(fetcher);

      expect(page.value).toBe(1);
      expect(pageSize.value).toBe(20);
    });

    it('should accept custom default page size', () => {
      const fetcher = vi.fn();
      const { pageSize } = usePaginatedData(fetcher, { defaultPageSize: 50 });

      expect(pageSize.value).toBe(50);
    });
  });

  describe('fetch', () => {
    it('should call fetcher with pagination params', async () => {
      const fetcher = vi.fn().mockResolvedValue(createMockResponse(0, []));

      const { fetch } = usePaginatedData(fetcher);

      await fetch();

      expect(fetcher).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
      });
    });

    it('should call fetcher with additional params', async () => {
      const fetcher = vi.fn().mockResolvedValue(createMockResponse(0, []));

      const { fetch } = usePaginatedData(fetcher);

      await fetch({ status: 'active', search: 'test' });

      expect(fetcher).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
        status: 'active',
        search: 'test',
      });
    });

    it('should update items and total on success', async () => {
      const mockItems = [{ id: 1 }, { id: 2 }];
      const fetcher = vi.fn().mockResolvedValue(createMockResponse(100, mockItems));

      const { items, total, fetch } = usePaginatedData(fetcher);

      await fetch();

      expect(items.value).toEqual(mockItems);
      expect(total.value).toBe(100);
    });

    it('should set loading during fetch', async () => {
      let resolvePromise: (value: any) => void;
      const fetcher = vi.fn().mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve; })
      );

      const { loading, fetch } = usePaginatedData(fetcher);

      const promise = fetch();
      expect(loading.value).toBe(true);

      resolvePromise!(createMockResponse(0, []));
      await promise;
      expect(loading.value).toBe(false);
    });

    it('should handle errors', async () => {
      const mockError = new Error('Network error');
      const fetcher = vi.fn().mockRejectedValue(mockError);

      const { error, fetch } = usePaginatedData(fetcher, { showErrorMessage: false });

      await fetch();

      expect(error.value).toBe(mockError);
    });

    it('should handle missing results gracefully', async () => {
      const fetcher = vi.fn().mockResolvedValue({});

      const { items, total, fetch } = usePaginatedData(fetcher);

      await fetch();

      expect(items.value).toEqual([]);
      expect(total.value).toBe(0);
    });
  });

  describe('setPage', () => {
    it('should update page number', () => {
      const fetcher = vi.fn();
      const { page, setPage } = usePaginatedData(fetcher);

      setPage(5);

      expect(page.value).toBe(5);
    });
  });

  describe('setPageSize', () => {
    it('should update page size', () => {
      const fetcher = vi.fn();
      const { pageSize, setPageSize } = usePaginatedData(fetcher);

      setPageSize(50);

      expect(pageSize.value).toBe(50);
    });

    it('should reset page to 1 when changing page size', () => {
      const fetcher = vi.fn();
      const { page, setPage, setPageSize } = usePaginatedData(fetcher);

      setPage(5);
      expect(page.value).toBe(5);

      setPageSize(50);
      expect(page.value).toBe(1);
    });
  });

  describe('refresh', () => {
    it('should call fetch with last used params', async () => {
      const fetcher = vi.fn().mockResolvedValue(createMockResponse(0, []));

      const { fetch, refresh } = usePaginatedData(fetcher);

      await fetch({ status: 'active' });
      fetcher.mockClear();

      await refresh();

      expect(fetcher).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
        status: 'active',
      });
    });
  });

  describe('pagination with fetch', () => {
    it('should use updated page in fetch', async () => {
      const fetcher = vi.fn().mockResolvedValue(createMockResponse(100, []));

      const { setPage, fetch } = usePaginatedData(fetcher);

      setPage(3);
      await fetch();

      expect(fetcher).toHaveBeenCalledWith({
        page: 3,
        page_size: 20,
      });
    });

    it('should use updated pageSize in fetch', async () => {
      const fetcher = vi.fn().mockResolvedValue(createMockResponse(100, []));

      const { setPageSize, fetch } = usePaginatedData(fetcher);

      setPageSize(50);
      await fetch();

      expect(fetcher).toHaveBeenCalledWith({
        page: 1,
        page_size: 50,
      });
    });
  });
});
