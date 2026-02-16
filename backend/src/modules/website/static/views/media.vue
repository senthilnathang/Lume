<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { message } from 'ant-design-vue';
import { Image, Plus, Edit, Trash2, Search, RefreshCw, FileText, PlayCircle, Music2, File } from 'lucide-vue-next';
import { get, put, del } from '@/api/request';

defineOptions({ name: 'WebsiteMedia' });

const loading = ref(false);
const saving = ref(false);
const uploadModalVisible = ref(false);
const editModalVisible = ref(false);
const editingMedia = ref<any>(null);
const mediaList = ref<any[]>([]);
const searchText = ref('');
const folderFilter = ref<string | null>(null);

const editForm = reactive({
  altText: '',
  caption: '',
  folder: 'general',
});

const folders = ['general', 'pages', 'blog', 'uploads', 'avatars'];

const filteredMedia = computed(() => {
  return mediaList.value.filter((item: any) => {
    const matchesSearch = !searchText.value ||
      item.filename?.toLowerCase().includes(searchText.value.toLowerCase()) ||
      item.originalName?.toLowerCase().includes(searchText.value.toLowerCase());
    const matchesFolder = !folderFilter.value || item.folder === folderFilter.value;
    return matchesSearch && matchesFolder;
  });
});

function isImage(mime: string): boolean {
  return mime?.startsWith('image/') || false;
}

function isVideo(mime: string): boolean {
  return mime?.startsWith('video/') || false;
}

function isAudio(mime: string): boolean {
  return mime?.startsWith('audio/') || false;
}

function getFileIcon(mime: string) {
  if (isImage(mime)) return Image;
  if (isVideo(mime)) return PlayCircle;
  if (isAudio(mime)) return Music2;
  if (mime?.includes('pdf') || mime?.includes('document') || mime?.includes('text')) return FileText;
  return File;
}

function formatSize(bytes: number): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function loadMedia() {
  loading.value = true;
  try {
    const data = await get('/website/media');
    mediaList.value = Array.isArray(data) ? data : data?.rows || data?.data || [];
  } catch (err: any) {
    message.error('Failed to load media');
  } finally {
    loading.value = false;
  }
}

function openUploadModal() {
  uploadModalVisible.value = true;
}

function closeUploadModal() {
  uploadModalVisible.value = false;
}

function openEditModal(item: any) {
  editingMedia.value = item;
  Object.assign(editForm, {
    altText: item.altText || '',
    caption: item.caption || '',
    folder: item.folder || 'general',
  });
  editModalVisible.value = true;
}

function closeEditModal() {
  editModalVisible.value = false;
  editingMedia.value = null;
}

async function handleSaveEdit() {
  if (!editingMedia.value) return;
  saving.value = true;
  try {
    await put(`/website/media/${editingMedia.value.id}`, { ...editForm });
    message.success('Media updated');
    closeEditModal();
    await loadMedia();
  } catch (err: any) {
    message.error(err?.message || 'Failed to update media');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(item: any) {
  try {
    await del(`/website/media/${item.id}`);
    message.success('Media deleted');
    await loadMedia();
  } catch (err: any) {
    message.error(err?.message || 'Failed to delete media');
  }
}

function handleUploadChange(info: any) {
  if (info.file.status === 'done') {
    message.success(`${info.file.name} uploaded successfully`);
    loadMedia();
  } else if (info.file.status === 'error') {
    message.error(`${info.file.name} upload failed`);
  }
}

function getUploadHeaders() {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

onMounted(() => {
  loadMedia();
});
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <Image :size="20" class="text-green-600" />
        </div>
        <div>
          <h1 class="text-xl font-semibold m-0">Media Library</h1>
          <p class="text-sm text-gray-500 m-0">Upload and manage media files</p>
        </div>
      </div>
      <a-button type="primary" @click="openUploadModal">
        <template #icon><Plus :size="16" /></template>
        Upload
      </a-button>
    </div>

    <!-- Filter Bar -->
    <a-card class="mb-6">
      <div class="flex flex-wrap items-center gap-3">
        <a-input
          v-model:value="searchText"
          placeholder="Search media..."
          style="width: 260px"
          allow-clear
        >
          <template #prefix><Search :size="16" class="text-gray-400" /></template>
        </a-input>
        <a-select
          v-model:value="folderFilter"
          placeholder="All Folders"
          style="width: 160px"
          allow-clear
        >
          <a-select-option v-for="f in folders" :key="f" :value="f">
            {{ f.charAt(0).toUpperCase() + f.slice(1) }}
          </a-select-option>
        </a-select>
        <a-tooltip title="Refresh">
          <a-button @click="loadMedia">
            <template #icon><RefreshCw :size="16" /></template>
          </a-button>
        </a-tooltip>
        <span class="text-sm text-gray-500 ml-auto">
          {{ filteredMedia.length }} file{{ filteredMedia.length !== 1 ? 's' : '' }}
        </span>
      </div>
    </a-card>

    <!-- Media Grid -->
    <a-spin :spinning="loading">
      <div v-if="filteredMedia.length === 0 && !loading" class="py-12">
        <a-empty description="No media files found" />
      </div>
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        <div
          v-for="item in filteredMedia"
          :key="item.id"
          class="group border rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow cursor-pointer"
          @click="openEditModal(item)"
        >
          <!-- Thumbnail -->
          <div class="relative aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
            <img
              v-if="isImage(item.mimeType) && (item.url || item.path)"
              :src="item.url || item.path"
              :alt="item.altText || item.filename"
              class="w-full h-full object-cover"
            />
            <component
              v-else
              :is="getFileIcon(item.mimeType)"
              :size="36"
              class="text-gray-400"
            />
            <!-- Hover overlay -->
            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div class="flex gap-2">
                <a-button type="primary" size="small" shape="circle" @click.stop="openEditModal(item)">
                  <template #icon><Edit :size="14" /></template>
                </a-button>
                <a-popconfirm
                  title="Delete this file?"
                  ok-text="Delete"
                  ok-type="danger"
                  @confirm="handleDelete(item)"
                >
                  <a-button type="primary" size="small" shape="circle" danger @click.stop>
                    <template #icon><Trash2 :size="14" /></template>
                  </a-button>
                </a-popconfirm>
              </div>
            </div>
          </div>
          <!-- Info -->
          <div class="p-2">
            <p class="text-xs font-medium truncate m-0" :title="item.originalName || item.filename">
              {{ item.originalName || item.filename }}
            </p>
            <p class="text-xs text-gray-400 m-0">{{ formatSize(item.size) }}</p>
          </div>
        </div>
      </div>
    </a-spin>

    <!-- Upload Modal -->
    <a-modal
      v-model:open="uploadModalVisible"
      title="Upload Media"
      :footer="null"
      width="520px"
    >
      <a-upload-dragger
        name="file"
        action="/api/website/media"
        :headers="getUploadHeaders()"
        :multiple="true"
        @change="handleUploadChange"
      >
        <div class="py-6">
          <Image :size="40" class="text-gray-400 mx-auto mb-3" />
          <p class="text-base m-0">Click or drag files to upload</p>
          <p class="text-sm text-gray-400 m-0 mt-1">Supports images, documents, videos, and other files</p>
        </div>
      </a-upload-dragger>
      <div class="mt-4 flex justify-end">
        <a-button @click="closeUploadModal">Close</a-button>
      </div>
    </a-modal>

    <!-- Edit Modal -->
    <a-modal
      v-model:open="editModalVisible"
      title="Edit Media"
      @ok="handleSaveEdit"
      :confirm-loading="saving"
      width="520px"
    >
      <div v-if="editingMedia" class="mb-4">
        <div class="rounded-lg border overflow-hidden bg-gray-50 mb-4">
          <img
            v-if="isImage(editingMedia.mimeType) && (editingMedia.url || editingMedia.path)"
            :src="editingMedia.url || editingMedia.path"
            :alt="editingMedia.altText || editingMedia.filename"
            class="w-full max-h-48 object-contain"
          />
          <div v-else class="py-8 flex flex-col items-center justify-center">
            <component :is="getFileIcon(editingMedia.mimeType)" :size="48" class="text-gray-400" />
            <p class="text-sm text-gray-500 mt-2 m-0">{{ editingMedia.originalName || editingMedia.filename }}</p>
          </div>
        </div>
        <div class="text-xs text-gray-400 mb-4 flex gap-4">
          <span>Size: {{ formatSize(editingMedia.size) }}</span>
          <span v-if="editingMedia.width">{{ editingMedia.width }} x {{ editingMedia.height }}px</span>
          <span>{{ editingMedia.mimeType }}</span>
        </div>
      </div>

      <a-form layout="vertical">
        <a-form-item label="Alt Text">
          <a-input v-model:value="editForm.altText" placeholder="Descriptive text for accessibility" />
        </a-form-item>
        <a-form-item label="Caption">
          <a-textarea v-model:value="editForm.caption" placeholder="Optional caption" :rows="2" />
        </a-form-item>
        <a-form-item label="Folder">
          <a-select v-model:value="editForm.folder">
            <a-select-option v-for="f in folders" :key="f" :value="f">
              {{ f.charAt(0).toUpperCase() + f.slice(1) }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.aspect-square {
  aspect-ratio: 1 / 1;
}
</style>
