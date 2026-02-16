<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  FileText,
  Plus,
  Edit3,
  Trash2,
  Code2,
  LayoutTemplate,
} from 'lucide-vue-next';
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getSnippets,
  getSnippet,
  createSnippet,
  updateSnippet,
  deleteSnippet,
  type EditorTemplate,
  type EditorSnippet,
} from '@modules/editor/static/api/index';
import { RichEditor, CompactEditor } from '@modules/editor/static/components/index';

defineOptions({ name: 'EditorTemplatesView' });

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const activeTab = ref<'Templates' | 'Snippets'>('Templates');
const tabOptions = ['Templates', 'Snippets'];

const loading = ref(false);
const templates = ref<EditorTemplate[]>([]);
const snippets = ref<EditorSnippet[]>([]);
const searchText = ref('');

// Template drawer
const showTemplateDrawer = ref(false);
const templateFormLoading = ref(false);
const editingTemplateId = ref<number | null>(null);
const templateForm = ref({
  name: '',
  description: '',
  content: '',
  category: 'general',
  isDefault: false,
});

// Snippet drawer
const showSnippetDrawer = ref(false);
const snippetFormLoading = ref(false);
const editingSnippetId = ref<number | null>(null);
const snippetForm = ref({
  name: '',
  content: '',
  category: 'general',
  icon: '',
  shortcut: '',
});

// ---------------------------------------------------------------------------
// Category options
// ---------------------------------------------------------------------------
const templateCategories = [
  { label: 'General', value: 'general' },
  { label: 'Landing', value: 'landing' },
  { label: 'Blog', value: 'blog' },
  { label: 'Email', value: 'email' },
];

const snippetCategories = [
  { label: 'General', value: 'general' },
  { label: 'Layout', value: 'layout' },
  { label: 'Text', value: 'text' },
];

// ---------------------------------------------------------------------------
// Computed — filtered lists
// ---------------------------------------------------------------------------
const filteredTemplates = computed(() => {
  if (!searchText.value) return templates.value;
  const q = searchText.value.toLowerCase();
  return templates.value.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q),
  );
});

const filteredSnippets = computed(() => {
  if (!searchText.value) return snippets.value;
  const q = searchText.value.toLowerCase();
  return snippets.value.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q) ||
      s.shortcut?.toLowerCase().includes(q),
  );
});

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------
const templateColumns = [
  { title: 'Name', key: 'name', ellipsis: true },
  { title: 'Description', key: 'description', ellipsis: true },
  { title: 'Category', dataIndex: 'category', key: 'category', width: 130 },
  { title: 'Default', key: 'default', width: 90, align: 'center' as const },
  { title: 'Created', key: 'created', width: 140 },
  { title: 'Actions', key: 'actions', width: 110, fixed: 'right' as const },
];

const snippetColumns = [
  { title: 'Name', key: 'name', ellipsis: true },
  { title: 'Category', dataIndex: 'category', key: 'category', width: 130 },
  { title: 'Shortcut', dataIndex: 'shortcut', key: 'shortcut', width: 140 },
  { title: 'Created', key: 'created', width: 140 },
  { title: 'Actions', key: 'actions', width: 110, fixed: 'right' as const },
];

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------
async function loadData() {
  loading.value = true;
  try {
    const [tRes, sRes] = await Promise.allSettled([
      getTemplates(),
      getSnippets(),
    ]);
    if (tRes.status === 'fulfilled') {
      const res = tRes.value as any;
      templates.value = Array.isArray(res) ? res : res?.rows || res?.data || [];
    }
    if (sRes.status === 'fulfilled') {
      const res = sRes.value as any;
      snippets.value = Array.isArray(res) ? res : res?.rows || res?.data || [];
    }
  } catch {
    message.error('Failed to load data');
  } finally {
    loading.value = false;
  }
}

// ---------------------------------------------------------------------------
// Template CRUD
// ---------------------------------------------------------------------------
function resetTemplateForm() {
  templateForm.value = {
    name: '',
    description: '',
    content: '',
    category: 'general',
    isDefault: false,
  };
}

function openCreateTemplate() {
  editingTemplateId.value = null;
  resetTemplateForm();
  showTemplateDrawer.value = true;
}

async function openEditTemplate(record: EditorTemplate) {
  editingTemplateId.value = record.id;
  templateFormLoading.value = true;
  showTemplateDrawer.value = true;
  try {
    const detail = await getTemplate(record.id);
    const t = detail || record;
    templateForm.value = {
      name: t.name || '',
      description: t.description || '',
      content: t.content || '',
      category: t.category || 'general',
      isDefault: t.isDefault ?? false,
    };
  } catch {
    templateForm.value = {
      name: record.name || '',
      description: record.description || '',
      content: record.content || '',
      category: record.category || 'general',
      isDefault: record.isDefault ?? false,
    };
  } finally {
    templateFormLoading.value = false;
  }
}

async function handleSaveTemplate() {
  if (!templateForm.value.name.trim()) {
    message.warning('Name is required');
    return;
  }

  const payload = {
    name: templateForm.value.name,
    description: templateForm.value.description || null,
    content: templateForm.value.content || null,
    category: templateForm.value.category,
    isDefault: templateForm.value.isDefault,
  };

  templateFormLoading.value = true;
  try {
    if (editingTemplateId.value) {
      await updateTemplate(editingTemplateId.value, payload);
      message.success('Template updated');
    } else {
      await createTemplate(payload);
      message.success('Template created');
    }
    showTemplateDrawer.value = false;
    await loadData();
  } catch (error: any) {
    message.error(error?.message || 'Failed to save template');
  } finally {
    templateFormLoading.value = false;
  }
}

function confirmDeleteTemplate(record: EditorTemplate) {
  Modal.confirm({
    title: 'Delete Template',
    content: `Are you sure you want to delete "${record.name}"? This action cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    async onOk() {
      try {
        await deleteTemplate(record.id);
        message.success('Template deleted');
        await loadData();
      } catch (error: any) {
        message.error(error?.message || 'Failed to delete template');
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Snippet CRUD
// ---------------------------------------------------------------------------
function resetSnippetForm() {
  snippetForm.value = {
    name: '',
    content: '',
    category: 'general',
    icon: '',
    shortcut: '',
  };
}

function openCreateSnippet() {
  editingSnippetId.value = null;
  resetSnippetForm();
  showSnippetDrawer.value = true;
}

async function openEditSnippet(record: EditorSnippet) {
  editingSnippetId.value = record.id;
  snippetFormLoading.value = true;
  showSnippetDrawer.value = true;
  try {
    const detail = await getSnippet(record.id);
    const s = detail || record;
    snippetForm.value = {
      name: s.name || '',
      content: s.content || '',
      category: s.category || 'general',
      icon: s.icon || '',
      shortcut: s.shortcut || '',
    };
  } catch {
    snippetForm.value = {
      name: record.name || '',
      content: record.content || '',
      category: record.category || 'general',
      icon: record.icon || '',
      shortcut: record.shortcut || '',
    };
  } finally {
    snippetFormLoading.value = false;
  }
}

async function handleSaveSnippet() {
  if (!snippetForm.value.name.trim()) {
    message.warning('Name is required');
    return;
  }

  const payload = {
    name: snippetForm.value.name,
    content: snippetForm.value.content || null,
    category: snippetForm.value.category,
    icon: snippetForm.value.icon || null,
    shortcut: snippetForm.value.shortcut || null,
  };

  snippetFormLoading.value = true;
  try {
    if (editingSnippetId.value) {
      await updateSnippet(editingSnippetId.value, payload);
      message.success('Snippet updated');
    } else {
      await createSnippet(payload);
      message.success('Snippet created');
    }
    showSnippetDrawer.value = false;
    await loadData();
  } catch (error: any) {
    message.error(error?.message || 'Failed to save snippet');
  } finally {
    snippetFormLoading.value = false;
  }
}

function confirmDeleteSnippet(record: EditorSnippet) {
  Modal.confirm({
    title: 'Delete Snippet',
    content: `Are you sure you want to delete "${record.name}"? This action cannot be undone.`,
    okText: 'Delete',
    okType: 'danger',
    async onOk() {
      try {
        await deleteSnippet(record.id);
        message.success('Snippet deleted');
        await loadData();
      } catch (error: any) {
        message.error(error?.message || 'Failed to delete snippet');
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="editor-templates-page p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <FileText :size="20" class="text-purple-600" />
        </div>
        <div>
          <h1 class="text-xl font-semibold m-0">Editor Templates & Snippets</h1>
          <p class="text-sm text-gray-500 m-0">Manage reusable content templates and code snippets</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <a-button type="primary" @click="openCreateTemplate">
          <template #icon><LayoutTemplate :size="14" /></template>
          Add Template
        </a-button>
        <a-button @click="openCreateSnippet">
          <template #icon><Code2 :size="14" /></template>
          Add Snippet
        </a-button>
      </div>
    </div>

    <!-- Tab switcher -->
    <div class="mb-4">
      <a-segmented v-model:value="activeTab" :options="tabOptions" />
    </div>

    <!-- Search filter -->
    <div class="mb-4">
      <a-input
        v-model:value="searchText"
        :placeholder="`Search ${activeTab.toLowerCase()}...`"
        allow-clear
        style="max-width: 320px"
      />
    </div>

    <!-- Templates table -->
    <a-card v-if="activeTab === 'Templates'" :body-style="{ padding: 0 }">
      <a-table
        :columns="templateColumns"
        :data-source="filteredTemplates"
        :loading="loading"
        :pagination="{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['10', '15', '30', '50'] }"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <span class="font-medium">{{ record.name }}</span>
          </template>

          <template v-else-if="column.key === 'description'">
            <span class="text-sm text-gray-500">{{ record.description || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'default'">
            <a-tag v-if="record.isDefault" color="green">Default</a-tag>
          </template>

          <template v-else-if="column.key === 'created'">
            <span class="text-sm">{{ formatDate(record.createdAt || record.created_at) }}</span>
          </template>

          <template v-else-if="column.key === 'actions'">
            <div class="actions-cell flex items-center gap-1">
              <a-tooltip title="Edit">
                <a-button type="text" size="small" @click="openEditTemplate(record)">
                  <template #icon><Edit3 :size="15" /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="Delete">
                <a-button type="text" size="small" danger @click="confirmDeleteTemplate(record)">
                  <template #icon><Trash2 :size="15" /></template>
                </a-button>
              </a-tooltip>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Snippets table -->
    <a-card v-if="activeTab === 'Snippets'" :body-style="{ padding: 0 }">
      <a-table
        :columns="snippetColumns"
        :data-source="filteredSnippets"
        :loading="loading"
        :pagination="{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['10', '15', '30', '50'] }"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <span class="font-medium">{{ record.name }}</span>
          </template>

          <template v-else-if="column.key === 'created'">
            <span class="text-sm">{{ formatDate(record.createdAt || record.created_at) }}</span>
          </template>

          <template v-else-if="column.key === 'actions'">
            <div class="actions-cell flex items-center gap-1">
              <a-tooltip title="Edit">
                <a-button type="text" size="small" @click="openEditSnippet(record)">
                  <template #icon><Edit3 :size="15" /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="Delete">
                <a-button type="text" size="small" danger @click="confirmDeleteSnippet(record)">
                  <template #icon><Trash2 :size="15" /></template>
                </a-button>
              </a-tooltip>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Template drawer -->
    <a-drawer
      v-model:open="showTemplateDrawer"
      :title="editingTemplateId ? 'Edit Template' : 'New Template'"
      width="640"
      placement="right"
      :footer-style="{ textAlign: 'right' }"
    >
      <a-spin :spinning="templateFormLoading">
        <a-form layout="vertical">
          <a-form-item label="Name" required>
            <a-input v-model:value="templateForm.name" placeholder="Template name" />
          </a-form-item>

          <a-form-item label="Description">
            <a-textarea
              v-model:value="templateForm.description"
              placeholder="Brief description of this template"
              :rows="3"
            />
          </a-form-item>

          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="Category">
                <a-select v-model:value="templateForm.category">
                  <a-select-option
                    v-for="cat in templateCategories"
                    :key="cat.value"
                    :value="cat.value"
                  >
                    {{ cat.label }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="Default template">
                <a-switch v-model:checked="templateForm.isDefault" />
              </a-form-item>
            </a-col>
          </a-row>

          <a-form-item label="Content">
            <RichEditor
              v-model="templateForm.content"
              placeholder="Template content..."
              min-height="250px"
              max-height="400px"
            />
          </a-form-item>
        </a-form>
      </a-spin>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <a-button @click="showTemplateDrawer = false">Cancel</a-button>
          <a-button type="primary" :loading="templateFormLoading" @click="handleSaveTemplate">
            {{ editingTemplateId ? 'Update' : 'Create' }}
          </a-button>
        </div>
      </template>
    </a-drawer>

    <!-- Snippet drawer -->
    <a-drawer
      v-model:open="showSnippetDrawer"
      :title="editingSnippetId ? 'Edit Snippet' : 'New Snippet'"
      width="560"
      placement="right"
      :footer-style="{ textAlign: 'right' }"
    >
      <a-spin :spinning="snippetFormLoading">
        <a-form layout="vertical">
          <a-form-item label="Name" required>
            <a-input v-model:value="snippetForm.name" placeholder="Snippet name" />
          </a-form-item>

          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="Category">
                <a-select v-model:value="snippetForm.category">
                  <a-select-option
                    v-for="cat in snippetCategories"
                    :key="cat.value"
                    :value="cat.value"
                  >
                    {{ cat.label }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="Shortcut">
                <a-input v-model:value="snippetForm.shortcut" placeholder="/snippet-name" />
              </a-form-item>
            </a-col>
          </a-row>

          <a-form-item label="Icon">
            <a-input v-model:value="snippetForm.icon" placeholder="Icon name (e.g. code, text)" />
          </a-form-item>

          <a-form-item label="Content">
            <CompactEditor
              v-model="snippetForm.content"
              placeholder="Snippet content..."
            />
          </a-form-item>
        </a-form>
      </a-spin>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <a-button @click="showSnippetDrawer = false">Cancel</a-button>
          <a-button type="primary" :loading="snippetFormLoading" @click="handleSaveSnippet">
            {{ editingSnippetId ? 'Update' : 'Create' }}
          </a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<style scoped>
.editor-templates-page {
  min-height: 100%;
}

:deep(.actions-cell .ant-btn) {
  opacity: 0.55;
  transition: opacity 0.15s;
}

:deep(.ant-table-row:hover .actions-cell .ant-btn) {
  opacity: 1;
}
</style>
