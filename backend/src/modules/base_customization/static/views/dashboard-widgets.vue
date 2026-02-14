<script lang="ts" setup>
import { computed, h, onMounted, reactive, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  LayoutDashboard,
  Plus,
  RefreshCw,
  Search,
  Edit3,
  Trash2,
  AlertTriangle,
  MoreVertical,
  Hash,
  BarChart3,
  Table2,
  List,
  TrendingUp,
  Code2,
} from 'lucide-vue-next';

import {
  getDashboardWidgets,
  getDashboardWidget,
  createDashboardWidget,
  updateDashboardWidget,
  deleteDashboardWidget,
  getAvailableModels,
} from '@modules/base_customization/static/api/index';

defineOptions({ name: 'DashboardWidgetsView' });

// State
const loading = ref(false);
const widgets = ref([]);
const models = ref([]);
const searchQuery = ref('');
const modelFilter = ref(undefined);
const typeFilter = ref(undefined);
const statusFilter = ref(undefined);

// Drawer state
const showDrawer = ref(false);
const drawerMode = ref('create');
const drawerLoading = ref(false);
const editingWidget = ref(null);
const formState = reactive({
  name: '',
  widget_type: 'counter',
  model_name: '',
  description: '',
  config: '{}',
  position: 0,
  size: 'medium',
  is_active: true,
});

const widgetTypes = [
  { value: 'counter', label: 'Counter' },
  { value: 'chart', label: 'Chart' },
  { value: 'table', label: 'Table' },
  { value: 'list', label: 'List' },
  { value: 'progress', label: 'Progress' },
  { value: 'custom', label: 'Custom' },
];

const widgetTypeConfig = {
  counter: { color: 'blue', icon: Hash },
  chart: { color: 'green', icon: BarChart3 },
  table: { color: 'purple', icon: Table2 },
  list: { color: 'cyan', icon: List },
  progress: { color: 'orange', icon: TrendingUp },
  custom: { color: 'magenta', icon: Code2 },
};

const widgetSizes = [
  { value: 'small', label: 'Small (1/4)' },
  { value: 'medium', label: 'Medium (1/2)' },
  { value: 'large', label: 'Large (3/4)' },
  { value: 'full', label: 'Full Width' },
];

// Computed
const filteredWidgets = computed(() => {
  let result = widgets.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (w) =>
        w.name?.toLowerCase().includes(q) ||
        w.model_name?.toLowerCase().includes(q),
    );
  }
  if (modelFilter.value) {
    result = result.filter((w) => w.model_name === modelFilter.value);
  }
  if (typeFilter.value) {
    result = result.filter((w) => w.widget_type === typeFilter.value);
  }
  if (statusFilter.value === 'active') {
    result = result.filter((w) => w.is_active);
  } else if (statusFilter.value === 'inactive') {
    result = result.filter((w) => !w.is_active);
  }
  return result;
});

const totalWidgets = computed(() => widgets.value.length);
const activeWidgets = computed(() => widgets.value.filter((w) => w.is_active).length);
const widgetTypeCount = computed(() => new Set(widgets.value.map((w) => w.widget_type)).size);

const modelOptions = computed(() => {
  const fromApi = models.value.map((m) =>
    typeof m === 'string' ? { value: m, label: m } : { value: m.name || m.value, label: m.label || m.name || m.value },
  );
  if (fromApi.length > 0) return fromApi;
  const names = [...new Set(widgets.value.map((w) => w.model_name).filter(Boolean))];
  return names.map((n) => ({ value: n, label: n }));
});

// Table columns
const columns = [
  { title: 'Name', key: 'name', width: 220 },
  { title: 'Widget Type', key: 'widget_type', width: 130 },
  { title: 'Model', dataIndex: 'model_name', key: 'model_name', width: 150 },
  { title: 'Size', key: 'size', width: 110 },
  { title: 'Position', key: 'position', width: 90, align: 'center' },
  { title: 'Status', key: 'is_active', width: 100, align: 'center' },
  { title: 'Actions', key: 'actions', width: 100, fixed: 'right' },
];

// Methods
async function loadData() {
  loading.value = true;
  try {
    const [widgetsRes, modelsRes] = await Promise.allSettled([
      getDashboardWidgets(),
      getAvailableModels(),
    ]);
    if (widgetsRes.status === 'fulfilled') {
      const data = widgetsRes.value;
      widgets.value = Array.isArray(data) ? data : data?.items || data?.data || [];
    }
    if (modelsRes.status === 'fulfilled') {
      const data = modelsRes.value;
      models.value = Array.isArray(data) ? data : data?.items || data?.data || [];
    }
  } catch (error) {
    message.error('Failed to load dashboard widgets');
    console.error('Failed to load dashboard widgets:', error);
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.assign(formState, {
    name: '',
    widget_type: 'counter',
    model_name: '',
    description: '',
    config: '{}',
    position: 0,
    size: 'medium',
    is_active: true,
  });
}

function openCreate() {
  drawerMode.value = 'create';
  editingWidget.value = null;
  resetForm();
  showDrawer.value = true;
}

async function openEdit(record) {
  drawerMode.value = 'edit';
  editingWidget.value = record;
  try {
    const detail = await getDashboardWidget(record.id);
    const config = detail.config || '';
    Object.assign(formState, {
      name: detail.name || '',
      widget_type: detail.widget_type || 'counter',
      model_name: detail.model_name || '',
      description: detail.description || '',
      config: typeof config === 'string' ? config : JSON.stringify(config, null, 2),
      position: detail.position || 0,
      size: detail.size || 'medium',
      is_active: detail.is_active !== false,
    });
  } catch {
    const config = record.config || '';
    Object.assign(formState, {
      name: record.name || '',
      widget_type: record.widget_type || 'counter',
      model_name: record.model_name || '',
      description: record.description || '',
      config: typeof config === 'string' ? config : JSON.stringify(config, null, 2),
      position: record.position || 0,
      size: record.size || 'medium',
      is_active: record.is_active !== false,
    });
  }
  showDrawer.value = true;
}

async function handleSubmit() {
  if (!formState.name || !formState.widget_type) {
    message.warning('Please fill in Name and Widget Type');
    return;
  }

  // Validate JSON config
  try {
    if (formState.config) {
      JSON.parse(formState.config);
    }
  } catch {
    message.error('Widget configuration must be valid JSON');
    return;
  }

  drawerLoading.value = true;
  try {
    const payload = {
      ...formState,
      config: formState.config ? JSON.parse(formState.config) : {},
    };

    if (drawerMode.value === 'create') {
      await createDashboardWidget(payload);
      message.success('Dashboard widget created successfully');
    } else {
      await updateDashboardWidget(editingWidget.value.id, payload);
      message.success('Dashboard widget updated successfully');
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
    title: 'Delete Dashboard Widget',
    content: `Are you sure you want to delete "${record.name}"?`,
    icon: h(AlertTriangle, { size: 20, class: 'text-red-500 mr-2' }),
    okText: 'Delete',
    okType: 'danger',
    async onOk() {
      try {
        await deleteDashboardWidget(record.id);
        message.success('Dashboard widget deleted');
        await loadData();
      } catch (error) {
        message.error(error?.response?.data?.message || error?.message || 'Failed to delete');
      }
    },
  });
}

function getWidgetTypeIcon(type) {
  return widgetTypeConfig[type]?.icon || Code2;
}

function getSizeLabel(size) {
  const found = widgetSizes.find((s) => s.value === size);
  return found ? found.label : size || 'Medium';
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="dashboard-widgets-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <LayoutDashboard :size="24" />
          Dashboard Widgets
        </h1>
        <p class="text-gray-500 m-0">Create and manage dashboard widgets for data visualization</p>
      </div>
      <div class="flex items-center gap-2">
        <a-button @click="loadData" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><Plus :size="14" /></template>
          Add Widget
        </a-button>
      </div>
    </div>

    <!-- Stats -->
    <a-row :gutter="[16, 16]" class="mb-6">
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-500">{{ totalWidgets }}</div>
            <div class="text-gray-500 text-sm">Total Widgets</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-500">{{ activeWidgets }}</div>
            <div class="text-gray-500 text-sm">Active</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-500">{{ widgetTypeCount }}</div>
            <div class="text-gray-500 text-sm">Widget Types</div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="mb-6" size="small">
      <div class="flex flex-wrap items-center gap-3">
        <a-input
          v-model:value="searchQuery"
          placeholder="Search widgets..."
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
          :options="widgetTypes"
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
        :data-source="filteredWidgets"
        :loading="loading"
        :pagination="{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `${total} widgets` }"
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

          <!-- Widget Type -->
          <template v-else-if="column.key === 'widget_type'">
            <a-tag :color="widgetTypeConfig[record.widget_type]?.color || 'default'">
              <component :is="getWidgetTypeIcon(record.widget_type)" :size="12" class="mr-1 inline-block align-middle" />
              {{ record.widget_type }}
            </a-tag>
          </template>

          <!-- Size -->
          <template v-else-if="column.key === 'size'">
            <span class="text-sm text-gray-600">{{ getSizeLabel(record.size) }}</span>
          </template>

          <!-- Position -->
          <template v-else-if="column.key === 'position'">
            <span class="text-sm">{{ record.position ?? '-' }}</span>
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
      :title="drawerMode === 'create' ? 'Add Dashboard Widget' : 'Edit Dashboard Widget'"
      width="520"
      placement="right"
      :footer-style="{ textAlign: 'right' }"
    >
      <a-form layout="vertical">
        <a-form-item label="Name" required>
          <a-input v-model:value="formState.name" placeholder="e.g., Active Users Count" />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Widget Type" required>
              <a-select v-model:value="formState.widget_type" :options="widgetTypes" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Model">
              <a-select
                v-model:value="formState.model_name"
                placeholder="Select model"
                :options="modelOptions"
                allow-clear
                show-search
                :filter-option="(input, option) => option.label.toLowerCase().includes(input.toLowerCase())"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="Description">
          <a-input v-model:value="formState.description" placeholder="Widget description" />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Size">
              <a-select v-model:value="formState.size" :options="widgetSizes" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Position">
              <a-input-number v-model:value="formState.position" :min="0" :max="100" style="width: 100%" />
              <div class="text-xs text-gray-400 mt-1">Lower numbers appear first</div>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="Widget Configuration (JSON)">
          <a-textarea
            v-model:value="formState.config"
            :rows="8"
            placeholder="Enter widget-specific configuration as JSON"
            class="font-mono text-sm"
          />
          <div class="text-xs text-gray-400 mt-1">
            Configure data source, aggregation, display options, colors, and other widget-specific settings
          </div>
        </a-form-item>

        <a-form-item label="Active">
          <a-switch v-model:checked="formState.is_active" checked-children="Yes" un-checked-children="No" />
        </a-form-item>
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
.dashboard-widgets-page {
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
