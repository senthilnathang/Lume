<script lang="ts" setup>
import { computed, h, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { message, Modal } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import {
  FolderOpen, Plus, RefreshCw, Search, Eye, Edit3, Trash2,
  AlertTriangle, MoreVertical, File, FileImage,
  FileVideo, FileAudio, Globe, Lock,
} from 'lucide-vue-next';
import {
  getDocuments, getDocument, getDocumentStats, createDocument,
  updateDocument, deleteDocument,
  type Document as DocType, type DocumentStats, type CreateDocumentData,
} from '@modules/documents/static/api/index';

defineOptions({ name: 'DocumentsView' });

const route = useRoute();

// Derive type filter from route path
const routeType = computed(() => {
  if (route.path.includes('/documents/images')) return 'image';
  if (route.path.includes('/documents/videos')) return 'video';
  return undefined;
});

// State
const loading = ref(false);
const documents = ref<DocType[]>([]);
const stats = ref<DocumentStats>({ total: 0, images: 0, videos: 0, documents: 0, totalDownloads: 0 });
const searchQuery = ref('');
const typeFilter = ref<string | undefined>(undefined);
const categoryFilter = ref<string | undefined>(undefined);
const publicFilter = ref<string | undefined>(undefined);

// Modal state
const showFormModal = ref(false);
const formMode = ref<'create' | 'edit'>('create');
const formLoading = ref(false);
const editingDoc = ref<DocType | null>(null);
const formState = ref<CreateDocumentData>({
  title: '', filename: '', path: '', type: 'document',
  category: '', url: '', description: '', tags: [], is_public: false,
});

// Drawer
const showDrawer = ref(false);
const selectedDoc = ref<DocType | null>(null);
const drawerLoading = ref(false);

// Computed
const categories = computed(() => {
  const cats = new Set(documents.value.map((d) => d.category).filter(Boolean));
  return Array.from(cats).sort();
});

const filteredDocuments = computed(() => {
  let result = documents.value;
  const activeType = typeFilter.value || routeType.value;
  if (activeType) result = result.filter((d) => d.type === activeType);
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter((d) =>
      d.title?.toLowerCase().includes(q) || d.filename?.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q),
    );
  }
  if (categoryFilter.value) result = result.filter((d) => d.category === categoryFilter.value);
  if (publicFilter.value === 'public') result = result.filter((d) => d.is_public);
  else if (publicFilter.value === 'private') result = result.filter((d) => !d.is_public);
  return result;
});

// Table columns
const columns: ColumnsType = [
  { title: 'Document', key: 'document', width: 300 },
  { title: 'Type', key: 'type', width: 100 },
  { title: 'Size', key: 'size', width: 90 },
  { title: 'Category', key: 'category', width: 120 },
  { title: 'Public', key: 'public', width: 70, align: 'center' },
  { title: 'Downloads', key: 'downloads', width: 90, align: 'center' },
  { title: 'Date', key: 'date', width: 120 },
  { title: 'Actions', key: 'actions', width: 80, fixed: 'right' },
];

const typeColors: Record<string, string> = {
  image: 'blue', video: 'purple', document: 'green', audio: 'orange', other: 'default',
};

const typeIcons: Record<string, any> = {
  image: FileImage, video: FileVideo, audio: FileAudio,
};

function getTypeIcon(type: string) {
  return typeIcons[type] || File;
}

// Methods
async function loadData() {
  loading.value = true;
  try {
    const [docsRes, statsRes] = await Promise.allSettled([
      getDocuments({ page: 1, limit: 100 }),
      getDocumentStats(),
    ]);
    if (docsRes.status === 'fulfilled') {
      const res = docsRes.value;
      documents.value = Array.isArray(res) ? res : res?.data || [];
    }
    if (statsRes.status === 'fulfilled') {
      stats.value = statsRes.value;
    }
  } catch (error) {
    message.error('Failed to load documents');
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  formMode.value = 'create';
  editingDoc.value = null;
  formState.value = {
    title: '', filename: '', path: '', type: 'document',
    category: '', url: '', description: '', tags: [], is_public: false,
  };
  showFormModal.value = true;
}

function openEdit(doc: DocType) {
  formMode.value = 'edit';
  editingDoc.value = doc;
  formState.value = {
    title: doc.title, filename: doc.filename, path: doc.path,
    type: doc.type, category: doc.category || '', url: doc.url || '',
    description: doc.description || '', tags: doc.tags || [], is_public: doc.is_public,
  };
  showFormModal.value = true;
}

async function openView(doc: DocType) {
  drawerLoading.value = true;
  showDrawer.value = true;
  try {
    const detail = await getDocument(doc.id);
    selectedDoc.value = detail;
  } catch {
    selectedDoc.value = doc;
  } finally {
    drawerLoading.value = false;
  }
}

async function handleSubmit() {
  if (!formState.value.title) { message.warning('Title is required'); return; }
  formLoading.value = true;
  try {
    const data: any = { ...formState.value };
    if (!data.category) delete data.category;
    if (!data.url) delete data.url;
    if (formMode.value === 'create') {
      await createDocument(data);
      message.success('Document created');
    } else if (editingDoc.value) {
      await updateDocument(editingDoc.value.id, data);
      message.success('Document updated');
    }
    showFormModal.value = false;
    await loadData();
  } catch (error: any) {
    message.error(error?.message || 'Operation failed');
  } finally {
    formLoading.value = false;
  }
}

function handleDelete(doc: DocType) {
  Modal.confirm({
    title: 'Delete Document',
    content: `Are you sure you want to delete "${doc.title}"? This action cannot be undone.`,
    icon: h(AlertTriangle, { size: 20, class: 'text-red-500 mr-2' }),
    okText: 'Delete', okType: 'danger',
    async onOk() {
      try {
        await deleteDocument(doc.id);
        message.success('Document deleted');
        await loadData();
      } catch (error: any) {
        message.error(error?.message || 'Failed to delete');
      }
    },
  });
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

watch(() => route.path, () => {
  typeFilter.value = undefined;
  loadData();
});

onMounted(() => { loadData(); });
</script>

<template>
  <div class="documents-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <FolderOpen :size="24" />
          Documents
        </h1>
        <p class="text-gray-500 m-0">Manage files and documents</p>
      </div>
      <div class="flex items-center gap-2">
        <a-button @click="loadData" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><Plus :size="14" /></template>
          Add Document
        </a-button>
      </div>
    </div>

    <!-- Stats -->
    <a-row :gutter="[16, 16]" class="mb-6">
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-500">{{ stats.total }}</div>
            <div class="text-gray-500 text-sm">Total Documents</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-cyan-500">{{ stats.images }}</div>
            <div class="text-gray-500 text-sm">Images</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-500">{{ stats.videos }}</div>
            <div class="text-gray-500 text-sm">Videos</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-500">{{ stats.totalDownloads }}</div>
            <div class="text-gray-500 text-sm">Total Downloads</div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="mb-6" size="small">
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="6">
          <a-input v-model:value="searchQuery" placeholder="Search documents..." allow-clear>
            <template #prefix><Search :size="14" class="text-gray-400" /></template>
          </a-input>
        </a-col>
        <a-col :xs="24" :sm="6">
          <a-select v-model:value="typeFilter" placeholder="Filter by type" allow-clear style="width: 100%">
            <a-select-option value="image">Image</a-select-option>
            <a-select-option value="video">Video</a-select-option>
            <a-select-option value="document">Document</a-select-option>
            <a-select-option value="audio">Audio</a-select-option>
            <a-select-option value="other">Other</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="6">
          <a-select v-model:value="categoryFilter" placeholder="Filter by category" allow-clear style="width: 100%">
            <a-select-option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="6">
          <a-select v-model:value="publicFilter" placeholder="Visibility" allow-clear style="width: 100%">
            <a-select-option value="public">Public</a-select-option>
            <a-select-option value="private">Private</a-select-option>
          </a-select>
        </a-col>
      </a-row>
    </a-card>

    <!-- Table -->
    <a-card>
      <a-table :columns="columns" :data-source="filteredDocuments" :loading="loading" :pagination="{ pageSize: 20, showSizeChanger: true }" row-key="id" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'document'">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                <component :is="getTypeIcon((record as DocType).type)" :size="18" :class="`text-${typeColors[(record as DocType).type] || 'gray'}-400`" />
              </div>
              <div class="min-w-0">
                <div class="font-medium truncate">{{ (record as DocType).title }}</div>
                <div class="text-xs text-gray-400 truncate">{{ (record as DocType).filename }}</div>
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'type'">
            <a-tag :color="typeColors[(record as DocType).type]">{{ (record as DocType).type }}</a-tag>
          </template>
          <template v-else-if="column.key === 'size'">
            <span class="text-sm">{{ formatFileSize((record as DocType).size) }}</span>
          </template>
          <template v-else-if="column.key === 'category'">
            <span v-if="(record as DocType).category" class="text-sm">{{ (record as DocType).category }}</span>
            <span v-else class="text-gray-300">-</span>
          </template>
          <template v-else-if="column.key === 'public'">
            <Globe v-if="(record as DocType).is_public" :size="16" class="text-green-500" />
            <Lock v-else :size="16" class="text-gray-400" />
          </template>
          <template v-else-if="column.key === 'downloads'">
            <span class="text-sm">{{ (record as DocType).downloads || 0 }}</span>
          </template>
          <template v-else-if="column.key === 'date'">
            <span class="text-sm">{{ formatDate((record as DocType).created_at) }}</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-dropdown>
              <a-button type="text" size="small"><MoreVertical :size="16" /></a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="view" @click="openView(record as DocType)"><Eye :size="14" class="mr-2" /> View</a-menu-item>
                  <a-menu-item key="edit" @click="openEdit(record as DocType)"><Edit3 :size="14" class="mr-2" /> Edit</a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="delete" danger @click="handleDelete(record as DocType)"><Trash2 :size="14" class="mr-2" /> Delete</a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal v-model:open="showFormModal" :title="formMode === 'create' ? 'Add Document' : 'Edit Document'" :confirm-loading="formLoading" @ok="handleSubmit" width="600px">
      <a-form layout="vertical" class="mt-4">
        <a-form-item label="Title" required>
          <a-input v-model:value="formState.title" placeholder="Document title" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Filename">
              <a-input v-model:value="formState.filename" placeholder="file.pdf" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Type">
              <a-select v-model:value="formState.type" style="width: 100%">
                <a-select-option value="document">Document</a-select-option>
                <a-select-option value="image">Image</a-select-option>
                <a-select-option value="video">Video</a-select-option>
                <a-select-option value="audio">Audio</a-select-option>
                <a-select-option value="other">Other</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Path">
          <a-input v-model:value="formState.path" placeholder="/uploads/documents/..." />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Category">
              <a-input v-model:value="formState.category" placeholder="e.g., Reports" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="URL">
              <a-input v-model:value="formState.url" placeholder="https://..." />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Description">
          <a-textarea v-model:value="formState.description" placeholder="Document description" :rows="3" />
        </a-form-item>
        <a-form-item label="Tags">
          <a-select v-model:value="formState.tags" mode="tags" placeholder="Add tags" style="width: 100%" />
        </a-form-item>
        <a-form-item label="Public">
          <a-switch v-model:checked="formState.is_public" checked-children="Public" un-checked-children="Private" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- View Drawer -->
    <a-drawer v-model:open="showDrawer" :title="selectedDoc?.title || 'Document Details'" width="520" placement="right">
      <a-spin :spinning="drawerLoading">
        <template v-if="selectedDoc">
          <div class="flex items-center gap-3 mb-4">
            <a-tag :color="typeColors[selectedDoc.type]">{{ selectedDoc.type }}</a-tag>
            <a-tag v-if="selectedDoc.is_public" color="green"><Globe :size="12" class="mr-1" /> Public</a-tag>
            <a-tag v-else><Lock :size="12" class="mr-1" /> Private</a-tag>
          </div>
          <a-descriptions :column="1" bordered size="small" class="mb-6">
            <a-descriptions-item label="Filename">{{ selectedDoc.filename }}</a-descriptions-item>
            <a-descriptions-item label="Original Name">{{ selectedDoc.original_name || '-' }}</a-descriptions-item>
            <a-descriptions-item label="MIME Type">{{ selectedDoc.mime_type || '-' }}</a-descriptions-item>
            <a-descriptions-item label="Size">{{ formatFileSize(selectedDoc.size) }}</a-descriptions-item>
            <a-descriptions-item label="Category">{{ selectedDoc.category || '-' }}</a-descriptions-item>
            <a-descriptions-item label="Path">{{ selectedDoc.path }}</a-descriptions-item>
            <a-descriptions-item label="Downloads">{{ selectedDoc.downloads || 0 }}</a-descriptions-item>
            <a-descriptions-item label="Created">{{ formatDate(selectedDoc.created_at) }}</a-descriptions-item>
          </a-descriptions>
          <div v-if="selectedDoc.description" class="mb-6">
            <h3 class="text-sm font-semibold text-gray-500 mb-2">Description</h3>
            <div class="text-sm text-gray-700 whitespace-pre-wrap">{{ selectedDoc.description }}</div>
          </div>
          <div v-if="selectedDoc.tags?.length" class="mb-6">
            <h3 class="text-sm font-semibold text-gray-500 mb-2">Tags</h3>
            <div class="flex flex-wrap gap-1">
              <a-tag v-for="tag in selectedDoc.tags" :key="tag">{{ tag }}</a-tag>
            </div>
          </div>
          <div class="flex gap-2">
            <a-button block @click="openEdit(selectedDoc)">
              <template #icon><Edit3 :size="14" /></template>
              Edit
            </a-button>
            <a-button block danger @click="handleDelete(selectedDoc)">
              <template #icon><Trash2 :size="14" /></template>
              Delete
            </a-button>
          </div>
        </template>
      </a-spin>
    </a-drawer>
  </div>
</template>

<style scoped>
.documents-page { min-height: 100%; }
.stat-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }
:deep(.ant-descriptions-item-label) { font-weight: 500; color: #6b7280; }
</style>
