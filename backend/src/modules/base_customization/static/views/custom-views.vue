<script setup>
import { computed, h, onMounted, reactive, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  LayoutGrid,
  Plus,
  RefreshCw,
  Search,
  Edit3,
  Trash2,
  AlertTriangle,
  MoreVertical,
  List,
  KanbanSquare,
  Calendar,
  GalleryHorizontalEnd,
  BarChart3,
} from 'lucide-vue-next';

import {
  getCustomViews,
  getCustomView,
  createCustomView,
  updateCustomView,
  deleteCustomView,
  getAvailableModels,
} from '@modules/base_customization/static/api/index';

defineOptions({ name: 'CustomViewsView' });

// State
const loading = ref(false);
const views = ref([]);
const models = ref([]);
const searchQuery = ref('');
const modelFilter = ref(undefined);
const typeFilter = ref(undefined);
const statusFilter = ref(undefined);

// Drawer state
const showDrawer = ref(false);
const drawerMode = ref('create');
const drawerLoading = ref(false);
const editingView = ref(null);
const formState = reactive({
  name: '',
  model_name: '',
  view_type: 'list',
  description: '',
  config: '{}',
  is_default: false,
  is_shared: true,
  is_active: true,
});

const viewTypes = [
  { value: 'list', label: 'List' },
  { value: 'kanban', label: 'Kanban' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'chart', label: 'Chart' },
];

const viewTypeConfig = {
  list: { color: 'blue', icon: List },
  kanban: { color: 'purple', icon: KanbanSquare },
  calendar: { color: 'green', icon: Calendar },
  gallery: { color: 'magenta', icon: GalleryHorizontalEnd },
  chart: { color: 'orange', icon: BarChart3 },
};

// Computed
const filteredViews = computed(() => {
  let result = views.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (v) =>
        v.name?.toLowerCase().includes(q) ||
        v.model_name?.toLowerCase().includes(q),
    );
  }
  if (modelFilter.value) {
    result = result.filter((v) => v.model_name === modelFilter.value);
  }
  if (typeFilter.value) {
    result = result.filter((v) => v.view_type === typeFilter.value);
  }
  if (statusFilter.value === 'active') {
    result = result.filter((v) => v.is_active);
  } else if (statusFilter.value === 'inactive') {
    result = result.filter((v) => !v.is_active);
  }
  return result;
});

const totalViews = computed(() => views.value.length);
const activeViews = computed(() => views.value.filter((v) => v.is_active).length);
const sharedViews = computed(() => views.value.filter((v) => v.is_shared).length);

const modelOptions = computed(() => {
  const fromApi = models.value.map((m) =>
    typeof m === 'string' ? { value: m, label: m } : { value: m.name || m.value, label: m.label || m.name || m.value },
  );
  if (fromApi.length > 0) return fromApi;
  const names = [...new Set(views.value.map((v) => v.model_name).filter(Boolean))];
  return names.map((n) => ({ value: n, label: n }));
});

// Table columns
const columns = [
  { title: 'Name', key: 'name', width: 200 },
  { title: 'Model', dataIndex: 'model_name', key: 'model_name', width: 150 },
  { title: 'View Type', key: 'view_type', width: 130 },
  { title: 'Default', key: 'is_default', width: 90, align: 'center' },
  { title: 'Shared', key: 'is_shared', width: 90, align: 'center' },
  { title: 'Status', key: 'is_active', width: 100, align: 'center' },
  { title: 'Actions', key: 'actions', width: 100, fixed: 'right' },
];

// Methods
async function loadData() {
  loading.value = true;
  try {
    const [viewsRes, modelsRes] = await Promise.allSettled([
      getCustomViews(),
      getAvailableModels(),
    ]);
    if (viewsRes.status === 'fulfilled') {
      const data = viewsRes.value;
      views.value = Array.isArray(data) ? data : data?.items || data?.data || [];
    }
    if (modelsRes.status === 'fulfilled') {
      const data = modelsRes.value;
      models.value = Array.isArray(data) ? data : data?.items || data?.data || [];
    }
  } catch (error) {
    message.error('Failed to load custom views');
    console.error('Failed to load custom views:', error);
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.assign(formState, {
    name: '',
    model_name: '',
    view_type: 'list',
    description: '',
    config: '{}',
    is_default: false,
    is_shared: true,
    is_active: true,
  });
}

function openCreate() {
  drawerMode.value = 'create';
  editingView.value = null;
  resetForm();
  showDrawer.value = true;
}

async function openEdit(record) {
  drawerMode.value = 'edit';
  editingView.value = record;
  try {
    const detail = await getCustomView(record.id);
    const config = detail.config || '';
    Object.assign(formState, {
      name: detail.name || '',
      model_name: detail.model_name || '',
      view_type: detail.view_type || 'list',
      description: detail.description || '',
      config: typeof config === 'string' ? config : JSON.stringify(config, null, 2),
      is_default: detail.is_default || false,
      is_shared: detail.is_shared !== false,
      is_active: detail.is_active !== false,
    });
  } catch {
    const config = record.config || '';
    Object.assign(formState, {
      name: record.name || '',
      model_name: record.model_name || '',
      view_type: record.view_type || 'list',
      description: record.description || '',
      config: typeof config === 'string' ? config : JSON.stringify(config, null, 2),
      is_default: record.is_default || false,
      is_shared: record.is_shared !== false,
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

  // Validate JSON config
  try {
    if (formState.config) {
      JSON.parse(formState.config);
    }
  } catch {
    message.error('View configuration must be valid JSON');
    return;
  }

  drawerLoading.value = true;
  try {
    const payload = {
      ...formState,
      config: formState.config ? JSON.parse(formState.config) : {},
    };

    if (drawerMode.value === 'create') {
      await createCustomView(payload);
      message.success('Custom view created successfully');
    } else {
      await updateCustomView(editingView.value.id, payload);
      message.success('Custom view updated successfully');
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
    title: 'Delete Custom View',
    content: `Are you sure you want to delete "${record.name}"?`,
    icon: h(AlertTriangle, { size: 20, class: 'text-red-500 mr-2' }),
    okText: 'Delete',
    okType: 'danger',
    async onOk() {
      try {
        await deleteCustomView(record.id);
        message.success('Custom view deleted');
        await loadData();
      } catch (error) {
        message.error(error?.response?.data?.message || error?.message || 'Failed to delete');
      }
    },
  });
}

function getViewTypeIcon(type) {
  return viewTypeConfig[type]?.icon || List;
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="custom-views-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <LayoutGrid :size="24" />
          Custom Views
        </h1>
        <p class="text-gray-500 m-0">Create and manage custom data views for your models</p>
      </div>
      <div class="flex items-center gap-2">
        <a-button @click="loadData" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><Plus :size="14" /></template>
          Add View
        </a-button>
      </div>
    </div>

    <!-- Stats -->
    <a-row :gutter="[16, 16]" class="mb-6">
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-500">{{ totalViews }}</div>
            <div class="text-gray-500 text-sm">Total Views</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-500">{{ activeViews }}</div>
            <div class="text-gray-500 text-sm">Active</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-cyan-500">{{ sharedViews }}</div>
            <div class="text-gray-500 text-sm">Shared</div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="mb-6" size="small">
      <div class="flex flex-wrap items-center gap-3">
        <a-input
          v-model:value="searchQuery"
          placeholder="Search views..."
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
          v-model:value="typeFilter"
          placeholder="All Types"
          allow-clear
          style="width: 150px"
          :options="viewTypes"
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
        :data-source="filteredViews"
        :loading="loading"
        :pagination="{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `${total} views` }"
        row-key="id"
        size="middle"
        :scroll="{ x: 900 }"
      >
        <template #bodyCell="{ column, record }">
          <!-- Name -->
          <template v-if="column.key === 'name'">
            <div>
              <div class="font-medium">{{ record.name }}</div>
              <div v-if="record.description" class="text-xs text-gray-400 truncate" style="max-width: 180px">
                {{ record.description }}
              </div>
            </div>
          </template>

          <!-- View Type -->
          <template v-else-if="column.key === 'view_type'">
            <a-tag :color="viewTypeConfig[record.view_type]?.color || 'default'">
              <component :is="getViewTypeIcon(record.view_type)" :size="12" class="mr-1 inline-block align-middle" />
              {{ record.view_type }}
            </a-tag>
          </template>

          <!-- Default -->
          <template v-else-if="column.key === 'is_default'">
            <a-tag v-if="record.is_default" color="blue">Default</a-tag>
            <span v-else class="text-gray-300">-</span>
          </template>

          <!-- Shared -->
          <template v-else-if="column.key === 'is_shared'">
            <a-badge
              :status="record.is_shared ? 'processing' : 'default'"
              :text="record.is_shared ? 'Shared' : 'Private'"
            />
          </template>

          <!-- Status -->
          <template v-else-if="column.key === 'is_active'">
            <a-badge
              :status="record.is_active ? 'success' : 'default'"
              :text="record.is_active ? 'Active' : 'Inactive'"
            />
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
      :title="drawerMode === 'create' ? 'Add Custom View' : 'Edit Custom View'"
      width="520"
      placement="right"
      :footer-style="{ textAlign: 'right' }"
    >
      <a-form layout="vertical">
        <a-form-item label="Name" required>
          <a-input v-model:value="formState.name" placeholder="e.g., Active Employees Board" />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Model" required>
              <a-select
                v-model:value="formState.model_name"
                placeholder="Select model"
                :options="modelOptions"
                show-search
                :filter-option="(input, option) => option.label.toLowerCase().includes(input.toLowerCase())"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="View Type" required>
              <a-select v-model:value="formState.view_type" :options="viewTypes" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="Description">
          <a-input v-model:value="formState.description" placeholder="View description" />
        </a-form-item>

        <a-form-item label="View Configuration (JSON)">
          <a-textarea
            v-model:value="formState.config"
            :rows="8"
            placeholder="Enter view-specific configuration as JSON"
            class="font-mono text-sm"
          />
          <div class="text-xs text-gray-400 mt-1">
            Configure filters, sorting, grouping, columns, and other view-specific settings
          </div>
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="Default">
              <a-switch v-model:checked="formState.is_default" checked-children="Yes" un-checked-children="No" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Shared">
              <a-switch v-model:checked="formState.is_shared" checked-children="Yes" un-checked-children="No" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
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
.custom-views-page {
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
