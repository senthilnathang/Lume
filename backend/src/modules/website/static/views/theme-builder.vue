<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { Layout, Plus, Edit3, Trash2, Search } from 'lucide-vue-next';
import {
  getThemeTemplates,
  createThemeTemplate,
  updateThemeTemplate,
  deleteThemeTemplate,
  getPages,
} from '../api/index';

defineOptions({ name: 'WebsiteThemeBuilder' });

const loading = ref(false);
const templates = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const searchQuery = ref('');
const activeFilter = ref('all');

const filterOptions = ['All', 'Header', 'Footer', 'Sidebar'];

// Page slugs for conditions multi-select
const pageSlugs = ref<{ label: string; value: string }[]>([]);

// Drawer state
const drawerVisible = ref(false);
const drawerLoading = ref(false);
const editingTemplate = reactive({
  id: null as number | null,
  name: '',
  type: 'header' as 'header' | 'footer' | 'sidebar',
  content: '',
  contentHtml: '',
  conditions: null as { pages?: string[]; excludePages?: string[] } | null,
  priority: 0,
  isActive: true,
});

const conditionMode = ref<'include' | 'exclude'>('include');
const conditionPages = ref<string[]>([]);

const typeColors: Record<string, string> = {
  header: 'blue',
  footer: 'green',
  sidebar: 'purple',
};

const filteredTemplates = computed(() => {
  if (activeFilter.value === 'all') return templates.value;
  return templates.value.filter(
    (t) => t.type === activeFilter.value.toLowerCase()
  );
});

async function loadTemplates() {
  loading.value = true;
  try {
    const result = await getThemeTemplates({
      page: page.value,
      limit: 50,
      search: searchQuery.value || undefined,
    });
    templates.value = result.data || result || [];
    total.value = result.pagination?.total || templates.value.length;
  } catch {
    message.error('Failed to load theme templates');
  } finally {
    loading.value = false;
  }
}

async function loadPageSlugs() {
  try {
    const result = await getPages({ limit: 200 });
    const rows = result?.rows || result?.data || (Array.isArray(result) ? result : []);
    pageSlugs.value = rows.map((p: any) => ({
      label: `${p.title} (/${p.slug})`,
      value: p.slug,
    }));
  } catch {
    pageSlugs.value = [];
  }
}

function openCreate() {
  Object.assign(editingTemplate, {
    id: null,
    name: '',
    type: 'header',
    content: '',
    contentHtml: '',
    conditions: null,
    priority: 0,
    isActive: true,
  });
  conditionMode.value = 'include';
  conditionPages.value = [];
  drawerVisible.value = true;
}

async function openEdit(record: any) {
  drawerLoading.value = true;
  drawerVisible.value = true;
  try {
    Object.assign(editingTemplate, {
      id: record.id,
      name: record.name,
      type: record.type,
      content: typeof record.content === 'object' ? JSON.stringify(record.content, null, 2) : (record.content || ''),
      contentHtml: record.contentHtml || '',
      conditions: record.conditions || null,
      priority: record.priority || 0,
      isActive: record.isActive !== false,
    });
    // Parse conditions into mode + pages
    if (editingTemplate.conditions?.excludePages?.length) {
      conditionMode.value = 'exclude';
      conditionPages.value = editingTemplate.conditions.excludePages;
    } else if (editingTemplate.conditions?.pages?.length) {
      conditionMode.value = 'include';
      conditionPages.value = editingTemplate.conditions.pages;
    } else {
      conditionMode.value = 'include';
      conditionPages.value = [];
    }
  } catch {
    message.error('Failed to load template');
    drawerVisible.value = false;
  } finally {
    drawerLoading.value = false;
  }
}

function buildConditions(): { pages?: string[]; excludePages?: string[] } | null {
  if (!conditionPages.value.length) return null;
  if (conditionMode.value === 'exclude') {
    return { excludePages: conditionPages.value };
  }
  return { pages: conditionPages.value };
}

async function saveTemplate() {
  if (!editingTemplate.name.trim()) {
    message.warning('Template name is required');
    return;
  }
  drawerLoading.value = true;
  try {
    const payload = {
      name: editingTemplate.name,
      type: editingTemplate.type,
      content: editingTemplate.content,
      contentHtml: editingTemplate.contentHtml,
      conditions: buildConditions(),
      priority: editingTemplate.priority,
      isActive: editingTemplate.isActive,
    };
    if (editingTemplate.id) {
      await updateThemeTemplate(editingTemplate.id, payload);
      message.success('Template updated');
    } else {
      await createThemeTemplate(payload);
      message.success('Template created');
    }
    drawerVisible.value = false;
    loadTemplates();
  } catch (err: any) {
    message.error(err?.message || 'Failed to save template');
  } finally {
    drawerLoading.value = false;
  }
}

function handleDelete(record: any) {
  Modal.confirm({
    title: 'Delete Template',
    content: `Are you sure you want to delete "${record.name}"? This action cannot be undone.`,
    okType: 'danger',
    okText: 'Delete',
    async onOk() {
      try {
        await deleteThemeTemplate(record.id);
        message.success('Template deleted');
        loadTemplates();
      } catch {
        message.error('Failed to delete template');
      }
    },
  });
}

function handleFilterChange(value: string | number) {
  activeFilter.value = String(value).toLowerCase();
}

function formatDate(d: string) {
  return d
    ? new Date(d).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
}

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Type', dataIndex: 'type', key: 'type', width: 110 },
  { title: 'Status', dataIndex: 'isActive', key: 'status', width: 100 },
  { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 90 },
  { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', width: 170 },
  { title: 'Actions', key: 'actions', width: 120 },
];

onMounted(() => {
  loadTemplates();
  loadPageSlugs();
});
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
          <Layout :size="20" class="text-indigo-600" />
        </div>
        <div>
          <h2 class="text-lg font-semibold text-gray-800 m-0">Theme Builder</h2>
          <p class="text-sm text-gray-500 m-0">Manage header, footer, and sidebar templates</p>
        </div>
      </div>
      <a-button type="primary" @click="openCreate">
        <template #icon><Plus :size="16" /></template>
        New Template
      </a-button>
    </div>

    <!-- Filter bar -->
    <div class="flex items-center justify-between mb-4">
      <a-segmented
        :value="activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)"
        :options="filterOptions"
        @change="handleFilterChange"
      />
      <a-input
        v-model:value="searchQuery"
        placeholder="Search templates..."
        allow-clear
        style="width: 260px;"
        @pressEnter="loadTemplates"
        @change="loadTemplates"
      >
        <template #prefix><Search :size="14" class="text-gray-400" /></template>
      </a-input>
    </div>

    <!-- Table -->
    <a-table
      :columns="columns"
      :data-source="filteredTemplates"
      :loading="loading"
      :pagination="total > 50 ? { current: page, total, pageSize: 50 } : false"
      row-key="id"
      @change="(p: any) => { if (p.current) { page = p.current; loadTemplates(); } }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <div class="font-medium">{{ record.name }}</div>
          <div v-if="record.conditions" class="text-xs text-gray-400 mt-0.5">
            <span v-if="record.conditions.pages">
              Pages: {{ record.conditions.pages.join(', ') }}
            </span>
            <span v-else-if="record.conditions.excludePages">
              Excludes: {{ record.conditions.excludePages.join(', ') }}
            </span>
          </div>
        </template>
        <template v-else-if="column.key === 'type'">
          <a-tag :color="typeColors[record.type] || 'default'">
            {{ record.type.charAt(0).toUpperCase() + record.type.slice(1) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="record.isActive ? 'green' : 'default'">
            {{ record.isActive ? 'Active' : 'Inactive' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'priority'">
          <span class="text-sm text-gray-600">{{ record.priority }}</span>
        </template>
        <template v-else-if="column.key === 'createdAt'">
          <span class="text-sm text-gray-500">{{ formatDate(record.createdAt) }}</span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <div class="flex gap-1">
            <a-tooltip title="Edit">
              <a-button type="text" size="small" @click="openEdit(record)">
                <template #icon><Edit3 :size="14" /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip title="Delete">
              <a-button type="text" size="small" danger @click="handleDelete(record)">
                <template #icon><Trash2 :size="14" /></template>
              </a-button>
            </a-tooltip>
          </div>
        </template>
      </template>
    </a-table>

    <!-- Edit Drawer -->
    <a-drawer
      :open="drawerVisible"
      :title="editingTemplate.id ? 'Edit Template' : 'New Template'"
      :width="700"
      @close="drawerVisible = false"
    >
      <a-spin :spinning="drawerLoading">
        <a-form layout="vertical">
          <a-form-item label="Template Name" required>
            <a-input v-model:value="editingTemplate.name" placeholder="e.g. Main Site Header" />
          </a-form-item>

          <div class="grid grid-cols-2 gap-4">
            <a-form-item label="Type" required>
              <a-select v-model:value="editingTemplate.type">
                <a-select-option value="header">Header</a-select-option>
                <a-select-option value="footer">Footer</a-select-option>
                <a-select-option value="sidebar">Sidebar</a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item label="Priority">
              <a-input-number
                v-model:value="editingTemplate.priority"
                :min="0"
                :max="100"
                class="w-full"
                placeholder="0"
              />
              <div class="text-xs text-gray-400 mt-1">
                Higher priority templates are used first
              </div>
            </a-form-item>
          </div>

          <a-form-item>
            <a-switch v-model:checked="editingTemplate.isActive" />
            <span class="ml-2 text-sm">Active</span>
          </a-form-item>

          <a-divider>Display Conditions</a-divider>

          <a-form-item label="Condition Mode">
            <a-segmented
              v-model:value="conditionMode"
              :options="[
                { label: 'Show on specific pages', value: 'include' },
                { label: 'Hide on specific pages', value: 'exclude' },
              ]"
            />
          </a-form-item>

          <a-form-item :label="conditionMode === 'include' ? 'Show on pages' : 'Hide on pages'">
            <a-select
              v-model:value="conditionPages"
              mode="multiple"
              placeholder="Leave empty to show on all pages"
              :options="pageSlugs"
              allow-clear
              show-search
              :filter-option="(input: string, option: any) => option.label.toLowerCase().includes(input.toLowerCase())"
            />
            <div class="text-xs text-gray-400 mt-1">
              {{ conditionMode === 'include'
                ? 'Template will only appear on selected pages. Leave empty for all pages.'
                : 'Template will be hidden on selected pages.'
              }}
            </div>
          </a-form-item>

          <a-divider>Content</a-divider>

          <a-form-item label="Template Content (TipTap JSON)">
            <a-textarea
              v-model:value="editingTemplate.content"
              :rows="14"
              placeholder='{"type":"doc","content":[...]}'
              class="font-mono text-xs"
            />
            <div class="text-xs text-gray-400 mt-1">
              Paste TipTap JSON content here. PageBuilder integration coming soon.
            </div>
          </a-form-item>
        </a-form>
      </a-spin>

      <template #footer>
        <div class="flex justify-end gap-2">
          <a-button @click="drawerVisible = false">Cancel</a-button>
          <a-button type="primary" :loading="drawerLoading" @click="saveTemplate">
            {{ editingTemplate.id ? 'Update' : 'Create' }}
          </a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
}
.grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
</style>
