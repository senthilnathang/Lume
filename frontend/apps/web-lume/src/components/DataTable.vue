<template>
  <div class="data-table-container">
    <div class="table-header">
      <div class="table-title">
        <h2>{{ title }}</h2>
        <span class="record-count">{{ total }} records</span>
      </div>
      <div class="table-actions">
        <div class="search-box">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            :placeholder="searchPlaceholder"
            v-model="searchQuery"
            @input="handleSearch"
          />
        </div>
        <button v-if="showAddButton" @click="$emit('add')" class="add-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add {{ singularName }}
        </button>
      </div>
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              :class="{ sortable: column.sortable }"
              :style="{ width: column.width }"
              @click="column.sortable && handleSort(column.key)"
            >
              <div class="th-content">
                <span>{{ column.label }}</span>
                <svg v-if="column.sortable" class="sort-icon" :class="{ active: sortKey === column.key }" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12l7 7 7-7M5 5l7 7 7-7"/>
                </svg>
              </div>
            </th>
            <th v-if="actions.length" class="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="columns.length + (actions.length ? 1 : 0)" class="loading-cell">
              <div class="loading-spinner"></div>
              Loading...
            </td>
          </tr>
          <tr v-else-if="!data.length">
            <td :colspan="columns.length + (actions.length ? 1 : 0)" class="empty-cell">
              <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                  <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
                <p>No {{ pluralName }} found</p>
                <button v-if="showAddButton" @click="$emit('add')" class="add-link">Add the first {{ singularName }}</button>
              </div>
            </td>
          </tr>
          <tr
            v-for="row in data"
            :key="row.id"
            :class="{ selectable: selectable }"
            @click="selectable && handleSelect(row)"
          >
            <td v-for="column in columns" :key="column.key">
              <component
                :is="getCellComponent(column)"
                :value="row[column.key]"
                :row="row"
                :column="column"
              />
            </td>
            <td v-if="actions.length" class="actions-cell">
              <div class="action-buttons">
                <button
                  v-for="action in actions"
                  :key="action.name"
                  :class="['action-btn', action.class]"
                  :title="action.label"
                  @click.stop="handleAction(action.name, row)"
                >
                  <component :is="getActionIcon(action.name)" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="pagination && total > pageSize" class="pagination">
      <div class="pagination-info">
        Showing {{ (page - 1) * pageSize + 1 }} to {{ Math.min(page * pageSize, total) }} of {{ total }} entries
      </div>
      <div class="pagination-controls">
        <button
          class="page-btn"
          :disabled="page === 1"
          @click="handlePageChange(page - 1)"
        >
          Previous
        </button>
        <button
          v-for="p in displayedPages"
          :key="p"
          :class="['page-btn', { active: p === page }]"
          @click="handlePageChange(p)"
        >
          {{ p }}
        </button>
        <button
          class="page-btn"
          :disabled="page === totalPages"
          @click="handlePageChange(page + 1)"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, h } from 'vue';
import TextCell from './cells/TextCell.vue';
import DateCell from './cells/DateCell.vue';
import StatusCell from './cells/StatusCell.vue';
import ActionsCell from './cells/ActionsCell.vue';

const props = defineProps({
  title: { type: String, default: 'Data Table' },
  singularName: { type: String, default: 'Item' },
  pluralName: { type: String, default: 'Items' },
  columns: { type: Array, required: true },
  data: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  pagination: { type: Boolean, default: true },
  pageSize: { type: Number, default: 20 },
  total: { type: Number, default: 0 },
  actions: { type: Array, default: () => ['view', 'edit', 'delete'] },
  selectable: { type: Boolean, default: false },
  showAddButton: { type: Boolean, default: true },
  searchPlaceholder: { type: String, default: 'Search...' }
});

const emit = defineEmits(['search', 'sort', 'page', 'select', 'action', 'add']);

const searchQuery = ref('');
const page = ref(1);
const sortKey = ref('');
const sortOrder = ref('asc');
const selectedRows = ref([]);

const totalPages = computed(() => Math.ceil(props.total / props.pageSize));

const displayedPages = computed(() => {
  const pages = [];
  const current = page.value;
  const total = totalPages.value;
  
  if (total <= 5) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push('...');
    
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    
    if (current < total - 2) pages.push('...');
    pages.push(total);
  }
  
  return pages;
});

const getCellComponent = (column) => {
  const components = {
    text: TextCell,
    date: DateCell,
    datetime: DateCell,
    status: StatusCell,
    actions: ActionsCell
  };
  return components[column.type || 'text'] || TextCell;
};

const getActionIcon = (action) => {
  const icons = {
    view: () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
      h('path', { d: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' }),
      h('circle', { cx: '12', cy: '12', r: '3' })
    ]),
    edit: () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
      h('path', { d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' }),
      h('path', { d: 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' })
    ]),
    delete: () => h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
      h('polyline', { points: '3 6 5 6 21 6' }),
      h('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' })
    ])
  };
  return icons[action] || icons.view;
};

const handleSearch = () => {
  page.value = 1;
  emit('search', searchQuery.value);
};

const handleSort = (key) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
  emit('sort', { key: sortKey.value, order: sortOrder.value });
};

const handlePageChange = (newPage) => {
  page.value = newPage;
  emit('page', newPage);
};

const handleSelect = (row) => {
  const index = selectedRows.value.findIndex(r => r.id === row.id);
  if (index > -1) {
    selectedRows.value.splice(index, 1);
  } else {
    selectedRows.value.push(row);
  }
  emit('select', selectedRows.value);
};

const handleAction = (action, row) => {
  emit('action', action, row);
};
</script>

<style scoped>
.data-table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.table-title h2 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

.record-count {
  font-size: 13px;
  color: #9ca3af;
  margin-top: 2px;
}

.table-actions {
  display: flex;
  gap: 12px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.search-box input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
  width: 200px;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.add-btn:hover {
  background: #4338ca;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  user-select: none;
}

.data-table th.sortable {
  cursor: pointer;
}

.data-table th.sortable:hover {
  background: #f3f4f6;
}

.th-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sort-icon {
  color: #d1d5db;
}

.sort-icon.active {
  color: #4f46e5;
}

.data-table td {
  padding: 14px 16px;
  font-size: 14px;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
}

.data-table tr:hover {
  background: #f9fafb;
}

.data-table tr.selectable {
  cursor: pointer;
}

.data-table tr.selectable:hover {
  background: #f0f9ff;
}

.loading-cell,
.empty-cell {
  text-align: center;
  padding: 48px !important;
  color: #9ca3af;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e7eb;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state svg {
  color: #d1d5db;
  margin-bottom: 12px;
}

.empty-state p {
  margin: 0 0 12px;
  color: #6b7280;
}

.add-link {
  background: none;
  border: none;
  color: #4f46e5;
  font-size: 14px;
  cursor: pointer;
}

.add-link:hover {
  text-decoration: underline;
}

.actions-col {
  width: 100px;
}

.actions-cell {
  padding: 8px 16px !important;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f3f4f6;
}

.action-btn.view:hover {
  color: #3b82f6;
  border-color: #3b82f6;
}

.action-btn.edit:hover {
  color: #f59e0b;
  border-color: #f59e0b;
}

.action-btn.delete:hover {
  color: #ef4444;
  border-color: #ef4444;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
}

.pagination-info {
  font-size: 14px;
  color: #6b7280;
}

.pagination-controls {
  display: flex;
  gap: 4px;
}

.page-btn {
  padding: 6px 12px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #f3f4f6;
}

.page-btn.active {
  background: #4f46e5;
  border-color: #4f46e5;
  color: white;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
