<template>
  <div class="lume-data-table">
    <div class="lume-table-header" v-if="$slots.header || title">
      <slot name="header">
        <h3 class="table-title">{{ title }}</h3>
      </slot>
      <div class="table-actions">
        <slot name="actions"></slot>
      </div>
    </div>

    <div class="lume-table-wrapper" :class="{ loading: loading }">
      <div v-if="loading" class="lume-table-loading">
        <div class="loading-spinner"></div>
      </div>

      <table class="lume-table">
        <thead>
          <tr>
            <th v-if="rowSelection" class="lume-col-checkbox">
              <input
                type="checkbox"
                :checked="allRowsSelected"
                :indeterminate="someRowsSelected"
                @change="handleSelectAll"
              />
            </th>
            <th
              v-for="column in columns"
              :key="column.key"
              :class="getColumnClass(column)"
              :style="getColumnStyle(column)"
            >
              <template v-if="column.sorter">
                <span class="sorter-wrapper" @click="handleSort(column)">
                  {{ column.title }}
                  <span v-if="sortField === column.key" class="sorter-icon">
                    <svg v-if="sortOrder === 'ascend'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </span>
              </template>
              <template v-else>
                {{ column.title }}
              </template>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="dataSource.length === 0 && !loading">
            <td :colspan="effectiveColumnCount" class="lume-empty-row">
              <slot name="empty">
                <div class="lume-empty">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <p>No data available</p>
                </div>
              </slot>
            </td>
          </tr>
          <tr
            v-for="(record, index) in dataSource"
            :key="record.key || record.id || index"
            :class="{ selected: isRowSelected(record), hoverable: hoverable }"
            @click="handleRowClick(record, index)"
          >
            <td v-if="rowSelection" class="lume-col-checkbox">
              <input
                type="checkbox"
                :checked="isRowSelected(record)"
                @change="handleSelect(record)"
                @click.stop
              />
            </td>
            <td
              v-for="column in columns"
              :key="column.key"
              :class="getColumnClass(column)"
              :style="getColumnStyle(column)"
            >
              <template v-if="column.render">
                <component :is="column.render(record[column.dataIndex || column.key], record, index)" />
              </template>
              <template v-else>
                {{ record[column.dataIndex || column.key] }}
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="pagination && pagination.total > 0" class="lume-table-footer">
      <slot name="footer">
        <Pagination
          :current="pagination.current"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          :show-size-changer="pagination.showSizeChanger"
          :show-quick-jumper="pagination.showQuickJumper"
          :page-size-options="pagination.pageSizeOptions"
          @change="handlePageChange"
          @show-size-change="handleShowSizeChange"
        />
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Pagination from './Pagination.vue';

export interface TableColumn {
  key: string;
  title: string;
  dataIndex?: string;
  width?: number | string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
  sorter?: boolean;
  className?: string;
  render?: (value: any, record: any, index: number) => any;
}

export interface TablePagination {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger: boolean;
  showQuickJumper: boolean;
  pageSizeOptions: string[];
  sortField?: string | null;
  sortOrder?: 'ascend' | 'descend' | null;
}

export interface RowSelection {
  selectedRowKeys: (string | number)[];
  onChange: (keys: (string | number)[]) => void;
  onSelect?: (record: any, selected: boolean) => void;
}

const props = withDefaults(defineProps<{
  dataSource: any[];
  columns: TableColumn[];
  title?: string;
  loading?: boolean;
  rowSelection?: RowSelection;
  pagination?: TablePagination;
  hoverable?: boolean;
}>(), {
  loading: false,
  hoverable: true,
});

const emit = defineEmits<{
  'change': [paginationInfo: any, filters: any, sorter: any];
  'row-click': [record: any, index: number];
  'select': [record: any, selected: boolean];
  'select-all': [selected: boolean, selectedRows: any[]];
  'page-change': [page: number, pageSize: number];
  'show-size-change': [current: number, size: number];
}>();

const sortField = computed(() => props.pagination?.sortField || null);
const sortOrder = computed(() => props.pagination?.sortOrder || null);

const effectiveColumnCount = computed(() => {
  let count = props.columns.length;
  if (props.rowSelection) count += 1;
  return count;
});

const allRowsSelected = computed(() => {
  if (!props.rowSelection) return false;
  return props.dataSource.length > 0 && 
    props.dataSource.every(record => 
      props.rowSelection!.selectedRowKeys.includes(record.id || record.key)
    );
});

const someRowsSelected = computed(() => {
  if (!props.rowSelection) return false;
  const selectedCount = props.dataSource.filter(record =>
    props.rowSelection!.selectedRowKeys.includes(record.id || record.key)
  ).length;
  return selectedCount > 0 && selectedCount < props.dataSource.length;
});

const isRowSelected = (record: any): boolean => {
  if (!props.rowSelection) return false;
  const key = record.id || record.key;
  return props.rowSelection.selectedRowKeys.includes(key);
};

const getColumnClass = (column: TableColumn): string => {
  const classes = [];
  if (column.align) classes.push(`lume-col-${column.align}`);
  if (column.fixed) classes.push(`lume-col-fixed-${column.fixed}`);
  if (column.className) classes.push(column.className);
  return classes.join(' ');
};

const getColumnStyle = (column: TableColumn): Record<string, string> => {
  const style: Record<string, string> = {};
  if (column.width) {
    style.width = typeof column.width === 'number' ? `${column.width}px` : column.width;
  }
  if (column.minWidth) {
    style.minWidth = `${column.minWidth}px`;
  }
  return style;
};

const handleSort = (column: TableColumn) => {
  let order: 'ascend' | 'descend' | null = null;
  if (sortField.value !== column.key) {
    order = 'ascend';
  } else if (sortOrder.value === 'ascend') {
    order = 'descend';
  } else {
    order = null;
  }
  
  emit('change', { ...props.pagination, sortField: column.key, sortOrder: order }, {}, { field: column.key, order });
};

const handleRowClick = (record: any, index: number) => {
  emit('row-click', record, index);
};

const handleSelect = (record: any) => {
  const key = record.id || record.key;
  const selected = !isRowSelected(record);
  
  let selectedKeys = [...props.rowSelection!.selectedRowKeys];
  if (selected) {
    selectedKeys.push(key);
  } else {
    selectedKeys = selectedKeys.filter(k => k !== key);
  }
  
  props.rowSelection!.onChange(selectedKeys);
  if (props.rowSelection!.onSelect) {
    props.rowSelection!.onSelect(record, selected);
  }
  emit('select', record, selected);
};

const handleSelectAll = () => {
  const selected = !allRowsSelected.value;
  if (selected) {
    const allKeys = props.dataSource.map(record => record.id || record.key);
    props.rowSelection!.onChange(allKeys);
    emit('select-all', true, [...props.dataSource]);
  } else {
    props.rowSelection!.onChange([]);
    emit('select-all', false, []);
  }
};

const handlePageChange = (page: number, pageSize: number) => {
  emit('page-change', page, pageSize);
  emit('change', { ...props.pagination, current: page, pageSize }, {}, {});
};

const handleShowSizeChange = (current: number, size: number) => {
  emit('show-size-change', current, size);
  emit('change', { ...props.pagination, current, pageSize: size }, {}, {});
};
</script>

<style scoped>
.lume-data-table {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.lume-table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lume-table-wrapper {
  position: relative;
  overflow-x: auto;
}

.lume-table-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.lume-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.lume-table thead {
  background: #f9fafb;
}

.lume-table th {
  padding: 14px 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
  user-select: none;
}

.lume-table td {
  padding: 14px 16px;
  color: #111827;
  border-bottom: 1px solid #e5e7eb;
}

.lume-table tbody tr {
  transition: background 0.15s;
}

.lume-table tbody tr.hoverable:hover {
  background: #f9fafb;
}

.lume-table tbody tr.selected {
  background: #eef2ff;
}

.lume-col-checkbox {
  width: 48px;
  text-align: center;
}

.lume-col-center {
  text-align: center;
}

.lume-col-right {
  text-align: right;
}

.lume-col-fixed-left {
  position: sticky;
  left: 0;
  background: inherit;
  z-index: 1;
}

.lume-col-fixed-right {
  position: sticky;
  right: 0;
  background: inherit;
  z-index: 1;
}

.sorter-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.sorter-icon {
  color: #4f46e5;
}

.lume-empty-row {
  text-align: center;
  padding: 48px 16px;
}

.lume-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #9ca3af;
}

.lume-empty svg {
  color: #d1d5db;
}

.lume-empty p {
  margin: 0;
  font-size: 14px;
}

.lume-table-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
</style>
