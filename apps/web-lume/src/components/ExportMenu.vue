<template>
  <a-dropdown :trigger="['click']">
    <button class="export-btn" @click.prevent>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      Export
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>
    <template #overlay>
      <a-menu>
        <a-menu-item key="csv" @click="handleExport('csv')">
          <div class="export-menu-item">
            <span class="export-icon csv">CSV</span>
            <span>Export as CSV</span>
          </div>
        </a-menu-item>
        <a-menu-item key="xlsx" @click="handleExport('xlsx')">
          <div class="export-menu-item">
            <span class="export-icon xlsx">XLSX</span>
            <span>Export as Excel</span>
          </div>
        </a-menu-item>
        <a-menu-item key="json" @click="handleExport('json')">
          <div class="export-menu-item">
            <span class="export-icon json">JSON</span>
            <span>Export as JSON</span>
          </div>
        </a-menu-item>
        <a-menu-divider />
        <a-menu-item key="template" @click="showTemplateModal = true">
          <div class="export-menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            <span>Custom Export</span>
          </div>
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>

  <!-- Custom Export Modal -->
  <a-modal
    v-model:open="showTemplateModal"
    title="Custom Export"
    @ok="handleCustomExport"
    :okText="'Export'"
    :confirm-loading="exporting"
  >
    <div class="export-modal-content">
      <div class="form-group">
        <label>Export Format</label>
        <a-radio-group v-model:value="customOptions.format">
          <a-radio value="csv">CSV</a-radio>
          <a-radio value="xlsx">Excel (XLSX)</a-radio>
          <a-radio value="json">JSON</a-radio>
        </a-radio-group>
      </div>
      
      <div class="form-group">
        <label>Filename</label>
        <a-input v-model:value="customOptions.filename" placeholder="export" />
      </div>
      
      <div class="form-group">
        <label>Include Options</label>
        <a-checkbox v-model:checked="customOptions.includeAllColumns">
          Include all columns
        </a-checkbox>
        <a-checkbox v-model:checked="customOptions.includeFiltered">
          Only filtered data
        </a-checkbox>
        <a-checkbox v-model:checked="customOptions.includeHeaders">
          Include headers
        </a-checkbox>
      </div>

      <div v-if="!customOptions.includeAllColumns" class="form-group">
        <label>Select Columns</label>
        <div class="column-select">
          <a-checkbox-group v-model:value="customOptions.selectedColumns">
            <a-checkbox 
              v-for="col in availableColumns" 
              :key="col.key" 
              :value="col.key"
            >
              {{ col.title }}
            </a-checkbox>
          </a-checkbox-group>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useExport, type ExportColumn } from '@/utils/export';

const props = defineProps<{
  data: any[];
  columns: ExportColumn[];
  moduleName: string;
}>();

const emit = defineEmits<{
  (e: 'export', format: string, data: any[]): void;
}>();

const { exporting, exportData } = useExport();

const showTemplateModal = ref(false);

const customOptions = reactive({
  format: 'xlsx' as 'csv' | 'xlsx' | 'json',
  filename: '',
  includeAllColumns: true,
  includeFiltered: false,
  includeHeaders: true,
  selectedColumns: [] as string[]
});

const availableColumns = computed(() => {
  if (props.columns && props.columns.length > 0) {
    return props.columns;
  }
  // Auto-generate from data
  if (props.data && props.data.length > 0) {
    return Object.keys(props.data[0]).map(key => ({
      key,
      title: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
    }));
  }
  return [];
});

const handleExport = async (format: 'csv' | 'xlsx' | 'json') => {
  const filename = customOptions.filename || `${props.moduleName}-export-${Date.now()}`;
  
  await exportData(props.data, {
    filename,
    format,
    columns: customOptions.includeAllColumns ? [] : customOptions.selectedColumns.map(key => {
      const col = availableColumns.value.find(c => c.key === key);
      return col || { key, title: key };
    }),
    includeHeaders: customOptions.includeHeaders
  });
  
  emit('export', format, props.data);
};

const handleCustomExport = () => {
  handleExport(customOptions.format);
  showTemplateModal.value = false;
};
</script>

<style scoped>
.export-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  color: #595959;
  cursor: pointer;
  transition: all 0.2s;
}

.export-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.export-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.export-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 20px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
}

.export-icon.csv {
  background: #28a745;
  color: white;
}

.export-icon.xlsx {
  background: #217346;
  color: white;
}

.export-icon.json {
  background: #f7df1e;
  color: #333;
}

.export-modal-content {
  padding: 16px 0;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #262626;
}

.column-select {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 8px;
}

.column-select .ant-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
