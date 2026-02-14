<script lang="ts" setup>
import { computed, h, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message, Modal } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import {
  ToggleLeft, Plus, RefreshCw, Edit3, Trash2, AlertTriangle,
  MoreVertical, Flag, Upload, Download, Database,
} from 'lucide-vue-next';
import {
  getFeatureFlags, createFeatureFlag, updateFeatureFlag, deleteFeatureFlag, toggleFeatureFlag,
  getImports, createImport, getExports, createExport, getBackups, createBackup,
  type FeatureFlag, type DataImport, type DataExport, type Backup,
} from '@/api/features';

defineOptions({ name: 'FeaturesDataView' });

const route = useRoute();
const router = useRouter();

const sections = [
  { label: 'Feature Flags', value: 'flags' },
  { label: 'Import', value: 'import' },
  { label: 'Export', value: 'export' },
  { label: 'Backups', value: 'backups' },
];

const activeSection = computed({
  get: () => {
    const seg = route.path.split('/').pop() || 'flags';
    return sections.some((s) => s.value === seg) ? seg : 'flags';
  },
  set: () => {},
});

// State
const loading = ref(false);
const flags = ref<FeatureFlag[]>([]);
const imports_ = ref<DataImport[]>([]);
const exports_ = ref<DataExport[]>([]);
const backups = ref<Backup[]>([]);

// Flag Modal
const showFlagModal = ref(false);
const flagFormMode = ref<'create' | 'edit'>('create');
const flagFormLoading = ref(false);
const editingFlag = ref<FeatureFlag | null>(null);
const flagForm = reactive({ name: '', key: '', description: '', enabled: false, expiresAt: '' });

// Import Modal
const showImportModal = ref(false);
const importFormLoading = ref(false);
const importForm = reactive({ name: '', model: '', fileName: '' });

// Export Modal
const showExportModal = ref(false);
const exportFormLoading = ref(false);
const exportForm = reactive({ name: '', model: '', format: 'csv' });

// Backup Modal
const showBackupModal = ref(false);
const backupFormLoading = ref(false);
const backupForm = reactive({ name: '', type: 'full' });

// Table columns
const flagColumns: ColumnsType = [
  { title: 'Name', dataIndex: 'name', key: 'name', width: 180 },
  { title: 'Key', key: 'key', width: 160 },
  { title: 'Description', key: 'description' },
  { title: 'Enabled', key: 'enabled', width: 90, align: 'center' },
  { title: 'Expires', key: 'expires', width: 130 },
  { title: 'Actions', key: 'actions', width: 80, fixed: 'right' },
];

const importColumns: ColumnsType = [
  { title: 'Name', dataIndex: 'name', key: 'name', width: 180 },
  { title: 'Model', dataIndex: 'model', key: 'model', width: 120 },
  { title: 'File', dataIndex: 'fileName', key: 'fileName', width: 150 },
  { title: 'Status', key: 'status', width: 110 },
  { title: 'Progress', key: 'progress', width: 150 },
  { title: 'Created', key: 'created', width: 130 },
];

const exportColumns: ColumnsType = [
  { title: 'Name', dataIndex: 'name', key: 'name', width: 180 },
  { title: 'Model', dataIndex: 'model', key: 'model', width: 120 },
  { title: 'Format', key: 'format', width: 80 },
  { title: 'Records', key: 'records', width: 80, align: 'center' },
  { title: 'Size', key: 'size', width: 80 },
  { title: 'Status', key: 'status', width: 110 },
  { title: 'Created', key: 'created', width: 130 },
];

const backupColumns: ColumnsType = [
  { title: 'Name', dataIndex: 'name', key: 'name', width: 180 },
  { title: 'Type', key: 'type', width: 110 },
  { title: 'Size', key: 'size', width: 80 },
  { title: 'Tables', key: 'tables', width: 80, align: 'center' },
  { title: 'Status', key: 'status', width: 110 },
  { title: 'Created', key: 'created', width: 130 },
];

const statusColors: Record<string, string> = {
  pending: 'orange', processing: 'blue', in_progress: 'blue', completed: 'green', failed: 'red',
};

const formatColors: Record<string, string> = { csv: 'green', json: 'blue', xlsx: 'purple' };
const typeColors: Record<string, string> = { full: 'blue', partial: 'orange', incremental: 'green' };

// Methods
async function loadData() {
  loading.value = true;
  try {
    switch (activeSection.value) {
      case 'flags': await loadFlags(); break;
      case 'import': await loadImports(); break;
      case 'export': await loadExports(); break;
      case 'backups': await loadBackups(); break;
    }
  } finally {
    loading.value = false;
  }
}

async function loadFlags() {
  try {
    const res = await getFeatureFlags();
    flags.value = Array.isArray(res) ? res : (res as any)?.data || [];
  } catch { flags.value = []; }
}

async function loadImports() {
  try {
    const res = await getImports();
    imports_.value = Array.isArray(res) ? res : (res as any)?.data || [];
  } catch { imports_.value = []; }
}

async function loadExports() {
  try {
    const res = await getExports();
    exports_.value = Array.isArray(res) ? res : (res as any)?.data || [];
  } catch { exports_.value = []; }
}

async function loadBackups() {
  try {
    const res = await getBackups();
    backups.value = Array.isArray(res) ? res : (res as any)?.data || [];
  } catch { backups.value = []; }
}

function handleSectionChange(val: string) {
  router.push(`/settings/features/${val}`);
}

// Flag actions
function openCreateFlag() {
  flagFormMode.value = 'create';
  editingFlag.value = null;
  Object.assign(flagForm, { name: '', key: '', description: '', enabled: false, expiresAt: '' });
  showFlagModal.value = true;
}

function openEditFlag(flag: FeatureFlag) {
  flagFormMode.value = 'edit';
  editingFlag.value = flag;
  Object.assign(flagForm, {
    name: flag.name, key: flag.key, description: flag.description || '',
    enabled: flag.enabled, expiresAt: flag.expiresAt || '',
  });
  showFlagModal.value = true;
}

async function handleFlagSubmit() {
  if (!flagForm.name) { message.warning('Name is required'); return; }
  flagFormLoading.value = true;
  try {
    const data: any = { ...flagForm };
    if (flagFormMode.value === 'create' && !data.key) {
      data.key = data.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }
    if (!data.expiresAt) delete data.expiresAt;
    if (flagFormMode.value === 'create') {
      await createFeatureFlag(data);
      message.success('Feature flag created');
    } else if (editingFlag.value) {
      await updateFeatureFlag(editingFlag.value.id, data);
      message.success('Feature flag updated');
    }
    showFlagModal.value = false;
    await loadFlags();
  } catch (error: any) {
    message.error(error?.message || 'Operation failed');
  } finally {
    flagFormLoading.value = false;
  }
}

async function handleToggleFlag(flag: FeatureFlag, checked: boolean) {
  try {
    await toggleFeatureFlag(flag.key, checked);
    flag.enabled = checked;
    message.success(`Flag ${checked ? 'enabled' : 'disabled'}`);
  } catch (error: any) {
    message.error(error?.message || 'Failed to toggle');
    await loadFlags();
  }
}

function handleDeleteFlag(flag: FeatureFlag) {
  Modal.confirm({
    title: 'Delete Feature Flag',
    content: `Delete "${flag.name}"? This cannot be undone.`,
    icon: h(AlertTriangle, { size: 20, class: 'text-red-500 mr-2' }),
    okText: 'Delete', okType: 'danger',
    async onOk() {
      try {
        await deleteFeatureFlag(flag.id);
        message.success('Flag deleted');
        await loadFlags();
      } catch (error: any) {
        message.error(error?.message || 'Failed to delete');
      }
    },
  });
}

// Import actions
async function handleImportSubmit() {
  if (!importForm.name || !importForm.model) { message.warning('Name and model are required'); return; }
  importFormLoading.value = true;
  try {
    await createImport(importForm);
    message.success('Import created');
    showImportModal.value = false;
    await loadImports();
  } catch (error: any) {
    message.error(error?.message || 'Failed to create import');
  } finally {
    importFormLoading.value = false;
  }
}

// Export actions
async function handleExportSubmit() {
  if (!exportForm.name || !exportForm.model) { message.warning('Name and model are required'); return; }
  exportFormLoading.value = true;
  try {
    await createExport(exportForm);
    message.success('Export created');
    showExportModal.value = false;
    await loadExports();
  } catch (error: any) {
    message.error(error?.message || 'Failed to create export');
  } finally {
    exportFormLoading.value = false;
  }
}

// Backup actions
async function handleBackupSubmit() {
  if (!backupForm.name) { message.warning('Name is required'); return; }
  backupFormLoading.value = true;
  try {
    await createBackup(backupForm);
    message.success('Backup created');
    showBackupModal.value = false;
    await loadBackups();
  } catch (error: any) {
    message.error(error?.message || 'Failed to create backup');
  } finally {
    backupFormLoading.value = false;
  }
}

function formatFileSize(bytes?: number) {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

watch(() => route.path, () => { loadData(); });
onMounted(() => { loadData(); });
</script>

<template>
  <div class="features-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <ToggleLeft :size="24" />
          Features & Data
        </h1>
        <p class="text-gray-500 m-0">Manage feature flags, data import/export, and backups</p>
      </div>
      <a-button @click="loadData" :loading="loading">
        <template #icon><RefreshCw :size="14" /></template>
        Refresh
      </a-button>
    </div>

    <!-- Section Navigation -->
    <a-segmented :value="activeSection" :options="sections" class="mb-6" @change="handleSectionChange" />

    <!-- Feature Flags -->
    <div v-if="activeSection === 'flags'">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold m-0 flex items-center gap-2"><Flag :size="18" /> Feature Flags</h2>
        <a-button type="primary" @click="openCreateFlag">
          <template #icon><Plus :size="14" /></template>
          Add Flag
        </a-button>
      </div>
      <a-card>
        <a-table :columns="flagColumns" :data-source="flags" :loading="loading" :pagination="false" row-key="id" size="middle">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'key'">
              <code class="text-xs bg-gray-100 px-2 py-0.5 rounded">{{ (record as FeatureFlag).key }}</code>
            </template>
            <template v-else-if="column.key === 'description'">
              <span class="text-sm text-gray-600">{{ ((record as FeatureFlag).description || '-').substring(0, 60) }}</span>
            </template>
            <template v-else-if="column.key === 'enabled'">
              <a-switch
                :checked="(record as FeatureFlag).enabled"
                size="small"
                @change="(checked: boolean) => handleToggleFlag(record as FeatureFlag, checked)"
              />
            </template>
            <template v-else-if="column.key === 'expires'">
              {{ formatDate((record as FeatureFlag).expiresAt) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-dropdown>
                <a-button type="text" size="small"><MoreVertical :size="16" /></a-button>
                <template #overlay>
                  <a-menu>
                    <a-menu-item key="edit" @click="openEditFlag(record as FeatureFlag)"><Edit3 :size="14" class="mr-2" /> Edit</a-menu-item>
                    <a-menu-divider />
                    <a-menu-item key="delete" danger @click="handleDeleteFlag(record as FeatureFlag)"><Trash2 :size="14" class="mr-2" /> Delete</a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </template>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- Import -->
    <div v-if="activeSection === 'import'">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold m-0 flex items-center gap-2"><Upload :size="18" /> Data Imports</h2>
        <a-button type="primary" @click="Object.assign(importForm, { name: '', model: '', fileName: '' }); showImportModal = true">
          <template #icon><Plus :size="14" /></template>
          New Import
        </a-button>
      </div>
      <a-card>
        <a-table :columns="importColumns" :data-source="imports_" :loading="loading" :pagination="false" row-key="id" size="middle">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <a-tag :color="statusColors[(record as DataImport).status]">{{ (record as DataImport).status }}</a-tag>
            </template>
            <template v-else-if="column.key === 'progress'">
              <div v-if="(record as DataImport).totalRows">
                <span class="text-xs">{{ (record as DataImport).processedRows }} / {{ (record as DataImport).totalRows }}</span>
                <a-progress
                  :percent="Math.round(((record as DataImport).processedRows / (record as DataImport).totalRows) * 100)"
                  size="small"
                  :show-info="false"
                />
              </div>
              <span v-else class="text-gray-300">-</span>
            </template>
            <template v-else-if="column.key === 'created'">
              {{ formatDate((record as DataImport).createdAt) }}
            </template>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- Export -->
    <div v-if="activeSection === 'export'">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold m-0 flex items-center gap-2"><Download :size="18" /> Data Exports</h2>
        <a-button type="primary" @click="Object.assign(exportForm, { name: '', model: '', format: 'csv' }); showExportModal = true">
          <template #icon><Plus :size="14" /></template>
          New Export
        </a-button>
      </div>
      <a-card>
        <a-table :columns="exportColumns" :data-source="exports_" :loading="loading" :pagination="false" row-key="id" size="middle">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'format'">
              <a-tag :color="formatColors[(record as DataExport).format]">{{ (record as DataExport).format }}</a-tag>
            </template>
            <template v-else-if="column.key === 'records'">
              {{ (record as DataExport).recordCount || 0 }}
            </template>
            <template v-else-if="column.key === 'size'">
              {{ formatFileSize((record as DataExport).fileSize) }}
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="statusColors[(record as DataExport).status]">{{ (record as DataExport).status }}</a-tag>
            </template>
            <template v-else-if="column.key === 'created'">
              {{ formatDate((record as DataExport).createdAt) }}
            </template>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- Backups -->
    <div v-if="activeSection === 'backups'">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold m-0 flex items-center gap-2"><Database :size="18" /> Backups</h2>
        <a-button type="primary" @click="Object.assign(backupForm, { name: '', type: 'full' }); showBackupModal = true">
          <template #icon><Plus :size="14" /></template>
          Create Backup
        </a-button>
      </div>
      <a-card>
        <a-table :columns="backupColumns" :data-source="backups" :loading="loading" :pagination="false" row-key="id" size="middle">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'type'">
              <a-tag :color="typeColors[(record as Backup).type]">{{ (record as Backup).type }}</a-tag>
            </template>
            <template v-else-if="column.key === 'size'">
              {{ formatFileSize((record as Backup).fileSize) }}
            </template>
            <template v-else-if="column.key === 'tables'">
              {{ (record as Backup).tables?.length || 0 }}
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="statusColors[(record as Backup).status]">{{ (record as Backup).status }}</a-tag>
            </template>
            <template v-else-if="column.key === 'created'">
              {{ formatDate((record as Backup).createdAt) }}
            </template>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- Flag Modal -->
    <a-modal v-model:open="showFlagModal" :title="flagFormMode === 'create' ? 'Create Feature Flag' : 'Edit Feature Flag'" :confirm-loading="flagFormLoading" @ok="handleFlagSubmit">
      <a-form layout="vertical" class="mt-4">
        <a-form-item label="Name" required>
          <a-input v-model:value="flagForm.name" placeholder="Feature name" />
        </a-form-item>
        <a-form-item label="Key">
          <a-input v-model:value="flagForm.key" placeholder="auto_generated_from_name" :disabled="flagFormMode === 'edit'" />
        </a-form-item>
        <a-form-item label="Description">
          <a-textarea v-model:value="flagForm.description" placeholder="What does this flag control?" :rows="2" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Enabled">
              <a-switch v-model:checked="flagForm.enabled" checked-children="On" un-checked-children="Off" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Expires At">
              <a-input v-model:value="flagForm.expiresAt" type="date" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- Import Modal -->
    <a-modal v-model:open="showImportModal" title="New Import" :confirm-loading="importFormLoading" @ok="handleImportSubmit">
      <a-form layout="vertical" class="mt-4">
        <a-form-item label="Name" required>
          <a-input v-model:value="importForm.name" placeholder="Import name" />
        </a-form-item>
        <a-form-item label="Model" required>
          <a-input v-model:value="importForm.model" placeholder="e.g., User, Donation" />
        </a-form-item>
        <a-form-item label="File Name">
          <a-input v-model:value="importForm.fileName" placeholder="data.csv" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Export Modal -->
    <a-modal v-model:open="showExportModal" title="New Export" :confirm-loading="exportFormLoading" @ok="handleExportSubmit">
      <a-form layout="vertical" class="mt-4">
        <a-form-item label="Name" required>
          <a-input v-model:value="exportForm.name" placeholder="Export name" />
        </a-form-item>
        <a-form-item label="Model" required>
          <a-input v-model:value="exportForm.model" placeholder="e.g., User, Donation" />
        </a-form-item>
        <a-form-item label="Format">
          <a-radio-group v-model:value="exportForm.format">
            <a-radio value="csv">CSV</a-radio>
            <a-radio value="json">JSON</a-radio>
            <a-radio value="xlsx">XLSX</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Backup Modal -->
    <a-modal v-model:open="showBackupModal" title="Create Backup" :confirm-loading="backupFormLoading" @ok="handleBackupSubmit">
      <a-form layout="vertical" class="mt-4">
        <a-form-item label="Name" required>
          <a-input v-model:value="backupForm.name" placeholder="Backup name" />
        </a-form-item>
        <a-form-item label="Type">
          <a-radio-group v-model:value="backupForm.type">
            <a-radio value="full">Full</a-radio>
            <a-radio value="partial">Partial</a-radio>
            <a-radio value="incremental">Incremental</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.features-page { min-height: 100%; }
</style>
