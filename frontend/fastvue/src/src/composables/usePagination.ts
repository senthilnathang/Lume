import { reactive } from 'vue';

export interface PaginationOptions {
  defaultPageSize?: number;
  pageSizeOptions?: string[];
}

export interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger: boolean;
  showQuickJumper: boolean;
  pageSizeOptions: string[];
  showTotal: (total: number) => string;
}

export function usePagination(options: PaginationOptions = {}) {
  const { defaultPageSize = 20, pageSizeOptions = ['10', '20', '50', '100'] } = options;

  const pagination = reactive<PaginationState>({
    current: 1,
    pageSize: defaultPageSize,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions,
    showTotal: (total: number) => `Total ${total} items`,
  });

  function setTotal(total: number) {
    pagination.total = total;
  }

  function setPage(page: number) {
    pagination.current = page;
  }

  function setPageSize(size: number) {
    pagination.pageSize = size;
  }

  function resetPagination() {
    pagination.current = 1;
  }

  function handleTableChange(pag: { current?: number; pageSize?: number }) {
    if (pag.current) pagination.current = pag.current;
    if (pag.pageSize) pagination.pageSize = pag.pageSize;
  }

  function getParams() {
    return {
      page: pagination.current,
      page_size: pagination.pageSize,
    };
  }

  return {
    pagination,
    setTotal,
    setPage,
    setPageSize,
    resetPagination,
    handleTableChange,
    getParams,
  };
}
