<script lang="ts" setup>
import { computed, h, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { message, Modal } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import {
  Image, Plus, RefreshCw, Search, Eye, Edit3, Trash2,
  AlertTriangle, MoreVertical, Star, Grid, List,
  FileImage, FileVideo, FileAudio, File, Globe, Lock,
} from 'lucide-vue-next';
import {
  getMedia, getMediaItem, getMediaStats, createMedia,
  updateMedia, deleteMedia,
  type MediaItem, type MediaStats, type CreateMediaData,
} from '@/api/media';

defineOptions({ name: 'MediaView' });

const route = useRoute();

const isFeaturedRoute = computed(() => route.path.includes('/media/featured'));

// State
const loading = ref(false);
const mediaItems = ref<MediaItem[]>([]);
const stats = ref<MediaStats>({ total: 0, images: 0, videos: 0, featured: 0, totalViews: 0 });
const searchQuery = ref('');
const typeFilter = ref<string | undefined>(undefined);
const categoryFilter = ref<string | undefined>(undefined);
const featuredFilter = ref<boolean | undefined>(undefined);
const viewMode = ref<'table' | 'grid'>('table');

// Modal state
const showFormModal = ref(false);
const formMode = ref<'create' | 'edit'>('create');
const formLoading = ref(false);
const editingMedia = ref<MediaItem | null>(null);
const formState = ref<CreateMediaData>({
  title: '', filename: '', path: '', type: 'image',
  description: '', category: '', url: '', thumbnail_url: '',
  alt_text: '', caption: '', is_public: true, is_featured: false,
});

// Drawer
const showDrawer = ref(false);
const selectedMedia = ref<MediaItem | null>(null);
const drawerLoading = ref(false);

// Computed
const categories = computed(() => {
  const cats = new Set(mediaItems.value.map((m) => m.category).filter(Boolean));
  return Array.from(cats).sort();
});

const filteredMedia = computed(() => {
  let result = mediaItems.value;
  if (isFeaturedRoute.value || featuredFilter.value) result = result.filter((m) => m.is_featured);
  if (typeFilter.value) result = result.filter((m) => m.type === typeFilter.value);
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter((m) =>
      m.title?.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q) || m.filename?.toLowerCase().includes(q),
    );
  }
  if (categoryFilter.value) result = result.filter((m) => m.category === categoryFilter.value);
  return result;
});

// Table columns
const columns: ColumnsType = [
  { title: 'Preview', key: 'preview', width: 60 },
  { title: 'Title', key: 'title', width: 250 },
  { title: 'Type', key: 'type', width: 90 },
  { title: 'Size', key: 'size', width: 80 },
  { title: 'Dimensions', key: 'dimensions', width: 100 },
  { title: 'Views', key: 'views', width: 70, align: 'center' },
  { title: 'Downloads', key: 'downloads', width: 90, align: 'center' },
  { title: 'Featured', key: 'featured', width: 70, align: 'center' },
  { title: 'Actions', key: 'actions', width: 80, fixed: 'right' },
];

const typeColors: Record<string, string> = {
  image: 'blue', video: 'purple', document: 'green', audio: 'orange', other: 'default',
};

const typeIcons: Record<string, any> = { image: FileImage, video: FileVideo, audio: FileAudio };
function getTypeIcon(type: string) { return typeIcons[type] || File; }

// Methods
async function loadData() {
  loading.value = true;
  try {
    const [mediaRes, statsRes] = await Promise.allSettled([
      getMedia({ page: 1, limit: 100 }),
      getMediaStats(),
    ]);
    if (mediaRes.status === 'fulfilled') {
      const res = mediaRes.value;
      mediaItems.value = Array.isArray(res) ? res : res?.data || [];
    }
    if (statsRes.status === 'fulfilled') {
      stats.value = statsRes.value;
    }
  } catch (error) {
    message.error('Failed to load media');
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  formMode.value = 'create';
  editingMedia.value = null;
  formState.value = {
    title: '', filename: '', path: '', type: 'image',
    description: '', category: '', url: '', thumbnail_url: '',
    alt_text: '', caption: '', is_public: true, is_featured: false,
  };
  showFormModal.value = true;
}

function openEdit(item: MediaItem) {
  formMode.value = 'edit';
  editingMedia.value = item;
  formState.value = {
    title: item.title, filename: item.filename, path: item.path,
    type: item.type, description: item.description || '', category: item.category || '',
    url: item.url || '', thumbnail_url: item.thumbnail_url || '',
    alt_text: item.alt_text || '', caption: item.caption || '',
    width: item.width, height: item.height,
    is_public: item.is_public, is_featured: item.is_featured,
  };
  showFormModal.value = true;
}

async function openView(item: MediaItem) {
  drawerLoading.value = true;
  showDrawer.value = true;
  try {
    const detail = await getMediaItem(item.id);
    selectedMedia.value = detail;
  } catch {
    selectedMedia.value = item;
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
    if (!data.thumbnail_url) delete data.thumbnail_url;
    if (!data.alt_text) delete data.alt_text;
    if (!data.caption) delete data.caption;
    if (formMode.value === 'create') {
      await createMedia(data);
      message.success('Media item created');
    } else if (editingMedia.value) {
      await updateMedia(editingMedia.value.id, data);
      message.success('Media item updated');
    }
    showFormModal.value = false;
    await loadData();
  } catch (error: any) {
    message.error(error?.message || 'Operation failed');
  } finally {
    formLoading.value = false;
  }
}

function handleDelete(item: MediaItem) {
  Modal.confirm({
    title: 'Delete Media',
    content: `Are you sure you want to delete "${item.title}"? This action cannot be undone.`,
    icon: h(AlertTriangle, { size: 20, class: 'text-red-500 mr-2' }),
    okText: 'Delete', okType: 'danger',
    async onOk() {
      try {
        await deleteMedia(item.id);
        message.success('Media deleted');
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

function getThumbnail(item: MediaItem) {
  return item.thumbnail_url || item.url || '';
}

watch(() => route.path, () => {
  featuredFilter.value = undefined;
  loadData();
});

onMounted(() => { loadData(); });
</script>

<template>
  <div class="media-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <Image :size="24" />
          Media Library
        </h1>
        <p class="text-gray-500 m-0">Manage images, videos, and media files</p>
      </div>
      <div class="flex items-center gap-2">
        <a-button-group>
          <a-button :type="viewMode === 'table' ? 'primary' : 'default'" @click="viewMode = 'table'">
            <List :size="14" />
          </a-button>
          <a-button :type="viewMode === 'grid' ? 'primary' : 'default'" @click="viewMode = 'grid'">
            <Grid :size="14" />
          </a-button>
        </a-button-group>
        <a-button @click="loadData" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><Plus :size="14" /></template>
          Add Media
        </a-button>
      </div>
    </div>

    <!-- Stats -->
    <a-row :gutter="[16, 16]" class="mb-6">
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-500">{{ stats.total }}</div>
            <div class="text-gray-500 text-sm">Total Media</div>
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
            <div class="text-2xl font-bold text-yellow-500">{{ stats.featured }}</div>
            <div class="text-gray-500 text-sm">Featured</div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="mb-6" size="small">
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="8">
          <a-input v-model:value="searchQuery" placeholder="Search media..." allow-clear>
            <template #prefix><Search :size="14" class="text-gray-400" /></template>
          </a-input>
        </a-col>
        <a-col :xs="24" :sm="8">
          <a-select v-model:value="typeFilter" placeholder="Filter by type" allow-clear style="width: 100%">
            <a-select-option value="image">Image</a-select-option>
            <a-select-option value="video">Video</a-select-option>
            <a-select-option value="document">Document</a-select-option>
            <a-select-option value="audio">Audio</a-select-option>
            <a-select-option value="other">Other</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="8">
          <a-select v-model:value="categoryFilter" placeholder="Filter by category" allow-clear style="width: 100%">
            <a-select-option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</a-select-option>
          </a-select>
        </a-col>
      </a-row>
    </a-card>

    <!-- Grid View -->
    <template v-if="viewMode === 'grid'">
      <a-spin :spinning="loading">
        <a-row :gutter="[16, 16]" v-if="filteredMedia.length">
          <a-col v-for="item in filteredMedia" :key="item.id" :xs="12" :sm="8" :md="6">
            <a-card hoverable class="media-grid-card" @click="openView(item)">
              <template #cover>
                <div class="h-32 bg-gray-100 flex items-center justify-center overflow-hidden">
                  <img v-if="item.type === 'image' && getThumbnail(item)" :src="getThumbnail(item)" :alt="item.alt_text || item.title" class="w-full h-full object-cover" />
                  <component v-else :is="getTypeIcon(item.type)" :size="40" class="text-gray-300" />
                </div>
              </template>
              <div class="p-2">
                <div class="font-medium text-sm truncate">{{ item.title }}</div>
                <div class="flex items-center justify-between mt-1">
                  <a-tag :color="typeColors[item.type]" size="small">{{ item.type }}</a-tag>
                  <div class="flex items-center gap-2 text-xs text-gray-400">
                    <span>{{ item.views || 0 }} views</span>
                  </div>
                </div>
              </div>
            </a-card>
          </a-col>
        </a-row>
        <a-empty v-else description="No media found" />
      </a-spin>
    </template>

    <!-- Table View -->
    <a-card v-else>
      <a-table :columns="columns" :data-source="filteredMedia" :loading="loading" :pagination="{ pageSize: 20, showSizeChanger: true }" row-key="id" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'preview'">
            <div class="w-10 h-10 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
              <img v-if="(record as MediaItem).type === 'image' && getThumbnail(record as MediaItem)" :src="getThumbnail(record as MediaItem)" class="w-full h-full object-cover" />
              <component v-else :is="getTypeIcon((record as MediaItem).type)" :size="18" class="text-gray-400" />
            </div>
          </template>
          <template v-else-if="column.key === 'title'">
            <div class="min-w-0">
              <div class="font-medium truncate">{{ (record as MediaItem).title }}</div>
              <div v-if="(record as MediaItem).description" class="text-xs text-gray-400 truncate">{{ (record as MediaItem).description }}</div>
            </div>
          </template>
          <template v-else-if="column.key === 'type'">
            <a-tag :color="typeColors[(record as MediaItem).type]">{{ (record as MediaItem).type }}</a-tag>
          </template>
          <template v-else-if="column.key === 'size'">
            <span class="text-sm">{{ formatFileSize((record as MediaItem).size) }}</span>
          </template>
          <template v-else-if="column.key === 'dimensions'">
            <span v-if="(record as MediaItem).width && (record as MediaItem).height" class="text-sm">
              {{ (record as MediaItem).width }}×{{ (record as MediaItem).height }}
            </span>
            <span v-else class="text-gray-300">-</span>
          </template>
          <template v-else-if="column.key === 'views'">
            <span class="text-sm">{{ (record as MediaItem).views || 0 }}</span>
          </template>
          <template v-else-if="column.key === 'downloads'">
            <span class="text-sm">{{ (record as MediaItem).downloads || 0 }}</span>
          </template>
          <template v-else-if="column.key === 'featured'">
            <Star v-if="(record as MediaItem).is_featured" :size="16" class="text-yellow-400" fill="currentColor" />
            <Star v-else :size="16" class="text-gray-300" />
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-dropdown>
              <a-button type="text" size="small"><MoreVertical :size="16" /></a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="view" @click="openView(record as MediaItem)"><Eye :size="14" class="mr-2" /> View</a-menu-item>
                  <a-menu-item key="edit" @click="openEdit(record as MediaItem)"><Edit3 :size="14" class="mr-2" /> Edit</a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="delete" danger @click="handleDelete(record as MediaItem)"><Trash2 :size="14" class="mr-2" /> Delete</a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Modal -->
    <a-modal v-model:open="showFormModal" :title="formMode === 'create' ? 'Add Media' : 'Edit Media'" :confirm-loading="formLoading" @ok="handleSubmit" width="600px">
      <a-form layout="vertical" class="mt-4">
        <a-form-item label="Title" required>
          <a-input v-model:value="formState.title" placeholder="Media title" />
        </a-form-item>
        <a-form-item label="Description">
          <a-textarea v-model:value="formState.description" placeholder="Description" :rows="2" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Filename">
              <a-input v-model:value="formState.filename" placeholder="image.jpg" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Type">
              <a-select v-model:value="formState.type" style="width: 100%">
                <a-select-option value="image">Image</a-select-option>
                <a-select-option value="video">Video</a-select-option>
                <a-select-option value="document">Document</a-select-option>
                <a-select-option value="audio">Audio</a-select-option>
                <a-select-option value="other">Other</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Path">
          <a-input v-model:value="formState.path" placeholder="/uploads/media/..." />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="URL">
              <a-input v-model:value="formState.url" placeholder="https://..." />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Thumbnail URL">
              <a-input v-model:value="formState.thumbnail_url" placeholder="https://..." />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Category">
              <a-input v-model:value="formState.category" placeholder="Category" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Alt Text">
              <a-input v-model:value="formState.alt_text" placeholder="Image alt text" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Caption">
          <a-input v-model:value="formState.caption" placeholder="Caption text" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="Width">
              <a-input-number v-model:value="formState.width" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Height">
              <a-input-number v-model:value="formState.height" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Options">
              <div class="flex flex-col gap-2">
                <a-switch v-model:checked="formState.is_public" checked-children="Public" un-checked-children="Private" />
                <a-switch v-model:checked="formState.is_featured" checked-children="Featured" un-checked-children="Normal" />
              </div>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- View Drawer -->
    <a-drawer v-model:open="showDrawer" :title="selectedMedia?.title || 'Media Details'" width="560" placement="right">
      <a-spin :spinning="drawerLoading">
        <template v-if="selectedMedia">
          <!-- Preview -->
          <div v-if="selectedMedia.type === 'image' && getThumbnail(selectedMedia)" class="mb-4 rounded-xl overflow-hidden bg-gray-100">
            <img :src="getThumbnail(selectedMedia)" :alt="selectedMedia.alt_text || selectedMedia.title" class="w-full max-h-64 object-contain" />
          </div>
          <div v-else class="mb-4 h-40 bg-gray-50 rounded-xl flex items-center justify-center">
            <component :is="getTypeIcon(selectedMedia.type)" :size="48" class="text-gray-300" />
          </div>

          <div class="flex items-center gap-2 mb-4">
            <a-tag :color="typeColors[selectedMedia.type]">{{ selectedMedia.type }}</a-tag>
            <a-tag v-if="selectedMedia.is_featured" color="gold"><Star :size="12" class="mr-1" fill="currentColor" /> Featured</a-tag>
            <a-tag v-if="selectedMedia.is_public" color="green"><Globe :size="12" class="mr-1" /> Public</a-tag>
            <a-tag v-else><Lock :size="12" class="mr-1" /> Private</a-tag>
          </div>

          <a-descriptions :column="1" bordered size="small" class="mb-6">
            <a-descriptions-item label="Filename">{{ selectedMedia.filename }}</a-descriptions-item>
            <a-descriptions-item label="Size">{{ formatFileSize(selectedMedia.size) }}</a-descriptions-item>
            <a-descriptions-item v-if="selectedMedia.width && selectedMedia.height" label="Dimensions">
              {{ selectedMedia.width }}×{{ selectedMedia.height }}
            </a-descriptions-item>
            <a-descriptions-item label="Category">{{ selectedMedia.category || '-' }}</a-descriptions-item>
            <a-descriptions-item label="Alt Text">{{ selectedMedia.alt_text || '-' }}</a-descriptions-item>
            <a-descriptions-item label="Caption">{{ selectedMedia.caption || '-' }}</a-descriptions-item>
            <a-descriptions-item label="Views">{{ selectedMedia.views || 0 }}</a-descriptions-item>
            <a-descriptions-item label="Downloads">{{ selectedMedia.downloads || 0 }}</a-descriptions-item>
            <a-descriptions-item label="Created">{{ formatDate(selectedMedia.created_at) }}</a-descriptions-item>
          </a-descriptions>

          <div v-if="selectedMedia.description" class="mb-6">
            <h3 class="text-sm font-semibold text-gray-500 mb-2">Description</h3>
            <div class="text-sm text-gray-700 whitespace-pre-wrap">{{ selectedMedia.description }}</div>
          </div>

          <div class="flex gap-2">
            <a-button block @click="openEdit(selectedMedia)">
              <template #icon><Edit3 :size="14" /></template>
              Edit
            </a-button>
            <a-button block danger @click="handleDelete(selectedMedia)">
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
.media-page { min-height: 100%; }
.stat-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }
.media-grid-card :deep(.ant-card-body) { padding: 0; }
:deep(.ant-descriptions-item-label) { font-weight: 500; color: #6b7280; }
</style>
