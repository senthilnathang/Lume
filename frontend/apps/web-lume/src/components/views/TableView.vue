<template>
  <div class="table-view">
    <div class="table-toolbar">
      <input
        v-model="searchTerm"
        type="text"
        placeholder="Search..."
        class="search-input"
      />
      <button class="btn btn-primary" @click="addRecord">Add Record</button>
    </div>
    <table class="records-table">
      <thead>
        <tr>
          <th v-for="column in columns" :key="column" class="table-header">
            <span>{{ column }}</span>
            <span class="sort-icon" @click="sortBy(column)">⬍</span>
          </th>
          <th class="table-header">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="record in filteredRecords" :key="record.id" class="table-row">
          <td v-for="column in columns" :key="column" @click="selectRecord(record)">
            {{ record[column] }}
          </td>
          <td class="actions-cell">
            <button class="action-btn edit" @click="editRecord(record)">Edit</button>
            <button class="action-btn delete" @click="deleteRecord(record)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="table-pagination">
      <button @click="previousPage" :disabled="currentPage === 1">Previous</button>
      <span>Page {{ currentPage }} of {{ totalPages }}</span>
      <button @click="nextPage" :disabled="currentPage === totalPages">Next</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  viewDefinition: any;
  entityId: number;
}>();

const emit = defineEmits<{
  'record-selected': [record: any];
  'record-updated': [record: any];
}>();

const searchTerm = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const sortField = ref('');
const sortDir = ref('asc');

const mockRecords = ref(
  Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    name: `Record ${i + 1}`,
    status: i % 3 === 0 ? 'Active' : 'Inactive',
    value: Math.floor(Math.random() * 10000),
    createdAt: new Date().toISOString().split('T')[0],
  }))
);

const columns = computed(() => ['name', 'status', 'value', 'createdAt']);

const filteredRecords = computed(() => {
  let records = mockRecords.value.filter(r =>
    Object.values(r).some(v =>
      String(v).toLowerCase().includes(searchTerm.value.toLowerCase())
    )
  );

  if (sortField.value) {
    records = records.sort((a, b) => {
      const aVal = a[sortField.value as keyof typeof a];
      const bVal = b[sortField.value as keyof typeof b];
      return sortDir.value === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }

  return records.slice(
    (currentPage.value - 1) * pageSize.value,
    currentPage.value * pageSize.value
  );
});

const totalPages = computed(() =>
  Math.ceil(mockRecords.value.length / pageSize.value)
);

const sortBy = (column: string) => {
  if (sortField.value === column) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = column;
    sortDir.value = 'asc';
  }
};

const selectRecord = (record: any) => {
  emit('record-selected', record);
};

const addRecord = () => {
  const newRecord = {
    id: mockRecords.value.length + 1,
    name: 'New Record',
    status: 'Active',
    value: 0,
    createdAt: new Date().toISOString().split('T')[0],
  };
  mockRecords.value.push(newRecord);
  emit('record-created', newRecord);
};

const editRecord = (record: any) => {
  console.log('Edit record:', record);
  emit('record-updated', record);
};

const deleteRecord = (record: any) => {
  const index = mockRecords.value.findIndex(r => r.id === record.id);
  if (index > -1) {
    mockRecords.value.splice(index, 1);
  }
};

const previousPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};
</script>

<style scoped>
.table-view {
  padding: 20px;
}

.table-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-primary {
  background-color: #1890ff;
  color: white;
}

.btn-primary:hover {
  background-color: #0050b3;
}

.records-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.table-header {
  padding: 12px;
  background-color: #f5f5f5;
  border-bottom: 2px solid #e0e0e0;
  font-weight: 600;
  color: #333;
  text-align: left;
  cursor: pointer;
  user-select: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sort-icon {
  margin-left: 4px;
  opacity: 0.5;
  font-size: 12px;
}

.table-row {
  border-bottom: 1px solid #e0e0e0;
}

.table-row:hover {
  background-color: #f9f9f9;
}

.table-row td {
  padding: 12px;
  color: #555;
  cursor: pointer;
}

.actions-cell {
  white-space: nowrap;
}

.action-btn {
  padding: 4px 8px;
  margin: 0 4px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
}

.action-btn.edit {
  background-color: #e6f7ff;
  color: #1890ff;
}

.action-btn.edit:hover {
  background-color: #bae7ff;
}

.action-btn.delete {
  background-color: #ffe6e6;
  color: #ff4d4f;
}

.action-btn.delete:hover {
  background-color: #ffccc7;
}

.table-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
  font-size: 14px;
}

.table-pagination button {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  background: white;
  transition: all 0.2s;
}

.table-pagination button:hover:not(:disabled) {
  border-color: #1890ff;
  color: #1890ff;
}

.table-pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
