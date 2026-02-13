import { computed, ref, type Ref } from 'vue';

import type {
  GridColumn,
  GridExportOptions,
  GridFilter,
  GridPagination,
  GridSort,
} from './types';

export interface UseGridOptions<T extends Record<string, any>> {
  data: T[];
  columns: GridColumn<T>[];
  rowKey?: string | ((row: T) => string | number);
  defaultPageSize?: number;
  defaultSort?: GridSort[];
  serverSide?: boolean;
  onFetch?: (params: {
    page: number;
    pageSize: number;
    sorts: GridSort[];
    filters: GridFilter[];
  }) => Promise<{ data: T[]; total: number }>;
}

export interface UseGridReturn<T extends Record<string, any>> {
  data: Ref<T[]>;
  columns: Ref<GridColumn<T>[]>;
  sorts: Ref<GridSort[]>;
  filters: Ref<GridFilter[]>;
  pagination: Ref<GridPagination>;
  selectedRows: Ref<T[]>;
  selectedKeys: Ref<Array<string | number>>;
  expandedKeys: Ref<Array<string | number>>;
  loading: Ref<boolean>;

  // Computed
  displayData: Ref<T[]>;
  visibleColumns: Ref<GridColumn<T>[]>;
  totalPages: Ref<number>;

  // Methods
  setData: (newData: T[]) => void;
  addRow: (row: T) => void;
  removeRow: (key: string | number) => T | undefined;
  updateRow: (key: string | number, updates: Partial<T>) => void;
  findRow: (key: string | number) => T | undefined;
  setSort: (field: string, direction: 'asc' | 'desc' | null) => void;
  clearSorts: () => void;
  setFilter: (filter: GridFilter) => void;
  removeFilter: (field: string) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  selectRow: (key: string | number) => void;
  deselectRow: (key: string | number) => void;
  selectAll: () => void;
  deselectAll: () => void;
  toggleRowSelection: (key: string | number) => void;
  expandRow: (key: string | number) => void;
  collapseRow: (key: string | number) => void;
  toggleRowExpand: (key: string | number) => void;
  showColumn: (field: string) => void;
  hideColumn: (field: string) => void;
  reorderColumns: (fromIndex: number, toIndex: number) => void;
  refresh: () => Promise<void>;
  exportData: (options: GridExportOptions) => void;
}

export function useGrid<T extends Record<string, any>>(
  options: UseGridOptions<T>
): UseGridReturn<T> {
  const data = ref<T[]>(options.data) as Ref<T[]>;
  const columns = ref<GridColumn<T>[]>(options.columns) as Ref<GridColumn<T>[]>;
  const sorts = ref<GridSort[]>(options.defaultSort || []);
  const filters = ref<GridFilter[]>([]);
  const loading = ref(false);
  const selectedKeys = ref<Array<string | number>>([]);
  const expandedKeys = ref<Array<string | number>>([]);

  const pagination = ref<GridPagination>({
    page: 1,
    pageSize: options.defaultPageSize || 20,
    total: options.data.length,
    pageSizes: [10, 20, 50, 100],
  });

  const rowKey = options.rowKey || 'id';

  const getRowKey = (row: T): string | number => {
    if (typeof rowKey === 'function') {
      return rowKey(row);
    }
    return row[rowKey] as string | number;
  };

  // Visible columns
  const visibleColumns = computed(() =>
    columns.value.filter(col => col.visible !== false)
  );

  // Selected rows
  const selectedRows = computed(() => {
    const keySet = new Set(selectedKeys.value);
    return data.value.filter(row => keySet.has(getRowKey(row)));
  });

  // Total pages
  const totalPages = computed(() =>
    Math.ceil(pagination.value.total / pagination.value.pageSize)
  );

  // Apply filters locally
  const filteredData = computed(() => {
    if (options.serverSide || filters.value.length === 0) {
      return data.value;
    }

    return data.value.filter(row => {
      return filters.value.every(filter => {
        const value = row[filter.field];
        switch (filter.operator) {
          case 'equals':
            return value === filter.value;
          case 'notEquals':
            return value !== filter.value;
          case 'contains':
            return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'notContains':
            return !String(value).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'startsWith':
            return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase());
          case 'endsWith':
            return String(value).toLowerCase().endsWith(String(filter.value).toLowerCase());
          case 'gt':
            return value > filter.value;
          case 'gte':
            return value >= filter.value;
          case 'lt':
            return value < filter.value;
          case 'lte':
            return value <= filter.value;
          case 'between':
            return value >= filter.value[0] && value <= filter.value[1];
          case 'in':
            return Array.isArray(filter.value) && filter.value.includes(value);
          case 'notIn':
            return Array.isArray(filter.value) && !filter.value.includes(value);
          case 'isEmpty':
            return value === null || value === undefined || value === '';
          case 'isNotEmpty':
            return value !== null && value !== undefined && value !== '';
          default:
            return true;
        }
      });
    });
  });

  // Apply sorting locally
  const sortedData = computed(() => {
    if (options.serverSide || sorts.value.length === 0) {
      return filteredData.value;
    }

    return [...filteredData.value].sort((a, b) => {
      for (const sort of sorts.value) {
        const valueA = a[sort.field];
        const valueB = b[sort.field];

        let comparison = 0;
        if (valueA < valueB) comparison = -1;
        else if (valueA > valueB) comparison = 1;

        if (comparison !== 0) {
          return sort.direction === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  });

  // Apply pagination locally
  const displayData = computed(() => {
    if (options.serverSide) {
      return data.value;
    }

    const start = (pagination.value.page - 1) * pagination.value.pageSize;
    const end = start + pagination.value.pageSize;

    // Update total from filtered data
    pagination.value.total = sortedData.value.length;

    return sortedData.value.slice(start, end);
  });

  // Methods
  function setData(newData: T[]) {
    data.value = newData;
    pagination.value.total = newData.length;
  }

  function addRow(row: T) {
    data.value.push(row);
    pagination.value.total++;
  }

  function removeRow(key: string | number): T | undefined {
    const index = data.value.findIndex(row => getRowKey(row) === key);
    if (index !== -1) {
      const [removed] = data.value.splice(index, 1);
      pagination.value.total--;
      return removed;
    }
    return undefined;
  }

  function updateRow(key: string | number, updates: Partial<T>) {
    const row = findRow(key);
    if (row) {
      Object.assign(row, updates);
    }
  }

  function findRow(key: string | number): T | undefined {
    return data.value.find(row => getRowKey(row) === key);
  }

  function setSort(field: string, direction: 'asc' | 'desc' | null) {
    if (direction === null) {
      sorts.value = sorts.value.filter(s => s.field !== field);
    } else {
      const existing = sorts.value.find(s => s.field === field);
      if (existing) {
        existing.direction = direction;
      } else {
        sorts.value.push({ field, direction });
      }
    }
  }

  function clearSorts() {
    sorts.value = [];
  }

  function setFilter(filter: GridFilter) {
    const existing = filters.value.find(f => f.field === filter.field);
    if (existing) {
      Object.assign(existing, filter);
    } else {
      filters.value.push(filter);
    }
    pagination.value.page = 1; // Reset to first page
  }

  function removeFilter(field: string) {
    filters.value = filters.value.filter(f => f.field !== field);
    pagination.value.page = 1;
  }

  function clearFilters() {
    filters.value = [];
    pagination.value.page = 1;
  }

  function setPage(page: number) {
    pagination.value.page = Math.max(1, Math.min(page, totalPages.value));
  }

  function setPageSize(pageSize: number) {
    pagination.value.pageSize = pageSize;
    pagination.value.page = 1;
  }

  function selectRow(key: string | number) {
    if (!selectedKeys.value.includes(key)) {
      selectedKeys.value.push(key);
    }
  }

  function deselectRow(key: string | number) {
    selectedKeys.value = selectedKeys.value.filter(k => k !== key);
  }

  function selectAll() {
    selectedKeys.value = data.value.map(row => getRowKey(row));
  }

  function deselectAll() {
    selectedKeys.value = [];
  }

  function toggleRowSelection(key: string | number) {
    if (selectedKeys.value.includes(key)) {
      deselectRow(key);
    } else {
      selectRow(key);
    }
  }

  function expandRow(key: string | number) {
    if (!expandedKeys.value.includes(key)) {
      expandedKeys.value.push(key);
    }
  }

  function collapseRow(key: string | number) {
    expandedKeys.value = expandedKeys.value.filter(k => k !== key);
  }

  function toggleRowExpand(key: string | number) {
    if (expandedKeys.value.includes(key)) {
      collapseRow(key);
    } else {
      expandRow(key);
    }
  }

  function showColumn(field: string) {
    const column = columns.value.find(c => c.field === field);
    if (column) {
      column.visible = true;
    }
  }

  function hideColumn(field: string) {
    const column = columns.value.find(c => c.field === field);
    if (column) {
      column.visible = false;
    }
  }

  function reorderColumns(fromIndex: number, toIndex: number) {
    const column = columns.value.splice(fromIndex, 1)[0];
    if (column) {
      columns.value.splice(toIndex, 0, column);
    }
  }

  async function refresh() {
    if (options.serverSide && options.onFetch) {
      loading.value = true;
      try {
        const result = await options.onFetch({
          page: pagination.value.page,
          pageSize: pagination.value.pageSize,
          sorts: sorts.value,
          filters: filters.value,
        });
        data.value = result.data;
        pagination.value.total = result.total;
      } finally {
        loading.value = false;
      }
    }
  }

  function exportData(exportOptions: GridExportOptions) {
    const columnsToExport = exportOptions.columns
      ? columns.value.filter(c => exportOptions.columns!.includes(c.field))
      : visibleColumns.value;

    const exportRows = displayData.value.map(row => {
      const exportRow: Record<string, any> = {};
      for (const col of columnsToExport) {
        exportRow[col.field] = row[col.field];
      }
      return exportRow;
    });

    const filename = exportOptions.filename || `export-${Date.now()}`;

    switch (exportOptions.type) {
      case 'json': {
        const blob = new Blob([JSON.stringify(exportRows, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `${filename}.json`);
        break;
      }
      case 'csv': {
        const headers = columnsToExport.map(c => c.title).join(',');
        const rows = exportRows.map(row =>
          columnsToExport.map(c => `"${String(row[c.field] ?? '').replace(/"/g, '""')}"`).join(',')
        );
        const csv = exportOptions.includeHeader !== false ? [headers, ...rows].join('\n') : rows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        downloadBlob(blob, `${filename}.csv`);
        break;
      }
    }
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    data,
    columns,
    sorts,
    filters,
    pagination,
    selectedRows: selectedRows as Ref<T[]>,
    selectedKeys,
    expandedKeys,
    loading,
    displayData: displayData as Ref<T[]>,
    visibleColumns: visibleColumns as Ref<GridColumn<T>[]>,
    totalPages,
    setData,
    addRow,
    removeRow,
    updateRow,
    findRow,
    setSort,
    clearSorts,
    setFilter,
    removeFilter,
    clearFilters,
    setPage,
    setPageSize,
    selectRow,
    deselectRow,
    selectAll,
    deselectAll,
    toggleRowSelection,
    expandRow,
    collapseRow,
    toggleRowExpand,
    showColumn,
    hideColumn,
    reorderColumns,
    refresh,
    exportData,
  };
}
