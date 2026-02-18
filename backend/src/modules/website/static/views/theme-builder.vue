<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { Layout, Plus, Edit3, Trash2, Search, ExternalLink, Eye, Code, PanelRight } from 'lucide-vue-next';
import {
  getThemeTemplates,
  createThemeTemplate,
  updateThemeTemplate,
  deleteThemeTemplate,
  getPages,
} from '../api/index';
import ConditionBuilder from '../components/ConditionBuilder.vue';
import { PageBuilder } from '@modules/editor/static/components/index';

defineOptions({ name: 'WebsiteThemeBuilder' });

const loading = ref(false);
const templates = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const searchQuery = ref('');
const activeFilter = ref('all');

const filterOptions = ['All', 'Header', 'Footer', 'Sidebar', 'Single-Post', 'Archive', 'Error-404', 'Search-Results'];

// Page slugs for conditions multi-select
const pageSlugs = ref<{ label: string; value: string }[]>([]);

// Drawer state
const drawerVisible = ref(false);
const drawerLoading = ref(false);
const editingTemplate = reactive({
  id: null as number | null,
  name: '',
  type: 'header' as string,
  content: '',
  contentHtml: '',
  conditions: null as any,
  priority: 0,
  isActive: true,
});

const conditionMode = ref<'include' | 'exclude'>('include');
const conditionPages = ref<string[]>([]);
const conditionsJson = ref<string>('[]');

const typeColors: Record<string, string> = {
  header: 'blue',
  footer: 'green',
  sidebar: 'purple',
  'single-post': 'orange',
  'archive': 'cyan',
  'error-404': 'red',
  'search-results': 'geekblue',
};

const filteredTemplates = computed(() => {
  if (activeFilter.value === 'all') return templates.value;
  const filterVal = activeFilter.value.toLowerCase().replace(' ', '-');
  return templates.value.filter((t) => t.type === filterVal);
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
  conditionsJson.value = '[]';
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
    // Parse conditions — support both new array format and legacy pages/excludePages format
    const conds = editingTemplate.conditions;
    if (Array.isArray(conds) && conds.length > 0) {
      conditionsJson.value = JSON.stringify(conds);
      conditionMode.value = 'include';
      conditionPages.value = [];
    } else if (conds?.excludePages?.length) {
      conditionMode.value = 'exclude';
      conditionPages.value = conds.excludePages;
      conditionsJson.value = '[]';
    } else if (conds?.pages?.length) {
      conditionMode.value = 'include';
      conditionPages.value = conds.pages;
      conditionsJson.value = '[]';
    } else {
      conditionMode.value = 'include';
      conditionPages.value = [];
      conditionsJson.value = '[]';
    }
  } catch {
    message.error('Failed to load template');
    drawerVisible.value = false;
  } finally {
    drawerLoading.value = false;
  }
}

function buildConditions(): any {
  // Prefer the new ConditionBuilder JSON format if present
  try {
    const parsed = JSON.parse(conditionsJson.value || '[]');
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch { /* fall through to legacy */ }
  // Legacy: pages multi-select
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
  activeFilter.value = String(value).toLowerCase().replace(/\s+/g, '-');
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
  { title: 'Actions', key: 'actions', width: 150 },
];

// Live preview
const publicSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL || 'http://localhost:3100';
const previewOpen = ref(false);
const previewTemplateId = ref<number | null>(null);
const previewTemplateType = ref('');

function openPreview(record: any) {
  previewTemplateId.value = record.id;
  previewTemplateType.value = record.type;
  previewOpen.value = true;
}

const previewSrc = computed(() => {
  if (!previewTemplateId.value) return '';
  return `${publicSiteUrl}/?preview_template=${previewTemplateType.value}&preview_id=${previewTemplateId.value}`;
});

// Content editor mode: 'visual' (PageBuilder) or 'json' (textarea)
const contentMode = ref<'visual' | 'json'>('visual');

// PageBuilder content object (parsed TipTap JSON)
const builderContent = ref<any>(null);

// Sync builderContent ↔ editingTemplate.content (string)
function parseTemplateContent(raw: string): any {
  if (!raw) return { type: 'doc', content: [] };
  try {
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return { type: 'doc', content: [] };
  }
}

watch(drawerVisible, (open) => {
  if (open) {
    builderContent.value = parseTemplateContent(editingTemplate.content);
    contentMode.value = 'visual';
  }
});

function handleBuilderUpdate(content: any) {
  builderContent.value = content;
  editingTemplate.content = JSON.stringify(content);
}

// Drawer live preview src (uses the template being edited, if already saved)
const drawerPreviewSrc = computed(() => {
  if (!editingTemplate.id) return '';
  return `${publicSiteUrl}/?preview_template=${editingTemplate.type}&preview_id=${editingTemplate.id}`;
});
const drawerPreviewOpen = ref(false);

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
        :value="filterOptions.find(f => f.toLowerCase().replace(/\s+/g, '-') === activeFilter) || filterOptions[0]"
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
            <a-tooltip title="Preview">
              <a-button type="text" size="small" @click="openPreview(record)">
                <template #icon><Eye :size="14" /></template>
              </a-button>
            </a-tooltip>
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

    <!-- Live Preview Modal -->
    <a-modal
      v-model:open="previewOpen"
      title="Theme Template Preview"
      width="90vw"
      :footer="null"
      :body-style="{ padding: 0, height: '75vh', overflow: 'hidden' }"
    >
      <div class="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
        <span class="text-sm text-gray-500">
          Previewing <strong>{{ previewTemplateType }}</strong> template on the public site
        </span>
        <a :href="previewSrc" target="_blank" class="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700">
          <ExternalLink :size="14" /> Open in new tab
        </a>
      </div>
      <iframe
        v-if="previewSrc"
        :src="previewSrc"
        class="w-full border-0"
        style="height: calc(75vh - 44px);"
      />
    </a-modal>

    <!-- Edit Drawer -->
    <a-drawer
      :open="drawerVisible"
      :title="editingTemplate.id ? 'Edit Template' : 'New Template'"
      :width="drawerPreviewOpen && editingTemplate.id ? '95vw' : 860"
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
                <a-select-option value="single-post">Single Post</a-select-option>
                <a-select-option value="archive">Archive</a-select-option>
                <a-select-option value="error-404">404 Error</a-select-option>
                <a-select-option value="search-results">Search Results</a-select-option>
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

          <ConditionBuilder
            :model-value="conditionsJson"
            @update:model-value="(val: string) => { conditionsJson.value = val }"
          />

          <a-divider>
            <div class="flex items-center gap-3">
              <span>Content</span>
              <a-segmented
                v-model:value="contentMode"
                :options="[{ label: 'Visual', value: 'visual' }, { label: 'JSON', value: 'json' }]"
                size="small"
              />
              <a-tooltip v-if="editingTemplate.id" title="Live Preview">
                <a-button size="small" @click="drawerPreviewOpen = !drawerPreviewOpen">
                  <template #icon><PanelRight :size="14" /></template>
                </a-button>
              </a-tooltip>
            </div>
          </a-divider>

          <!-- Visual PageBuilder mode -->
          <div v-if="contentMode === 'visual'" class="flex gap-4">
            <div :class="drawerPreviewOpen && editingTemplate.id ? 'w-1/2' : 'w-full'">
              <PageBuilder
                v-if="drawerVisible"
                :model-value="builderContent"
                @update:model-value="handleBuilderUpdate"
                style="min-height: 400px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;"
              />
            </div>
            <div v-if="drawerPreviewOpen && editingTemplate.id" class="w-1/2 flex flex-col gap-2">
              <div class="flex items-center justify-between text-xs text-gray-500">
                <span>Live Preview (save to refresh)</span>
                <a :href="drawerPreviewSrc" target="_blank" class="text-blue-500 hover:text-blue-700 flex items-center gap-1">
                  <ExternalLink :size="12" /> Open
                </a>
              </div>
              <iframe
                :src="drawerPreviewSrc"
                class="w-full border border-gray-200 rounded-lg"
                style="height: 420px;"
              />
            </div>
          </div>

          <!-- JSON textarea mode -->
          <a-form-item v-else label="Template Content (TipTap JSON)">
            <a-textarea
              v-model:value="editingTemplate.content"
              :rows="16"
              placeholder='{"type":"doc","content":[...]}'
              class="font-mono text-xs"
              @change="builderContent = parseTemplateContent(editingTemplate.content)"
            />
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
