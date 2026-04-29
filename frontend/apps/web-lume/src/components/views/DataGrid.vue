<template>
  <div class="datagrid">
    <div class="datagrid-toolbar">
      <button @click="addRow" class="btn btn-primary">+ Add Row</button>
      <button @click="deleteSelected" class="btn btn-danger" :disabled="selectedRows.size === 0">
        Delete Selected
      </button>
    </div>
    <div class="datagrid-container">
      <table class="datagrid-table">
        <thead>
          <tr>
            <th class="checkbox-col">
              <input
                type="checkbox"
                @change="toggleSelectAll"
                :checked="selectedRows.size === rows.length && rows.length > 0"
              />
            </th>
            <th v-for="col in columns" :key="col">{{ col }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td class="checkbox-col">
              <input
                type="checkbox"
                :checked="selectedRows.has(row.id)"
                @change="toggleSelect(row.id)"
              />
            </td>
            <td
              v-for="col in columns"
              :key="`${row.id}-${col}`"
              :class="{ 'editing': editingCell === `${row.id}-${col}` }"
              @click="startEdit(row, col)"
              @dblclick="startEdit(row, col)"
            >
              <div v-if="editingCell !== `${row.id}-${col}`" class="cell-value">
                {{ row[col] }}
              </div>
              <input
                v-else
                v-model="editValues[col]"
                type="text"
                class="cell-input"
                @blur="saveCell(row, col)"
                @keydown.enter="saveCell(row, col)"
                @keydown.escape="cancelEdit"
                autofocus
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  viewDefinition: any;
  entityId: number;
}>();

const emit = defineEmits<{
  'record-updated': [record: any];
  'record-created': [record: any];
}>();

const columns = ['name', 'status', 'value'];
const rows = ref([
  { id: 1, name: 'Item 1', status: 'Active', value: 1000 },
  { id: 2, name: 'Item 2', status: 'Inactive', value: 2000 },
  { id: 3, name: 'Item 3', status: 'Active', value: 3000 },
]);

const selectedRows = ref(new Set<number>());
const editingCell = ref<string | null>(null);
const editValues = ref<Record<string, any>>({});
let originalValue: any;

const startEdit = (row: any, col: string) => {
  const cellKey = `${row.id}-${col}`;
  editingCell.value = cellKey;
  originalValue = row[col];
  editValues.value[col] = row[col];
};

const saveCell = (row: any, col: string) => {
  row[col] = editValues.value[col];
  editingCell.value = null;
  emit('record-updated', row);
};

const cancelEdit = () => {
  editingCell.value = null;
};

const toggleSelect = (rowId: number) => {
  if (selectedRows.value.has(rowId)) {
    selectedRows.value.delete(rowId);
  } else {
    selectedRows.value.add(rowId);
  }
};

const toggleSelectAll = () => {
  if (selectedRows.value.size === rows.value.length) {
    selectedRows.value.clear();
  } else {
    rows.value.forEach(r => selectedRows.value.add(r.id));
  }
};

const addRow = () => {
  const newId = Math.max(...rows.value.map(r => r.id), 0) + 1;
  const newRow = {
    id: newId,
    name: 'New Item',
    status: 'Active',
    value: 0,
  };
  rows.value.push(newRow);
  emit('record-created', newRow);
};

const deleteSelected = () => {
  const idsToDelete = Array.from(selectedRows.value);
  rows.value = rows.value.filter(r => !idsToDelete.includes(r.id));
  selectedRows.value.clear();
};
</script>

<style scoped>
.datagrid {
  padding: 20px;
}

.datagrid-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary {
  background-color: #1890ff;
  color: white;
}

.btn-primary:hover {
  background-color: #0050b3;
}

.btn-danger:disabled {
  background-color: #d9d9d9;
  color: #999;
  cursor: not-allowed;
}

.btn-danger:not(:disabled) {
  background-color: #ff4d4f;
  color: white;
}

.datagrid-container {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow-x: auto;
  background: white;
}

.datagrid-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.datagrid-table thead {
  background-color: #f5f5f5;
}

.datagrid-table th {
  padding: 10px;
  text-align: left;
  border-bottom: 2px solid #e0e0e0;
  font-weight: 600;
  color: #333;
}

.checkbox-col {
  width: 40px;
  text-align: center;
}

.datagrid-table td {
  padding: 0;
  border-bottom: 1px solid #f0f0f0;
  border-right: 1px solid #f0f0f0;
  position: relative;
}

.datagrid-table tbody tr:hover {
  background-color: #f9f9f9;
}

.cell-value {
  padding: 10px;
  cursor: pointer;
  user-select: none;
  min-height: 40px;
  display: flex;
  align-items: center;
}

.cell-input {
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 0;
  font-size: 13px;
  background: #e6f7ff;
}

.cell-input:focus {
  outline: 2px solid #1890ff;
}

td.editing {
  background-color: #e6f7ff;
}
</style>
