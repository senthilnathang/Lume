<script setup>
import { computed, h, onMounted, reactive, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  LayoutTemplate,
  Plus,
  RefreshCw,
  Search,
  Edit3,
  Trash2,
  AlertTriangle,
  MoreVertical,
  Eye,
} from 'lucide-vue-next';

import {
  getFormLayouts,
  getFormLayout,
  createFormLayout,
  updateFormLayout,
  deleteFormLayout,
  getAvailableModels,
} from '@modules/base_customization/static/api/index';

defineOptions({ name: 'FormBuilderView' });

// State
const loading = ref(false);
const layouts = ref([]);
const models = ref([]);
const searchQuery = ref('');
const modelFilter = ref(undefined);
const statusFilter = ref(undefined);

// Drawer state
const showDrawer = ref(false);
const drawerMode = ref('create');
const drawerLoading = ref(false);
const editingLayout = ref(null);
const formState = reactive({
  name: '',
  model_name: '',
  description: '',
  layout_config: '{\n  "sections": [\n    {\n      "title": "General",\n      "columns": 2,\n      "fields": []\n    }\n  ]\n}',
  is_default: false,
  is_active: true,
});

// Preview modal
const showPreview = ref(false);
const previewData = ref(null);

// Computed
const filteredLayouts = computed(() => {
  let result = layouts.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (l) =>
        l.name?.toLowerCase().includes(q) ||
        l.model_name?.toLowerCase().includes(q),
    );
  }
  if (modelFilter.value) {
    result = result.filter((l) => l.model_name === modelFilter.value);
  }
  if (statusFilter.value === 'active') {
    result = result.filter((l) => l.is_active);
  } else if (statusFilter.value === 'inactive') {
    result = result.filter((l) => !l.is_active);
  }
  return result;
});

const totalLayouts = computed(() => layouts.value.length);
const activeLayouts = computed(() => layouts.value.filter((l) => l.is_active).length);
const defaultLayouts = computed(() => layouts.value.filter((l) => l.is_default).length);

const modelOptions = computed(() => {
  const fromApi = models.value.map((m) =>
    typeof m === 'string' ? { value: m, label: m } : { value: m.name || m.value, label: m.label || m.name || m.value },
  );
  if (fromApi.length > 0) return fromApi;
  const names = [...new Set(layouts.value.map((l) => l.model_name).filter(Boolean))];
  return names.map((n) => ({ value: n, label: n }));
});

// Table columns
const columns = [
  { title: 'Name', key: 'name', width: 220 },
  { title: 'Model', dataIndex: 'model_name', key: 'model_name', width: 160 },
  { title: 'Default', key: 'is_default', width: 100, align: 'center' },
  { title: 'Status', key: 'is_active', width: 100, align: 'center' },
  { title: 'Updated', key: 'updated_at', width: 140 },
  { title: 'Actions', key: 'actions', width: 100, fixed: 'right' },
];

// Methods
async function loadData() {
  loading.value = true;
  try {
    const [layoutsRes, modelsRes] = await Promise.allSettled([
      getFormLayouts(),
      getAvailableModels(),
    ]);
    if (layoutsRes.status === 'fulfilled') {
      const data = layoutsRes.value;
      layouts.value = Array.isArray(data) ? data : data?.items || data?.data || [];
    }
    if (modelsRes.status === 'fulfilled') {
      const data = modelsRes.value;
      models.value = Array.isArray(data) ? data : data?.items || data?.data || [];
    }
  } catch (error) {
    message.error('Failed to load form layouts');
    console.error('Failed to load form layouts:', error);
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.assign(formState, {
    name: '',
    model_name: '',
    description: '',
    layout_config: '{\n  "sections": [\n    {\n      "title": "General",\n      "columns": 2,\n      "fields": []\n    }\n  ]\n}',
    is_default: false,
    is_active: true,
  });
}

function openCreate() {
  drawerMode.value = 'create';
  editingLayout.value = null;
  resetForm();
  showDrawer.value = true;
}

async function openEdit(record) {
  drawerMode.value = 'edit';
  editingLayout.value = record;
  try {
    const detail = await getFormLayout(record.id);
    const config = detail.layout_config || detail.config || '';
    Object.assign(formState, {
      name: detail.name || '',
      model_name: detail.model_name || '',
      description: detail.description || '',
      layout_config: typeof config === 'string' ? config : JSON.stringify(config, null, 2),
      is_default: detail.is_default || false,
      is_active: detail.is_active !== false,
    });
  } catch {
    // Fall back to list data
    const config = record.layout_config || record.config || '';
    Object.assign(formState, {
      name: record.name || '',
      model_name: record.model_name || '',
      description: record.description || '',
      layout_config: typeof config === 'string' ? config : JSON.stringify(config, null, 2),
      is_default: record.is_default || false,
      is_active: record.is_active !== false,
    });
  }
  showDrawer.value = true;
}

function openPreview(record) {
  const config = record.layout_config || record.config;
  try {
    previewData.value = typeof config === 'string' ? JSON.parse(config) : config;
  } catch {
    previewData.value = config;
  }
  showPreview.value = true;
}

async function handleSubmit() {
  if (!formState.name || !formState.model_name) {
    message.warning('Please fill in Name and Model');
    return;
  }

  // Validate JSON
  try {
    if (formState.layout_config) {
      JSON.parse(formState.layout_config);
    }
  } catch {
    message.error('Layout configuration must be valid JSON');
    return;
  }

  drawerLoading.value = true;
  try {
    const payload = {
      ...formState,
      layout_config: formState.layout_config ? JSON.parse(formState.layout_config) : {},
    };

    if (drawerMode.value === 'create') {
      await createFormLayout(payload);
      message.success('Form layout created successfully');
    } else {
      await updateFormLayout(editingLayout.value.id, payload);
      message.success('Form layout updated successfully');
    }
    showDrawer.value = false;
    await loadData();
  } catch (error) {
    message.error(error?.response?.data?.message || error?.message || 'Operation failed');
  } finally {
    drawerLoading.value = false;
  }
}

function handleDelete(record) {
  Modal.confirm({
    title: 'Delete Form Layout',
    content: `Are you sure you want to delete "${record.name}"?`,
    icon: h(AlertTriangle, { size: 20, class: 'text-red-500 mr-2' }),
    okText: 'Delete',
    okType: 'danger',
    async onOk() {
      try {
        await deleteFormLayout(record.id);
        message.success('Form layout deleted');
        await loadData();
      } catch (error) {
        message.error(error?.response?.data?.message || error?.message || 'Failed to delete');
      }
    },
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="form-builder-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <LayoutTemplate :size="24" />
          Form Layouts
        </h1>
        <p class="text-gray-500 m-0">Design and manage form layouts for data entry</p>
      </div>
      <div class="flex items-center gap-2">
        <a-button @click="loadData" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><Plus :size="14" /></template>
          Add Layout
        </a-button>
      </div>
    </div>

    <!-- Stats -->
    <a-row :gutter="[16, 16]" class="mb-6">
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-500">{{ totalLayouts }}</div>
            <div class="text-gray-500 text-sm">Total Layouts</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-500">{{ activeLayouts }}</div>
            <div class="text-gray-500 text-sm">Active</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-orange-500">{{ defaultLayouts }}</div>
            <div class="text-gray-500 text-sm">Defaults</div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="mb-6" size="small">
      <div class="flex flex-wrap items-center gap-3">
        <a-input
          v-model:value="searchQuery"
          placeholder="Search layouts..."
          allow-clear
          style="width: 240px"
        >
          <template #prefix><Search :size="14" class="text-gray-400" /></template>
        </a-input>
        <a-select
          v-model:value="modelFilter"
          placeholder="All Models"
          allow-clear
          style="width: 180px"
          :options="modelOptions"
        />
        <a-select
          v-model:value="statusFilter"
          placeholder="All Statuses"
          allow-clear
          style="width: 150px"
        >
          <a-select-option value="active">Active</a-select-option>
          <a-select-option value="inactive">Inactive</a-select-option>
        </a-select>
      </div>
    </a-card>

    <!-- Table -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="filteredLayouts"
        :loading="loading"
        :pagination="{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `${total} layouts` }"
        row-key="id"
        size="middle"
        :scroll="{ x: 800 }"
      >
        <template #bodyCell="{ column, record }">
          <!-- Name -->
          <template v-if="column.key === 'name'">
            <div>
              <div class="font-medium">{{ record.name }}</div>
              <div v-if="record.description" class="text-xs text-gray-400 truncate" style="max-width: 200px">
                {{ record.description }}
              </div>
            </div>
          </template>

          <!-- Default -->
          <template v-else-if="column.key === 'is_default'">
            <a-tag v-if="record.is_default" color="blue">Default</a-tag>
            <span v-else class="text-gray-300">-</span>
          </template>

          <!-- Status -->
          <template v-else-if="column.key === 'is_active'">
            <a-badge
              :status="record.is_active ? 'success' : 'default'"
              :text="record.is_active ? 'Active' : 'Inactive'"
            />
          </template>

          <!-- Updated -->
          <template v-else-if="column.key === 'updated_at'">
            <span class="text-sm text-gray-500">{{ formatDate(record.updated_at) }}</span>
          </template>

          <!-- Actions -->
          <template v-else-if="column.key === 'actions'">
            <a-dropdown>
              <a-button type="text" size="small">
                <MoreVertical :size="16" />
              </a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="preview" @click="openPreview(record)">
                    <Eye :size="14" class="mr-2" /> Preview
                  </a-menu-item>
                  <a-menu-item key="edit" @click="openEdit(record)">
                    <Edit3 :size="14" class="mr-2" /> Edit
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="delete" danger @click="handleDelete(record)">
                    <Trash2 :size="14" class="mr-2" /> Delete
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Drawer -->
    <a-drawer
      v-model:open="showDrawer"
      :title="drawerMode === 'create' ? 'Add Form Layout' : 'Edit Form Layout'"
      width="560"
      placement="right"
      :footer-style="{ textAlign: 'right' }"
    >
      <a-form layout="vertical">
        <a-form-item label="Name" required>
          <a-input v-model:value="formState.name" placeholder="e.g., Employee Create Form" />
        </a-form-item>

        <a-form-item label="Model" required>
          <a-select
            v-model:value="formState.model_name"
            placeholder="Select model"
            :options="modelOptions"
            show-search
            :filter-option="(input, option) => option.label.toLowerCase().includes(input.toLowerCase())"
          />
        </a-form-item>

        <a-form-item label="Description">
          <a-input v-model:value="formState.description" placeholder="Layout description" />
        </a-form-item>

        <a-form-item label="Layout Configuration (JSON)" required>
          <a-textarea
            v-model:value="formState.layout_config"
            :rows="12"
            placeholder="Enter JSON layout configuration"
            class="font-mono text-sm"
          />
          <div class="text-xs text-gray-400 mt-1">
            Define sections, columns, and field placements in JSON format
          </div>
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Default Layout">
              <a-switch v-model:checked="formState.is_default" checked-children="Yes" un-checked-children="No" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Active">
              <a-switch v-model:checked="formState.is_active" checked-children="Yes" un-checked-children="No" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>

      <template #footer>
        <div class="flex justify-end gap-2">
          <a-button @click="showDrawer = false">Cancel</a-button>
          <a-button type="primary" :loading="drawerLoading" @click="handleSubmit">
            {{ drawerMode === 'create' ? 'Create' : 'Save' }}
          </a-button>
        </div>
      </template>
    </a-drawer>

    <!-- Preview Modal -->
    <a-modal
      v-model:open="showPreview"
      title="Layout Preview"
      :footer="null"
      width="640px"
    >
      <div v-if="previewData" class="layout-preview">
        <template v-if="previewData?.sections">
          <div v-for="(section, idx) in previewData.sections" :key="idx" class="mb-4">
            <h3 class="text-sm font-semibold text-gray-600 mb-2 pb-1 border-b">
              {{ section.title || `Section ${idx + 1}` }}
            </h3>
            <div class="text-xs text-gray-400">
              Columns: {{ section.columns || 1 }} |
              Fields: {{ section.fields?.length || 0 }}
            </div>
            <div v-if="section.fields?.length" class="mt-2 grid gap-2" :style="{ gridTemplateColumns: `repeat(${section.columns || 1}, 1fr)` }">
              <div
                v-for="(field, fIdx) in section.fields"
                :key="fIdx"
                class="p-2 bg-gray-50 rounded text-sm border border-dashed border-gray-200"
              >
                {{ typeof field === 'string' ? field : field.name || field.field || `Field ${fIdx + 1}` }}
              </div>
            </div>
          </div>
        </template>
        <pre v-else class="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-80">{{ JSON.stringify(previewData, null, 2) }}</pre>
      </div>
      <a-empty v-else description="No layout configuration" />
    </a-modal>
  </div>
</template>

<style scoped>
.form-builder-page {
  min-height: 100%;
}

.stat-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.font-mono {
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
}
</style>
