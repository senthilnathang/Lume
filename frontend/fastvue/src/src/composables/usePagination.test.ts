/**
 * Unit tests for usePagination composable.
 */
import { describe, expect, it } from 'vitest';

import { usePagination } from './usePagination';

describe('usePagination', () => {
  describe('initial state', () => {
    it('should have default pagination values', () => {
      const { pagination } = usePagination();

      expect(pagination.current).toBe(1);
      expect(pagination.pageSize).toBe(20);
      expect(pagination.total).toBe(0);
      expect(pagination.showSizeChanger).toBe(true);
      expect(pagination.showQuickJumper).toBe(true);
    });

    it('should accept custom default page size', () => {
      const { pagination } = usePagination({ defaultPageSize: 50 });

      expect(pagination.pageSize).toBe(50);
    });

    it('should accept custom page size options', () => {
      const options = ['25', '50', '75'];
      const { pagination } = usePagination({ pageSizeOptions: options });

      expect(pagination.pageSizeOptions).toEqual(options);
    });

    it('should have showTotal function', () => {
      const { pagination } = usePagination();

      expect(pagination.showTotal(100)).toBe('Total 100 items');
    });
  });

  describe('setTotal', () => {
    it('should update total count', () => {
      const { pagination, setTotal } = usePagination();

      setTotal(250);

      expect(pagination.total).toBe(250);
    });
  });

  describe('setPage', () => {
    it('should update current page', () => {
      const { pagination, setPage } = usePagination();

      setPage(5);

      expect(pagination.current).toBe(5);
    });
  });

  describe('setPageSize', () => {
    it('should update page size', () => {
      const { pagination, setPageSize } = usePagination();

      setPageSize(50);

      expect(pagination.pageSize).toBe(50);
    });
  });

  describe('resetPagination', () => {
    it('should reset current page to 1', () => {
      const { pagination, setPage, resetPagination } = usePagination();

      setPage(10);
      expect(pagination.current).toBe(10);

      resetPagination();
      expect(pagination.current).toBe(1);
    });

    it('should preserve other pagination values', () => {
      const { pagination, setTotal, setPageSize, setPage, resetPagination } = usePagination();

      setTotal(500);
      setPageSize(50);
      setPage(10);

      resetPagination();

      expect(pagination.current).toBe(1);
      expect(pagination.total).toBe(500);
      expect(pagination.pageSize).toBe(50);
    });
  });

  describe('handleTableChange', () => {
    it('should update current page from table event', () => {
      const { pagination, handleTableChange } = usePagination();

      handleTableChange({ current: 3 });

      expect(pagination.current).toBe(3);
    });

    it('should update page size from table event', () => {
      const { pagination, handleTableChange } = usePagination();

      handleTableChange({ pageSize: 50 });

      expect(pagination.pageSize).toBe(50);
    });

    it('should update both from table event', () => {
      const { pagination, handleTableChange } = usePagination();

      handleTableChange({ current: 2, pageSize: 100 });

      expect(pagination.current).toBe(2);
      expect(pagination.pageSize).toBe(100);
    });

    it('should handle empty event gracefully', () => {
      const { pagination, handleTableChange } = usePagination();
      const initialCurrent = pagination.current;
      const initialPageSize = pagination.pageSize;

      handleTableChange({});

      expect(pagination.current).toBe(initialCurrent);
      expect(pagination.pageSize).toBe(initialPageSize);
    });
  });

  describe('getParams', () => {
    it('should return page and page_size for API calls', () => {
      const { getParams } = usePagination();

      const params = getParams();

      expect(params).toEqual({
        page: 1,
        page_size: 20,
      });
    });

    it('should reflect current pagination state', () => {
      const { setPage, setPageSize, getParams } = usePagination();

      setPage(3);
      setPageSize(50);

      const params = getParams();

      expect(params).toEqual({
        page: 3,
        page_size: 50,
      });
    });
  });
});
