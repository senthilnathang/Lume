<script setup>
import { computed, h, onMounted, reactive, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  ListOrdered,
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
  getListConfigs,
  getListConfig,
  createListConfig,
  updateListConfig,
  deleteListConfig,
  getAvailableModels,
} from '@modules/base_customization/static/api/index';

defineOptions({ name: 'ListConfigsView' });

// State
const loading = ref(false);
const configs = ref([]);
const models = ref([]);
const searchQuery = ref('');
const modelFilter = ref(undefined);
const statusFilter = ref(undefined);

// Drawer state
const showDrawer = ref(false);
const drawerMode = ref('create');
const drawerLoading = ref(false);
const editingConfig = ref(null);
const formState = reactive({
  name: '',
  model_name: '',
  description: '',
  page_size: 20,
  columns_config: '[]',
  default_sort: '',
  default_sort_order: 'asc',
  filters_config: '[]',
  is_default: false,
  is_active: true,
});

const sortOrderOptions = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
];

const pageSizeOptions = [10, 20, 50, 100];

// Computed
const filteredConfigs = computed(() => {
  let result = configs.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.model_name?.toLowerCase().includes(q),
    );
  }
  if (modelFilter.value) {
    result = result.filter((c) => c.model_name === modelFilter.value);
  }
  if (statusFilter.value === 'active') {
    result = result.filter((c) => c.is_active);
  } else if (statusFilter.value === 'inactive') {
    result = result.filter((c) => !c.is_active);
  }
  return result;
});

const totalConfigs = computed(() => configs.value.length);
const activeConfigs = computed(() => configs.value.filter((c) => c.is_active).length);
const defaultConfigs = computed(() => configs.value.filter((c) => c.is_default).length);

const modelOptions = computed(() => {
  const fromApi = models.value.map((m) =>
    typeof m === 'string' ? { value: m, label: m } : { value: m.name || m.value, label: m.label || m.name || m.value },
  );
  if (fromApi.length > 0) return fromApi;
  const names = [...new Set(configs.value.map((c) => c.model_name).filter(Boolean))];
  return names.map((n) => ({ value: n, label: n }));
});

// Table columns
const columns = [
  { title: 'Name', key: 'name', width: 220 },
  { title: 'Model', dataIndex: 'model_name', key: 'model_name', width: 160 },
  { title: 'Page Size', key: 'page_size', width: 100, align: 'center' },
  { title: 'Default', key: 'is_default', width: 90, align: 'center' },
  { title: 'Status', key: 'is_active', width: 100, align: 'center' },
  { title: 'Updated', key: 'updated_at', width: 140 },
  { title: 'Actions', key: 'actions', width: 100, fixed: 'right' },
];

// Methods
async function loadData() {
  loading.value = true;
  try {
    const [configsRes, modelsRes] = await Promise.allSettled([
      getListConfigs(),
      getAvailableModels(),
    ]);
    if (configsRes.status === 'fulfilled') {
      const data = configsRes.value;
      configs.value = Array.isArray(data) ? data : data?.items || data?.data || [];
    }
    if (modelsRes.status === 'fulfilled') {
      const data = modelsRes.value;
      models.value = Array.isArray(data) ? data : data?.items || data?.data || [];
    }
  } catch (error) {
    message.error('Failed to load list configurations');
    console.error('Failed to load list configurations:', error);
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.assign(formState, {
    name: '',
    model_name: '',
    description: '',
    page_size: 20,
    columns_config: '[]',
    default_sort: '',
    default_sort_order: 'asc',
    filters_config: '[]',
    is_default: false,
    is_active: true,
  });
}

function openCreate() {
  drawerMode.value = 'create';
  editingConfig.value = null;
  resetForm();
  showDrawer.value = true;
}

async function openEdit(record) {
  drawerMode.value = 'edit';
  editingConfig.value = record;
  try {
    const detail = await getListConfig(record.id);
    const cols = detail.columns_config || detail.columns || '';
    const filts = detail.filters_config || detail.filters || '';
    Object.assign(formState, {
      name: detail.name || '',
      model_name: detail.model_name || '',
      description: detail.description || '',
      page_size: detail.page_size || 20,
      columns_config: typeof cols === 'string' ? cols : JSON.stringify(cols, null, 2),
      default_sort: detail.default_sort || '',
      default_sort_order: detail.default_sort_order || 'asc',
      filters_config: typeof filts === 'string' ? filts : JSON.stringify(filts, null, 2),
      is_default: detail.is_default || false,
      is_active: detail.is_active !== false,
    });
  } catch {
    const cols = record.columns_config || record.columns || '';
    const filts = record.filters_config || record.filters || '';
    Object.assign(formState, {
      name: record.name || '',
      model_name: record.model_name || '',
      description: record.description || '',
      page_size: record.page_size || 20,
      columns_config: typeof cols === 'string' ? cols : JSON.stringify(cols, null, 2),
      default_sort: record.default_sort || '',
      default_sort_order: record.default_sort_order || 'asc',
      filters_config: typeof filts === 'string' ? filts : JSON.stringify(filts, null, 2),
      is_default: record.is_default || false,
      is_active: record.is_active !== false,
    });
  }
  showDrawer.value = true;
}

async function handleSubmit() {
  if (!formState.name || !formState.model_name) {
    message.warning('Please fill in Name and Model');
    return;
  }

  // Validate JSON fields
  try {
    if (formState.columns_config) JSON.parse(formState.columns_config);
    if (formState.filters_config) JSON.parse(formState.filters_config);
  } catch {
    message.error('Columns and Filters configuration must be valid JSON');
    return;
  }

  drawerLoading.value = true;
  try {
    const payload = {
      ...formState,
      columns_config: formState.columns_config ? JSON.parse(formState.columns_config) : [],
      filters_config: formState.filters_config ? JSON.parse(formState.filters_config) : [],
    };

    if (drawerMode.value === 'create') {
      await createListConfig(payload);
      message.success('List configuration created successfully');
    } else {
      await updateListConfig(editingConfig.value.id, payload);
      message.success('List configuration updated successfully');
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
    title: 'Delete List Configuration',
    content: `Are you sure you want to delete "${record.name}"?`,
    icon: h(AlertTriangle, { size: 20, class: 'text-red-500 mr-2' }),
    okText: 'Delete',
    okType: 'danger',
    async onOk() {
      try {
        await deleteListConfig(record.id);
        message.success('List configuration deleted');
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

function getColumnCount(record) {
  const cols = record.columns_config || record.columns;
  if (!cols) return 0;
  try {
    const parsed = typeof cols === 'string' ? JSON.parse(cols) : cols;
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="list-configs-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <ListOrdered :size="24" />
          List Configurations
        </h1>
        <p class="text-gray-500 m-0">Configure list views, columns, pagination, and sorting</p>
      </div>
      <div class="flex items-center gap-2">
        <a-button @click="loadData" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><Plus :size="14" /></template>
          Add Configuration
        </a-button>
      </div>
    </div>

    <!-- Stats -->
    <a-row :gutter="[16, 16]" class="mb-6">
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-500">{{ totalConfigs }}</div>
            <div class="text-gray-500 text-sm">Total Configs</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-500">{{ activeConfigs }}</div>
            <div class="text-gray-500 text-sm">Active</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-orange-500">{{ defaultConfigs }}</div>
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
          placeholder="Search configurations..."
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
        :data-source="filteredConfigs"
        :loading="loading"
        :pagination="{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `${total} configurations` }"
        row-key="id"
        size="middle"
        :scroll="{ x: 900 }"
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

          <!-- Page Size -->
          <template v-else-if="column.key === 'page_size'">
            <a-tag>{{ record.page_size || 20 }}</a-tag>
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
      :title="drawerMode === 'create' ? 'Add List Configuration' : 'Edit List Configuration'"
      width="520"
      placement="right"
      :footer-style="{ textAlign: 'right' }"
    >
      <a-form layout="vertical">
        <a-form-item label="Name" required>
          <a-input v-model:value="formState.name" placeholder="e.g., Employee List - Compact" />
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
          <a-input v-model:value="formState.description" placeholder="Configuration description" />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="Page Size">
              <a-select v-model:value="formState.page_size">
                <a-select-option v-for="size in pageSizeOptions" :key="size" :value="size">
                  {{ size }} rows
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Default Sort">
              <a-input v-model:value="formState.default_sort" placeholder="Field name" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Sort Order">
              <a-select v-model:value="formState.default_sort_order" :options="sortOrderOptions" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="Columns Configuration (JSON)">
          <a-textarea
            v-model:value="formState.columns_config"
            :rows="6"
            placeholder='[{"field": "name", "title": "Name", "width": 200}]'
            class="font-mono text-sm"
          />
          <div class="text-xs text-gray-400 mt-1">
            Define visible columns, their order, width, and formatting
          </div>
        </a-form-item>

        <a-form-item label="Filters Configuration (JSON)">
          <a-textarea
            v-model:value="formState.filters_config"
            :rows="4"
            placeholder='[{"field": "status", "type": "select", "options": ["active", "inactive"]}]'
            class="font-mono text-sm"
          />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Default Configuration">
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
  </div>
</template>

<style scoped>
.list-configs-page {
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
