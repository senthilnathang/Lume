<script setup>
import { computed, h, onMounted, reactive, ref, watch } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  Columns3,
  Plus,
  RefreshCw,
  Search,
  Edit3,
  Trash2,
  AlertTriangle,
  MoreVertical,
  Database,
  ToggleRight,
  Hash,
} from 'lucide-vue-next';

import {
  getCustomFields,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  getAvailableModels,
} from '@modules/base_customization/static/api/index';

defineOptions({ name: 'CustomFieldsView' });

// State
const loading = ref(false);
const fields = ref([]);
const models = ref([]);
const searchQuery = ref('');
const modelFilter = ref(undefined);
const statusFilter = ref(undefined);

// Drawer state
const showDrawer = ref(false);
const drawerMode = ref('create');
const drawerLoading = ref(false);
const editingField = ref(null);
const formState = reactive({
  name: '',
  label: '',
  model_name: '',
  field_type: 'string',
  is_required: false,
  default_value: '',
  description: '',
  options: '',
  is_active: true,
});

const fieldTypes = [
  { value: 'string', label: 'String' },
  { value: 'text', label: 'Text' },
  { value: 'integer', label: 'Integer' },
  { value: 'float', label: 'Float' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'DateTime' },
  { value: 'select', label: 'Select' },
  { value: 'multiselect', label: 'Multi-Select' },
  { value: 'json', label: 'JSON' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'phone', label: 'Phone' },
];

const fieldTypeColors = {
  string: 'blue',
  text: 'cyan',
  integer: 'green',
  float: 'green',
  boolean: 'orange',
  date: 'purple',
  datetime: 'purple',
  select: 'magenta',
  multiselect: 'magenta',
  json: 'geekblue',
  email: 'blue',
  url: 'blue',
  phone: 'blue',
};

// Computed
const filteredFields = computed(() => {
  let result = fields.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (f) =>
        f.name?.toLowerCase().includes(q) ||
        f.label?.toLowerCase().includes(q) ||
        f.model_name?.toLowerCase().includes(q),
    );
  }
  if (modelFilter.value) {
    result = result.filter((f) => f.model_name === modelFilter.value);
  }
  if (statusFilter.value === 'active') {
    result = result.filter((f) => f.is_active);
  } else if (statusFilter.value === 'inactive') {
    result = result.filter((f) => !f.is_active);
  }
  return result;
});

const totalFields = computed(() => fields.value.length);
const activeFields = computed(() => fields.value.filter((f) => f.is_active).length);
const uniqueModels = computed(() => new Set(fields.value.map((f) => f.model_name)).size);

// Table columns
const columns = [
  { title: 'Name', key: 'name', width: 180 },
  { title: 'Label', dataIndex: 'label', key: 'label', width: 180, ellipsis: true },
  { title: 'Model', dataIndex: 'model_name', key: 'model_name', width: 160 },
  { title: 'Type', key: 'field_type', width: 120 },
  { title: 'Required', key: 'is_required', width: 100, align: 'center' },
  { title: 'Status', key: 'is_active', width: 100, align: 'center' },
  { title: 'Actions', key: 'actions', width: 100, fixed: 'right' },
];

// Model options for filter
const modelOptions = computed(() => {
  const fromApi = models.value.map((m) =>
    typeof m === 'string' ? { value: m, label: m } : { value: m.name || m.value, label: m.label || m.name || m.value },
  );
  if (fromApi.length > 0) return fromApi;
  // Fallback: derive from loaded fields
  const names = [...new Set(fields.value.map((f) => f.model_name).filter(Boolean))];
  return names.map((n) => ({ value: n, label: n }));
});

// Methods
async function loadData() {
  loading.value = true;
  try {
    const [fieldsRes, modelsRes] = await Promise.allSettled([
      getCustomFields(),
      getAvailableModels(),
    ]);
    if (fieldsRes.status === 'fulfilled') {
      const data = fieldsRes.value;
      fields.value = Array.isArray(data) ? data : data?.items || data?.data || [];
    }
    if (modelsRes.status === 'fulfilled') {
      const data = modelsRes.value;
      models.value = Array.isArray(data) ? data : data?.items || data?.data || [];
    }
  } catch (error) {
    message.error('Failed to load custom fields');
    console.error('Failed to load custom fields:', error);
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.assign(formState, {
    name: '',
    label: '',
    model_name: '',
    field_type: 'string',
    is_required: false,
    default_value: '',
    description: '',
    options: '',
    is_active: true,
  });
}

function openCreate() {
  drawerMode.value = 'create';
  editingField.value = null;
  resetForm();
  showDrawer.value = true;
}

function openEdit(record) {
  drawerMode.value = 'edit';
  editingField.value = record;
  Object.assign(formState, {
    name: record.name || '',
    label: record.label || '',
    model_name: record.model_name || '',
    field_type: record.field_type || 'string',
    is_required: record.is_required || false,
    default_value: record.default_value || '',
    description: record.description || '',
    options: record.options ? (typeof record.options === 'string' ? record.options : JSON.stringify(record.options)) : '',
    is_active: record.is_active !== false,
  });
  showDrawer.value = true;
}

async function handleSubmit() {
  if (!formState.name || !formState.label || !formState.model_name) {
    message.warning('Please fill in Name, Label, and Model');
    return;
  }

  drawerLoading.value = true;
  try {
    const payload = { ...formState };
    // Parse options for select types
    if ((payload.field_type === 'select' || payload.field_type === 'multiselect') && typeof payload.options === 'string') {
      try {
        payload.options = JSON.parse(payload.options);
      } catch {
        // Keep as string if not valid JSON
      }
    }

    if (drawerMode.value === 'create') {
      await createCustomField(payload);
      message.success('Custom field created successfully');
    } else {
      await updateCustomField(editingField.value.id, payload);
      message.success('Custom field updated successfully');
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
    title: 'Delete Custom Field',
    content: `Are you sure you want to delete "${record.label || record.name}"? This may affect existing data.`,
    icon: h(AlertTriangle, { size: 20, class: 'text-red-500 mr-2' }),
    okText: 'Delete',
    okType: 'danger',
    async onOk() {
      try {
        await deleteCustomField(record.id);
        message.success('Custom field deleted');
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
  <div class="custom-fields-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <Columns3 :size="24" />
          Custom Fields
        </h1>
        <p class="text-gray-500 m-0">Define and manage custom fields for your data models</p>
      </div>
      <div class="flex items-center gap-2">
        <a-button @click="loadData" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><Plus :size="14" /></template>
          Add Field
        </a-button>
      </div>
    </div>

    <!-- Stats -->
    <a-row :gutter="[16, 16]" class="mb-6">
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-500">{{ totalFields }}</div>
            <div class="text-gray-500 text-sm">Total Fields</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-500">{{ activeFields }}</div>
            <div class="text-gray-500 text-sm">Active</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-500">{{ uniqueModels }}</div>
            <div class="text-gray-500 text-sm">Models</div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="mb-6" size="small">
      <div class="flex flex-wrap items-center gap-3">
        <a-input
          v-model:value="searchQuery"
          placeholder="Search fields..."
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
        :data-source="filteredFields"
        :loading="loading"
        :pagination="{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `${total} fields` }"
        row-key="id"
        size="middle"
        :scroll="{ x: 900 }"
      >
        <template #bodyCell="{ column, record }">
          <!-- Name -->
          <template v-if="column.key === 'name'">
            <div>
              <div class="font-medium">{{ record.name }}</div>
              <div v-if="record.description" class="text-xs text-gray-400 truncate" style="max-width: 160px">
                {{ record.description }}
              </div>
            </div>
          </template>

          <!-- Type -->
          <template v-else-if="column.key === 'field_type'">
            <a-tag :color="fieldTypeColors[record.field_type] || 'default'">
              {{ record.field_type }}
            </a-tag>
          </template>

          <!-- Required -->
          <template v-else-if="column.key === 'is_required'">
            <a-badge
              :status="record.is_required ? 'error' : 'default'"
              :text="record.is_required ? 'Yes' : 'No'"
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
      :title="drawerMode === 'create' ? 'Add Custom Field' : 'Edit Custom Field'"
      width="480"
      placement="right"
      :footer-style="{ textAlign: 'right' }"
    >
      <a-form layout="vertical">
        <a-form-item label="Field Name" required>
          <a-input
            v-model:value="formState.name"
            placeholder="e.g., custom_priority"
            :disabled="drawerMode === 'edit'"
          />
          <div class="text-xs text-gray-400 mt-1">Internal field name (snake_case, no spaces)</div>
        </a-form-item>

        <a-form-item label="Label" required>
          <a-input v-model:value="formState.label" placeholder="e.g., Priority Level" />
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

        <a-form-item label="Field Type" required>
          <a-select v-model:value="formState.field_type" :options="fieldTypes" />
        </a-form-item>

        <a-form-item
          v-if="formState.field_type === 'select' || formState.field_type === 'multiselect'"
          label="Options (JSON array)"
        >
          <a-textarea
            v-model:value="formState.options"
            :rows="3"
            placeholder='["Option 1", "Option 2", "Option 3"]'
          />
        </a-form-item>

        <a-form-item label="Default Value">
          <a-input v-model:value="formState.default_value" placeholder="Default value (optional)" />
        </a-form-item>

        <a-form-item label="Description">
          <a-textarea v-model:value="formState.description" :rows="2" placeholder="Field description" />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Required">
              <a-switch v-model:checked="formState.is_required" checked-children="Yes" un-checked-children="No" />
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
.custom-fields-page {
  min-height: 100%;
}

.stat-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
</style>
