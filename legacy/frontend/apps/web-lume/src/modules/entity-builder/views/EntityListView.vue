<template>
  <div class="entity-list-view">
    <!-- Header -->
    <div class="view-header mb-6">
      <div class="flex justify-between items-center mb-4">
        <div>
          <h1 class="text-2xl font-bold">{{ entity?.label || 'Records' }}</h1>
          <p class="text-gray-500">Manage {{ entity?.label || 'records' }} for this entity</p>
        </div>
        <div class="flex gap-2">
          <a-button type="primary" @click="showCreateForm = true">
            <template #icon>
              <PlusOutlined />
            </template>
            New Record
          </a-button>
          <a-dropdown>
            <template #overlay>
              <a-menu>
                <a-menu-item key="import" @click="showImportModal = true">
                  Import
                </a-menu-item>
                <a-menu-item key="export" @click="handleExport">
                  Export as CSV
                </a-menu-item>
              </a-menu>
            </template>
            <a-button>
              <MoreOutlined />
            </a-button>
          </a-dropdown>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <a-card class="mb-6">
      <template #title>
        <FilterOutlined class="mr-2" />
        Filters
      </template>
      <filter-builder
        :fields="entity?.fields || []"
        :model-value="filters"
        @apply="handleFilterApply"
        @update:model-value="filters = $event"
      />
    </a-card>

    <!-- Table -->
    <a-card class="mb-6">
      <a-table
        :columns="tableColumns"
        :data-source="records"
        :loading="loading"
        :pagination="{
          pageSize: limit,
          current: page,
          total: pagination?.total,
          onChange: handlePageChange
        }"
        :row-key="(record) => record.id"
        class="records-table"
      >
        <!-- Actions Column -->
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions'">
            <div class="flex gap-2">
              <a-button
                type="primary"
                size="small"
                @click="editRecord(record)"
              >
                Edit
              </a-button>
              <a-popconfirm
                title="Delete Record"
                description="Are you sure you want to delete this record?"
                ok-text="Yes"
                cancel-text="No"
                @confirm="deleteRecord(record.id)"
              >
                <a-button danger size="small">
                  Delete
                </a-button>
              </a-popconfirm>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal
      v-model:open="showCreateForm"
      :title="editingRecord ? 'Edit Record' : 'Create New Record'"
      :ok-text="editingRecord ? 'Update' : 'Create'"
      @ok="handleSaveRecord"
      @cancel="handleCloseForm"
    >
      <entity-form-view
        v-if="showCreateForm"
        :entity-id="entityId"
        :entity="entity"
        :record="editingRecord"
        :mode="editingRecord ? 'edit' : 'create'"
        @submit="handleSaveRecord"
        @cancel="handleCloseForm"
      />
    </a-modal>

    <!-- Import Modal -->
    <a-modal
      v-model:open="showImportModal"
      title="Import Records"
      ok-text="Import"
      @ok="handleImport"
      @cancel="showImportModal = false"
    >
      <a-upload
        v-model:file-list="importFileList"
        accept=".csv,.xlsx,.json"
        :max-count="1"
        :before-upload="beforeUpload"
      >
        <a-button>
          <CloudUploadOutlined />
          Click to upload CSV/Excel/JSON
        </a-button>
      </a-upload>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  PlusOutlined,
  FilterOutlined,
  MoreOutlined,
  CloudUploadOutlined,
  DeleteOutlined
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import * as recordApi from '../api/recordApi';
import FilterBuilder from '../components/FilterBuilder.vue';
import EntityFormView from './EntityFormView.vue';

const props = defineProps<{
  entityId: number;
  entity?: any;
}>();

const emit = defineEmits<{
  'record-created': [record: any];
  'record-updated': [record: any];
  'record-deleted': [recordId: number];
}>();

// State
const records = ref<any[]>([]);
const loading = ref(false);
const page = ref(1);
const limit = ref(20);
const filters = ref<any[]>([]);
const pagination = ref<any>(null);
const showCreateForm = ref(false);
const showImportModal = ref(false);
const editingRecord = ref<any>(null);
const importFileList = ref<any[]>([]);

// Table columns
const tableColumns = computed(() => {
  const columns = props.entity?.fields?.map((field: any) => ({
    title: field.label,
    dataIndex: ['data', field.name],
    key: field.name,
    width: 150,
    ellipsis: true
  })) || [];

  columns.push({
    title: 'Created',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 150,
    customRender: ({ text }: any) => new Date(text).toLocaleDateString()
  });

  columns.push({
    title: 'Actions',
    key: 'actions',
    width: 150,
    fixed: 'right'
  });

  return columns;
});

// Load records
const loadRecords = async () => {
  loading.value = true;
  try {
    const response = await recordApi.listRecords({
      entityId: props.entityId,
      page: page.value,
      limit: limit.value,
      filters: filters.value
    });

    records.value = response.records;
    pagination.value = response.pagination;
  } catch (error) {
    message.error('Failed to load records');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// Load on mount
onMounted(() => {
  loadRecords();
});

const handlePageChange = (newPage: number) => {
  page.value = newPage;
  loadRecords();
};

const handleFilterApply = (newFilters: any[]) => {
  filters.value = newFilters;
  page.value = 1; // Reset to first page
  loadRecords();
};

const editRecord = (record: any) => {
  editingRecord.value = record;
  showCreateForm.value = true;
};

const handleSaveRecord = async () => {
  loadRecords();
  showCreateForm.value = false;
  editingRecord.value = null;
};

const handleCloseForm = () => {
  showCreateForm.value = false;
  editingRecord.value = null;
};

const deleteRecord = async (recordId: number) => {
  try {
    await recordApi.deleteRecord(props.entityId, recordId);
    message.success('Record deleted successfully');
    loadRecords();
    emit('record-deleted', recordId);
  } catch (error) {
    message.error('Failed to delete record');
    console.error(error);
  }
};

const handleExport = async () => {
  try {
    await recordApi.bulkExportRecords(props.entityId, 'csv');
    message.success('Export job started. Check the queue for details.');
  } catch (error) {
    message.error('Failed to start export');
  }
};

const beforeUpload = (file: any) => {
  const isValidType = ['text/csv', 'application/json'].includes(file.type);
  if (!isValidType) {
    message.error('Only CSV and JSON files are supported');
  }
  return isValidType || import.meta.env.VITE_UPLOAD_ANY_FILE === 'true';
};

const handleImport = async () => {
  if (importFileList.value.length === 0) {
    message.error('Please select a file');
    return;
  }

  try {
    const file = importFileList.value[0];
    const text = await file.originFileObj.text();
    const records = file.name.endsWith('.json')
      ? JSON.parse(text)
      : parseCSV(text);

    await recordApi.bulkImportRecords(props.entityId, records);
    message.success('Import job started. Check the queue for progress.');
    showImportModal.value = false;
    importFileList.value = [];
    loadRecords();
  } catch (error) {
    message.error('Failed to import records');
    console.error(error);
  }
};

const parseCSV = (csv: string): any[] => {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const record: any = {};
    headers.forEach((header, i) => {
      record[header.trim()] = values[i]?.trim();
    });
    return record;
  });
};
</script>

<style scoped>
.entity-list-view {
  padding: 20px;
}

.view-header {
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 16px;
}

.records-table {
  font-size: 14px;
}
</style>
