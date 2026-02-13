import { ref, reactive, computed, watch } from 'vue';

export interface TableColumn {
  key: string;
  title: string;
  dataIndex?: string;
  width?: number | string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
  sorter?: boolean | ((a: any, b: any) => number);
  sortOrder?: 'ascend' | 'descend' | null;
  render?: (value: any, record: any, index: number) => any;
}

export interface TablePagination {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger: boolean;
  showQuickJumper: boolean;
  pageSizeOptions: string[];
}

export interface TableState {
  loading: boolean;
  dataSource: any[];
  columns: TableColumn[];
  pagination: TablePagination;
  selectedRowKeys: (string | number)[];
  sortField: string | null;
  sortOrder: 'ascend' | 'descend' | null;
  filters: Record<string, any>;
}

export function useTable<T = any>(options: {
  fetchFn: (params: any) => Promise<{ list: T[]; total: number }>;
  immediate?: boolean;
  defaultPageSize?: number;
} = {}) {
  const { fetchFn, immediate = true, defaultPageSize = 10 } = options;

  const state = reactive<TableState>({
    loading: false,
    dataSource: [],
    columns: [],
    pagination: {
      current: 1,
      pageSize: defaultPageSize,
      total: 0,
      showSizeChanger: true,
      showQuickJumper: true,
      pageSizeOptions: ['10', '20', '50', '100'],
    },
    selectedRowKeys: [],
    sortField: null,
    sortOrder: null,
    filters: {},
  });

  const searchParams = ref<Record<string, any>>({});

  const fetchData = async () => {
    state.loading = true;
    try {
      const params = {
        page: state.pagination.current,
        pageSize: state.pagination.pageSize,
        ...searchParams.value,
        ...state.filters,
        sortField: state.sortField,
        sortOrder: state.sortOrder,
      };

      const response = await fetchFn(params);
      state.dataSource = response.list || [];
      state.pagination.total = response.total || 0;
    } catch (error) {
      console.error('Table fetch error:', error);
      state.dataSource = [];
    } finally {
      state.loading = false;
    }
  };

  const setColumns = (columns: TableColumn[]) => {
    state.columns = columns;
  };

  const handleTableChange = (paginationInfo: any, filters: any, sorter: any) => {
    state.pagination.current = paginationInfo.current;
    state.pagination.pageSize = paginationInfo.pageSize;
    
    if (sorter.field) {
      state.sortField = sorter.field;
      state.sortOrder = sorter.order;
    } else {
      state.sortField = null;
      state.sortOrder = null;
    }
    
    state.filters = { ...state.filters, ...filters };
    fetchData();
  };

  const handleSearch = (params: Record<string, any>) => {
    searchParams.value = params;
    state.pagination.current = 1;
    fetchData();
  };

  const handleReset = () => {
    searchParams.value = {};
    state.pagination.current = 1;
    fetchData();
  };

  const handleRefresh = () => {
    fetchData();
  };

  const handleSelectChange = (keys: (string | number)[]) => {
    state.selectedRowKeys = keys;
  };

  const handlePageChange = (page: number, pageSize?: number) => {
    state.pagination.current = page;
    if (pageSize) {
      state.pagination.pageSize = pageSize;
    }
    fetchData();
  };

  const handleShowSizeChange = (current: number, size: number) => {
    state.pagination.current = current;
    state.pagination.pageSize = size;
    fetchData();
  };

  const getSelections = computed(() => {
    return state.dataSource.filter(item => 
      state.selectedRowKeys.includes(item.id || item.key)
    );
  });

  const clearSelection = () => {
    state.selectedRowKeys = [];
  };

  const setTotal = (total: number) => {
    state.pagination.total = total;
  };

  if (immediate) {
    fetchData();
  }

  watch(
    () => [state.pagination.current, state.pagination.pageSize],
    () => fetchData()
  );

  return {
    state,
    searchParams,
    fetchData,
    setColumns,
    handleTableChange,
    handleSearch,
    handleReset,
    handleRefresh,
    handleSelectChange,
    handlePageChange,
    handleShowSizeChange,
    getSelections,
    clearSelection,
    setTotal,
  };
}
