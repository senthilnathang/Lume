<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  Tag,
  Plus,
  RefreshCw,
  Search,
  Edit3,
  Trash2,
} from 'lucide-vue-next';

import {
  getTags,
  getTag,
  createTag,
  updateTag,
  deleteTag,
} from '@modules/advanced_features/static/api/index';

defineOptions({ name: 'TagsView' });

// State
const loading = ref(false);
const tags = ref([]);
const searchQuery = ref('');
const categoryFilter = ref(undefined);

// Form drawer
const showFormDrawer = ref(false);
const formLoading = ref(false);
const editingId = ref(null);
const form = ref({
  name: '',
  color: '#1890ff',
  description: '',
  category: '',
});

// Computed
const categories = computed(() => {
  const set = new Set(tags.value.map((t) => t.category).filter(Boolean));
  return Array.from(set).sort();
});

const filteredTags = computed(() => {
  let result = tags.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q),
    );
  }
  if (categoryFilter.value) {
    result = result.filter((t) => t.category === categoryFilter.value);
  }
  return result;
});

// Table columns
const columns = [
  { title: 'Name', key: 'name', width: 180 },
  { title: 'Color', key: 'color', width: 80 },
  { title: 'Description', key: 'description', ellipsis: true },
  { title: 'Category', key: 'category', width: 140 },
  { title: 'Created', key: 'createdAt', width: 140 },
  { title: 'Actions', key: 'actions', width: 100, fixed: 'right' },
];

// Methods
async function loadData() {
  loading.value = true;
  try {
    const res = await getTags();
    tags.value = Array.isArray(res) ? res : res?.data || [];
  } catch (error) {
    message.error('Failed to load tags');
    console.error('Failed to load tags:', error);
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingId.value = null;
  form.value = {
    name: '',
    color: '#1890ff',
    description: '',
    category: '',
  };
  showFormDrawer.value = true;
}

async function openEdit(record) {
  editingId.value = record.id;
  formLoading.value = true;
  showFormDrawer.value = true;
  try {
    const detail = await getTag(record.id);
    const t = detail || record;
    form.value = {
      name: t.name || '',
      color: t.color || '#1890ff',
      description: t.description || '',
      category: t.category || '',
    };
  } catch {
    form.value = {
      name: record.name || '',
      color: record.color || '#1890ff',
      description: record.description || '',
      category: record.category || '',
    };
  } finally {
    formLoading.value = false;
  }
}

async function handleSave() {
  if (!form.value.name) {
    message.warning('Name is required');
    return;
  }

  const payload = {
    name: form.value.name,
    color: form.value.color,
    description: form.value.description || null,
    category: form.value.category || null,
  };

  formLoading.value = true;
  try {
    if (editingId.value) {
      await updateTag(editingId.value, payload);
      message.success('Tag updated');
    } else {
      await createTag(payload);
      message.success('Tag created');
    }
    showFormDrawer.value = false;
    await loadData();
  } catch (error) {
    message.error(error?.message || 'Failed to save tag');
  } finally {
    formLoading.value = false;
  }
}

function confirmDelete(record) {
  Modal.confirm({
    title: 'Delete Tag',
    content: `Are you sure you want to delete "${record.name}"? This will remove the tag from all associated records.`,
    okText: 'Delete',
    okType: 'danger',
    async onOk() {
      try {
        await deleteTag(record.id);
        message.success('Tag deleted');
        await loadData();
      } catch (error) {
        message.error(error?.message || 'Failed to delete tag');
      }
    },
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="tags-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <Tag :size="24" />
          Tags
        </h1>
        <p class="text-gray-500 m-0">Manage tags for organizing records</p>
      </div>
      <div class="flex items-center gap-2">
        <a-button @click="loadData" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><Plus :size="14" /></template>
          Add Tag
        </a-button>
      </div>
    </div>

    <!-- Filters -->
    <a-card class="mb-6" size="small">
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="12">
          <a-input v-model:value="searchQuery" placeholder="Search tags..." allow-clear>
            <template #prefix><Search :size="14" class="text-gray-400" /></template>
          </a-input>
        </a-col>
        <a-col :xs="24" :sm="12">
          <a-select v-model:value="categoryFilter" placeholder="Filter by category" allow-clear style="width: 100%">
            <a-select-option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</a-select-option>
          </a-select>
        </a-col>
      </a-row>
    </a-card>

    <!-- Table -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="filteredTags"
        :loading="loading"
        :pagination="{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="flex items-center gap-2">
              <span
                class="inline-block w-3 h-3 rounded-full flex-shrink-0"
                :style="{ backgroundColor: record.color || '#1890ff' }"
              />
              <span class="font-medium">{{ record.name }}</span>
            </div>
          </template>

          <template v-else-if="column.key === 'color'">
            <div class="flex items-center gap-2">
              <span
                class="inline-block w-6 h-6 rounded border border-gray-200"
                :style="{ backgroundColor: record.color || '#1890ff' }"
              />
              <code class="text-xs text-gray-500">{{ record.color }}</code>
            </div>
          </template>

          <template v-else-if="column.key === 'description'">
            <span class="text-sm text-gray-600">{{ record.description || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'category'">
            <a-tag v-if="record.category" color="blue">{{ record.category }}</a-tag>
            <span v-else class="text-gray-400">-</span>
          </template>

          <template v-else-if="column.key === 'createdAt'">
            <span class="text-sm">{{ formatDate(record.createdAt || record.created_at) }}</span>
          </template>

          <template v-else-if="column.key === 'actions'">
            <div class="flex items-center gap-1">
              <a-tooltip title="Edit">
                <a-button type="text" size="small" @click="openEdit(record)">
                  <Edit3 :size="16" />
                </a-button>
              </a-tooltip>
              <a-tooltip title="Delete">
                <a-button type="text" size="small" danger @click="confirmDelete(record)">
                  <Trash2 :size="16" />
                </a-button>
              </a-tooltip>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Drawer -->
    <a-drawer
      v-model:open="showFormDrawer"
      :title="editingId ? 'Edit Tag' : 'Create Tag'"
      width="440"
      placement="right"
      :footer-style="{ textAlign: 'right' }"
    >
      <a-spin :spinning="formLoading">
        <a-form layout="vertical">
          <a-form-item label="Name" required>
            <a-input v-model:value="form.name" placeholder="e.g. Important, Priority" />
          </a-form-item>

          <a-form-item label="Color">
            <div class="flex items-center gap-3">
              <input
                type="color"
                v-model="form.color"
                class="color-picker-input"
              />
              <a-input v-model:value="form.color" placeholder="#1890ff" style="flex: 1" />
              <span
                class="inline-block w-8 h-8 rounded border border-gray-200"
                :style="{ backgroundColor: form.color }"
              />
            </div>
          </a-form-item>

          <a-form-item label="Description">
            <a-textarea v-model:value="form.description" :rows="3" placeholder="Optional description for this tag" />
          </a-form-item>

          <a-form-item label="Category">
            <a-input v-model:value="form.category" placeholder="e.g. Status, Priority, Department" />
          </a-form-item>

          <!-- Preview -->
          <a-form-item label="Preview">
            <div class="p-3 bg-gray-50 rounded-lg">
              <a-tag :color="form.color" class="text-sm">
                {{ form.name || 'Tag Name' }}
              </a-tag>
            </div>
          </a-form-item>
        </a-form>
      </a-spin>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <a-button @click="showFormDrawer = false">Cancel</a-button>
          <a-button type="primary" :loading="formLoading" @click="handleSave">
            {{ editingId ? 'Update' : 'Create' }}
          </a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<style scoped>
.tags-page {
  min-height: 100%;
}

.color-picker-input {
  width: 40px;
  height: 32px;
  padding: 2px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  background: transparent;
}

.color-picker-input::-webkit-color-swatch-wrapper {
  padding: 2px;
}

.color-picker-input::-webkit-color-swatch {
  border: none;
  border-radius: 4px;
}
</style>
