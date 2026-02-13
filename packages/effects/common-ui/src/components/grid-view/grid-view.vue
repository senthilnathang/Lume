<script lang="ts" setup generic="T extends Record<string, any>">
import type { CSSProperties } from 'vue';

import { computed, ref, watch } from 'vue';

import type {
  GridCellClickEvent,
  GridColumn,
  GridFilter,
  GridPagination,
  GridRowClickEvent,
  GridSelection,
  GridSort,
} from './types';

interface Props {
  data: T[];
  columns: GridColumn<T>[];
  rowKey?: string | ((row: T) => string | number);
  loading?: boolean;
  height?: number | string;
  maxHeight?: number | string;
  stripe?: boolean;
  border?: boolean;
  size?: 'small' | 'medium' | 'large';
  showHeader?: boolean;
  highlightCurrentRow?: boolean;
  emptyText?: string;
  // Sorting
  sortable?: boolean;
  sorts?: GridSort[];
  multiSort?: boolean;
  // Pagination
  pagination?: GridPagination | false;
  // Selection
  selection?: GridSelection<T>;
  // Filtering
  filters?: GridFilter[];
  // Expandable rows
  expandable?: boolean;
  expandedRowKeys?: Array<string | number>;
}

const props = withDefaults(defineProps<Props>(), {
  rowKey: 'id',
  loading: false,
  stripe: true,
  border: false,
  size: 'medium',
  showHeader: true,
  highlightCurrentRow: false,
  emptyText: 'No data',
  sortable: false,
  multiSort: false,
  expandable: false,
});

const emit = defineEmits<{
  (e: 'row-click', payload: GridRowClickEvent<T>): void;
  (e: 'cell-click', payload: GridCellClickEvent<T>): void;
  (e: 'sort-change', sorts: GridSort[]): void;
  (e: 'filter-change', filters: GridFilter[]): void;
  (e: 'page-change', payload: { page: number; pageSize: number }): void;
  (e: 'selection-change', payload: { selectedRows: T[]; selectedKeys: Array<string | number> }): void;
  (e: 'expand-change', payload: { row: T; expanded: boolean; expandedRows: T[] }): void;
}>();

defineSlots<{
  cell?: (props: { row: T; column: GridColumn<T>; value: any; rowIndex: number; columnIndex: number }) => any;
  header?: (props: { column: GridColumn<T>; columnIndex: number }) => any;
  expand?: (props: { row: T; rowIndex: number }) => any;
  empty?: () => any;
  footer?: () => any;
  loading?: () => any;
}>();

// Internal state
const currentRow = ref<T | null>(null);
const localSorts = ref<GridSort[]>(props.sorts || []);
const selectedKeys = ref<Set<string | number>>(
  new Set(props.selection?.selectedKeys || [])
);
const expandedKeys = ref<Set<string | number>>(
  new Set(props.expandedRowKeys || [])
);

// Watch for external changes
watch(() => props.sorts, (newSorts) => {
  if (newSorts) localSorts.value = [...newSorts];
}, { deep: true });

watch(() => props.selection?.selectedKeys, (newKeys) => {
  if (newKeys) selectedKeys.value = new Set(newKeys);
}, { deep: true });

watch(() => props.expandedRowKeys, (newKeys) => {
  if (newKeys) expandedKeys.value = new Set(newKeys);
}, { deep: true });

// Computed properties
const visibleColumns = computed(() =>
  props.columns.filter(col => col.visible !== false)
);

const getRowKey = (row: T, index: number): string | number => {
  if (typeof props.rowKey === 'function') {
    return props.rowKey(row);
  }
  return (row as any)[props.rowKey] ?? index;
};

const containerStyle = computed<CSSProperties>(() => ({
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
  maxHeight: typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight,
}));

const sizeClasses = computed(() => ({
  'grid-view--small': props.size === 'small',
  'grid-view--medium': props.size === 'medium',
  'grid-view--large': props.size === 'large',
}));

// Methods
function getColumnStyle(column: GridColumn<T>): CSSProperties {
  const style: CSSProperties = {};
  if (column.width) {
    style.width = typeof column.width === 'number' ? `${column.width}px` : column.width;
  }
  if (column.minWidth) {
    style.minWidth = `${column.minWidth}px`;
  }
  if (column.maxWidth) {
    style.maxWidth = `${column.maxWidth}px`;
  }
  return style;
}

function getCellValue(row: T, column: GridColumn<T>): any {
  const value = (row as any)[column.field];
  if (column.formatter) {
    return column.formatter(value, row, column);
  }
  return value;
}

function getSortState(field: string): 'asc' | 'desc' | null {
  const sort = localSorts.value.find(s => s.field === field);
  return sort?.direction || null;
}

function handleSort(column: GridColumn<T>) {
  if (!props.sortable || !column.sortable) return;

  const existingIndex = localSorts.value.findIndex(s => s.field === column.field);
  const existing = existingIndex >= 0 ? localSorts.value[existingIndex] : null;

  let newSorts: GridSort[];

  if (!existing) {
    // Add new sort
    const newSort: GridSort = { field: column.field, direction: 'asc' };
    newSorts = props.multiSort ? [...localSorts.value, newSort] : [newSort];
  } else if (existing.direction === 'asc') {
    // Toggle to desc
    const updated = { ...existing, direction: 'desc' as const };
    newSorts = props.multiSort
      ? [...localSorts.value.slice(0, existingIndex), updated, ...localSorts.value.slice(existingIndex + 1)]
      : [updated];
  } else {
    // Remove sort
    newSorts = props.multiSort
      ? localSorts.value.filter(s => s.field !== column.field)
      : [];
  }

  localSorts.value = newSorts;
  emit('sort-change', newSorts);
}

function handleRowClick(row: T, rowIndex: number, event: MouseEvent) {
  if (props.highlightCurrentRow) {
    currentRow.value = row;
  }
  emit('row-click', { row, rowIndex, event });
}

function handleCellClick(row: T, rowIndex: number, column: GridColumn<T>, columnIndex: number, event: MouseEvent) {
  const value = getCellValue(row, column);
  emit('cell-click', { row, rowIndex, column, columnIndex, value, event });
}

function isRowSelected(row: T, index: number): boolean {
  const key = getRowKey(row, index);
  return selectedKeys.value.has(key);
}

function toggleRowSelection(row: T, index: number) {
  const key = getRowKey(row, index);
  const newSelected = new Set(selectedKeys.value);

  if (props.selection?.type === 'radio') {
    newSelected.clear();
    newSelected.add(key);
  } else {
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
  }

  selectedKeys.value = newSelected;

  const selectedRows = props.data.filter((r, i) => newSelected.has(getRowKey(r, i)));
  emit('selection-change', { selectedRows, selectedKeys: Array.from(newSelected) });
}

function toggleAllSelection() {
  const allKeys = props.data.map((row, index) => getRowKey(row, index));
  const allSelected = allKeys.every(key => selectedKeys.value.has(key));

  if (allSelected) {
    selectedKeys.value = new Set();
  } else {
    selectedKeys.value = new Set(allKeys);
  }

  const selectedRows = allSelected ? [] : [...props.data];
  emit('selection-change', { selectedRows, selectedKeys: Array.from(selectedKeys.value) });
}

function isAllSelected(): boolean {
  if (props.data.length === 0) return false;
  return props.data.every((row, index) => selectedKeys.value.has(getRowKey(row, index)));
}

function isSomeSelected(): boolean {
  if (props.data.length === 0) return false;
  const selectedCount = props.data.filter((row, index) =>
    selectedKeys.value.has(getRowKey(row, index))
  ).length;
  return selectedCount > 0 && selectedCount < props.data.length;
}

function isRowExpanded(row: T, index: number): boolean {
  const key = getRowKey(row, index);
  return expandedKeys.value.has(key);
}

function toggleRowExpand(row: T, index: number) {
  const key = getRowKey(row, index);
  const newExpanded = new Set(expandedKeys.value);

  if (newExpanded.has(key)) {
    newExpanded.delete(key);
  } else {
    newExpanded.add(key);
  }

  expandedKeys.value = newExpanded;

  const expandedRows = props.data.filter((r, i) => newExpanded.has(getRowKey(r, i)));
  emit('expand-change', { row, expanded: newExpanded.has(key), expandedRows });
}

function handlePageChange(page: number) {
  if (props.pagination) {
    emit('page-change', { page, pageSize: props.pagination.pageSize });
  }
}

function handlePageSizeChange(pageSize: number) {
  if (props.pagination) {
    emit('page-change', { page: 1, pageSize });
  }
}
</script>

<template>
  <div
    class="grid-view"
    :class="[
      sizeClasses,
      {
        'grid-view--stripe': stripe,
        'grid-view--border': border,
        'grid-view--loading': loading,
      },
    ]"
    :style="containerStyle"
  >
    <!-- Loading overlay -->
    <div v-if="loading" class="grid-view-loading">
      <slot name="loading">
        <div class="grid-view-spinner"></div>
      </slot>
    </div>

    <!-- Table -->
    <div class="grid-view-table-wrapper">
      <table class="grid-view-table">
        <!-- Header -->
        <thead v-if="showHeader" class="grid-view-header">
          <tr>
            <!-- Selection column -->
            <th v-if="selection && selection.type !== 'none'" class="grid-view-cell grid-view-cell--selection">
              <input
                v-if="selection.type === 'checkbox'"
                type="checkbox"
                :checked="isAllSelected()"
                :indeterminate="isSomeSelected()"
                class="grid-view-checkbox"
                @change="toggleAllSelection"
              />
            </th>

            <!-- Expand column -->
            <th v-if="expandable" class="grid-view-cell grid-view-cell--expand"></th>

            <!-- Data columns -->
            <th
              v-for="(column, columnIndex) in visibleColumns"
              :key="column.field"
              class="grid-view-cell grid-view-header-cell"
              :class="[
                column.headerClassName,
                {
                  'grid-view-cell--sortable': sortable && column.sortable,
                  'grid-view-cell--sorted': getSortState(column.field),
                },
                `grid-view-cell--${column.align || 'left'}`,
              ]"
              :style="getColumnStyle(column)"
              @click="handleSort(column)"
            >
              <slot name="header" :column="column" :column-index="columnIndex">
                <div class="grid-view-header-content">
                  <span>{{ column.title }}</span>
                  <span v-if="sortable && column.sortable" class="grid-view-sort-icons">
                    <span
                      class="grid-view-sort-icon grid-view-sort-icon--asc"
                      :class="{ 'grid-view-sort-icon--active': getSortState(column.field) === 'asc' }"
                    >▲</span>
                    <span
                      class="grid-view-sort-icon grid-view-sort-icon--desc"
                      :class="{ 'grid-view-sort-icon--active': getSortState(column.field) === 'desc' }"
                    >▼</span>
                  </span>
                </div>
              </slot>
            </th>
          </tr>
        </thead>

        <!-- Body -->
        <tbody class="grid-view-body">
          <template v-if="data.length > 0">
            <template v-for="(row, rowIndex) in data" :key="getRowKey(row, rowIndex)">
              <tr
                class="grid-view-row"
                :class="{
                  'grid-view-row--current': highlightCurrentRow && currentRow === row,
                  'grid-view-row--selected': selection && isRowSelected(row, rowIndex),
                  'grid-view-row--striped': stripe && rowIndex % 2 === 1,
                }"
                @click="handleRowClick(row, rowIndex, $event)"
              >
                <!-- Selection cell -->
                <td v-if="selection && selection.type !== 'none'" class="grid-view-cell grid-view-cell--selection">
                  <input
                    :type="selection.type === 'radio' ? 'radio' : 'checkbox'"
                    :checked="isRowSelected(row, rowIndex)"
                    class="grid-view-checkbox"
                    @click.stop
                    @change="toggleRowSelection(row, rowIndex)"
                  />
                </td>

                <!-- Expand cell -->
                <td v-if="expandable" class="grid-view-cell grid-view-cell--expand">
                  <button
                    class="grid-view-expand-btn"
                    :class="{ 'grid-view-expand-btn--expanded': isRowExpanded(row, rowIndex) }"
                    @click.stop="toggleRowExpand(row, rowIndex)"
                  >
                    ▶
                  </button>
                </td>

                <!-- Data cells -->
                <td
                  v-for="(column, columnIndex) in visibleColumns"
                  :key="column.field"
                  class="grid-view-cell"
                  :class="[
                    column.className,
                    typeof column.cellClassName === 'function'
                      ? column.cellClassName(row)
                      : column.cellClassName,
                    `grid-view-cell--${column.align || 'left'}`,
                  ]"
                  :style="getColumnStyle(column)"
                  @click="handleCellClick(row, rowIndex, column, columnIndex, $event)"
                >
                  <slot
                    name="cell"
                    :row="row"
                    :column="column"
                    :value="getCellValue(row, column)"
                    :row-index="rowIndex"
                    :column-index="columnIndex"
                  >
                    {{ getCellValue(row, column) }}
                  </slot>
                </td>
              </tr>

              <!-- Expanded content -->
              <tr v-if="expandable && isRowExpanded(row, rowIndex)" class="grid-view-row--expanded">
                <td :colspan="visibleColumns.length + (selection ? 1 : 0) + 1" class="grid-view-expand-content">
                  <slot name="expand" :row="row" :row-index="rowIndex"></slot>
                </td>
              </tr>
            </template>
          </template>

          <!-- Empty state -->
          <tr v-else class="grid-view-row--empty">
            <td :colspan="visibleColumns.length + (selection ? 1 : 0) + (expandable ? 1 : 0)" class="grid-view-empty">
              <slot name="empty">
                <span class="grid-view-empty-text">{{ emptyText }}</span>
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer / Pagination -->
    <div v-if="pagination || $slots.footer" class="grid-view-footer">
      <slot name="footer">
        <div v-if="pagination" class="grid-view-pagination">
          <span class="grid-view-pagination-info">
            Total: {{ pagination.total }} items
          </span>

          <div class="grid-view-pagination-controls">
            <button
              class="grid-view-pagination-btn"
              :disabled="pagination.page <= 1"
              @click="handlePageChange(pagination.page - 1)"
            >
              ←
            </button>

            <span class="grid-view-pagination-current">
              Page {{ pagination.page }} of {{ Math.ceil(pagination.total / pagination.pageSize) || 1 }}
            </span>

            <button
              class="grid-view-pagination-btn"
              :disabled="pagination.page >= Math.ceil(pagination.total / pagination.pageSize)"
              @click="handlePageChange(pagination.page + 1)"
            >
              →
            </button>
          </div>

          <select
            v-if="pagination.pageSizes && pagination.pageSizes.length > 0"
            class="grid-view-pagination-size"
            :value="pagination.pageSize"
            @change="handlePageSizeChange(Number(($event.target as HTMLSelectElement).value))"
          >
            <option v-for="size in pagination.pageSizes" :key="size" :value="size">
              {{ size }} / page
            </option>
          </select>
        </div>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.grid-view {
  position: relative;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.grid-view--border {
  border: 1px solid #e8e8e8;
}

.grid-view--loading {
  pointer-events: none;
}

.grid-view-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 10;
}

.grid-view-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.grid-view-table-wrapper {
  flex: 1;
  overflow: auto;
}

.grid-view-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

/* Header */
.grid-view-header {
  position: sticky;
  top: 0;
  z-index: 5;
  background-color: #fafafa;
}

.grid-view-header-cell {
  font-weight: 600;
  color: #333;
  user-select: none;
}

.grid-view-cell--sortable {
  cursor: pointer;
}

.grid-view-cell--sortable:hover {
  background-color: #f0f0f0;
}

.grid-view-header-content {
  display: flex;
  align-items: center;
  gap: 4px;
}

.grid-view-sort-icons {
  display: flex;
  flex-direction: column;
  font-size: 8px;
  line-height: 1;
  color: #ccc;
}

.grid-view-sort-icon--active {
  color: #1890ff;
}

/* Cells */
.grid-view-cell {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.grid-view-cell--left { text-align: left; }
.grid-view-cell--center { text-align: center; }
.grid-view-cell--right { text-align: right; }

.grid-view-cell--selection,
.grid-view-cell--expand {
  width: 48px;
  text-align: center;
  padding: 12px 8px;
}

/* Rows */
.grid-view-row {
  transition: background-color 0.2s;
}

.grid-view-row:hover {
  background-color: #f5f5f5;
}

.grid-view-row--current {
  background-color: #e6f7ff;
}

.grid-view-row--selected {
  background-color: #e6f7ff;
}

.grid-view-row--striped {
  background-color: #fafafa;
}

.grid-view-row--striped:hover {
  background-color: #f0f0f0;
}

/* Checkbox */
.grid-view-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* Expand */
.grid-view-expand-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 10px;
  color: #666;
  transition: transform 0.2s;
}

.grid-view-expand-btn--expanded {
  transform: rotate(90deg);
}

.grid-view-expand-content {
  padding: 16px;
  background-color: #fafafa;
}

/* Empty state */
.grid-view-empty {
  padding: 48px 16px;
  text-align: center;
}

.grid-view-empty-text {
  color: #999;
  font-size: 14px;
}

/* Footer / Pagination */
.grid-view-footer {
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
  background-color: #fafafa;
}

.grid-view-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.grid-view-pagination-info {
  font-size: 13px;
  color: #666;
}

.grid-view-pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.grid-view-pagination-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #d9d9d9;
  background-color: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.grid-view-pagination-btn:hover:not(:disabled) {
  border-color: #1890ff;
  color: #1890ff;
}

.grid-view-pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.grid-view-pagination-current {
  font-size: 13px;
  color: #333;
}

.grid-view-pagination-size {
  padding: 4px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
}

/* Size variants */
.grid-view--small .grid-view-cell {
  padding: 8px 12px;
  font-size: 13px;
}

.grid-view--large .grid-view-cell {
  padding: 16px 20px;
  font-size: 15px;
}

/* Dark mode */
.dark .grid-view {
  background-color: #1f1f1f;
}

.dark .grid-view--border {
  border-color: #333;
}

.dark .grid-view-loading {
  background-color: rgba(31, 31, 31, 0.8);
}

.dark .grid-view-header {
  background-color: #2d2d2d;
}

.dark .grid-view-header-cell {
  color: #fff;
}

.dark .grid-view-cell--sortable:hover {
  background-color: #333;
}

.dark .grid-view-cell {
  border-bottom-color: #333;
  color: #fff;
}

.dark .grid-view-row:hover {
  background-color: #2d2d2d;
}

.dark .grid-view-row--current,
.dark .grid-view-row--selected {
  background-color: #111d2c;
}

.dark .grid-view-row--striped {
  background-color: #262626;
}

.dark .grid-view-row--striped:hover {
  background-color: #333;
}

.dark .grid-view-expand-btn {
  color: #ccc;
}

.dark .grid-view-expand-content {
  background-color: #262626;
}

.dark .grid-view-footer {
  border-top-color: #333;
  background-color: #262626;
}

.dark .grid-view-pagination-info,
.dark .grid-view-pagination-current {
  color: #ccc;
}

.dark .grid-view-pagination-btn {
  border-color: #444;
  background-color: #2d2d2d;
  color: #fff;
}

.dark .grid-view-pagination-size {
  border-color: #444;
  background-color: #2d2d2d;
  color: #fff;
}
</style>
