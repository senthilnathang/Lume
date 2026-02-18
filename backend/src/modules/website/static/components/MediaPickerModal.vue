<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { message } from 'ant-design-vue';
import { Upload, Image as ImageIcon, Search, Check, Trash2, X } from 'lucide-vue-next';
import { getMediaList, uploadMedia, deleteMedia } from '../api/index';

const props = defineProps<{
  open: boolean;
  multiple?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'select', urls: string[]): void;
}>();

const activeTab = ref<'library' | 'upload'>('library');
const loading = ref(false);
const uploading = ref(false);
const mediaItems = ref<any[]>([]);
const selectedIds = ref<Set<number>>(new Set());
const searchQuery = ref('');
const page = ref(1);
const total = ref(0);

async function loadMedia() {
  loading.value = true;
  try {
    const result = await getMediaList({
      page: page.value,
      limit: 24,
      search: searchQuery.value || undefined,
      mimeType: 'image',
    });
    mediaItems.value = result.data || result || [];
    total.value = result.pagination?.total || result.total || 0;
  } catch {
    message.error('Failed to load media');
  } finally {
    loading.value = false;
  }
}

function toggleSelect(item: any) {
  if (props.multiple) {
    if (selectedIds.value.has(item.id)) {
      selectedIds.value.delete(item.id);
    } else {
      selectedIds.value.add(item.id);
    }
  } else {
    selectedIds.value = new Set([item.id]);
  }
}

function isSelected(id: number) {
  return selectedIds.value.has(id);
}

function getItemUrl(item: any): string {
  return item.url || `/uploads/${item.path}`;
}

function confirm() {
  const selected = mediaItems.value.filter(m => selectedIds.value.has(m.id));
  const urls = selected.map(m => getItemUrl(m));
  emit('select', urls);
  close();
}

function close() {
  emit('update:open', false);
  selectedIds.value = new Set();
}

async function handleUpload(info: any) {
  const file = info.file;
  if (!file) return;
  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', file);
    const result = await uploadMedia(formData);
    message.success('File uploaded');
    // Auto-select the newly uploaded file
    if (result?.id) {
      await loadMedia();
      selectedIds.value = new Set([result.id]);
    } else {
      await loadMedia();
    }
    activeTab.value = 'library';
  } catch (err: any) {
    message.error(err?.message || 'Upload failed');
  } finally {
    uploading.value = false;
  }
}

watch(() => props.open, (val) => {
  if (val) {
    page.value = 1;
    searchQuery.value = '';
    selectedIds.value = new Set();
    loadMedia();
  }
});

watch(searchQuery, () => {
  page.value = 1;
  loadMedia();
});
</script>

<template>
  <a-modal
    :open="open"
    title="Media Library"
    :width="800"
    :footer="null"
    @cancel="close"
  >
    <!-- Tabs -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex gap-1 bg-gray-100 rounded-lg p-1">
        <button
          :class="['tab-btn', activeTab === 'library' && 'active']"
          @click="activeTab = 'library'"
        >
          <ImageIcon :size="14" />
          Library
        </button>
        <button
          :class="['tab-btn', activeTab === 'upload' && 'active']"
          @click="activeTab = 'upload'"
        >
          <Upload :size="14" />
          Upload
        </button>
      </div>

      <div v-if="activeTab === 'library'" class="flex items-center gap-2">
        <a-input
          v-model:value="searchQuery"
          placeholder="Search media..."
          size="small"
          style="width: 200px;"
          allow-clear
        >
          <template #prefix><Search :size="14" class="text-gray-400" /></template>
        </a-input>
      </div>
    </div>

    <!-- Upload Tab -->
    <div v-if="activeTab === 'upload'" class="py-8">
      <a-upload-dragger
        :before-upload="() => false"
        :show-upload-list="false"
        accept="image/*,video/*,audio/*,application/pdf"
        :multiple="false"
        @change="handleUpload"
      >
        <div class="py-8 text-center">
          <Upload :size="40" class="text-gray-400 mx-auto mb-3" />
          <p class="text-gray-600 mb-1">Click or drag files here to upload</p>
          <p class="text-gray-400 text-xs">Images, videos, PDFs up to {{ Math.round(parseInt('10485760') / 1024 / 1024) }}MB</p>
        </div>
      </a-upload-dragger>
    </div>

    <!-- Library Tab -->
    <div v-else>
      <a-spin :spinning="loading">
        <div v-if="!mediaItems.length && !loading" class="text-center py-12 text-gray-400">
          <ImageIcon :size="40" class="mx-auto mb-2 opacity-50" />
          <p class="text-sm">No media files found</p>
        </div>

        <div v-else class="media-grid">
          <div
            v-for="item in mediaItems"
            :key="item.id"
            class="media-item"
            :class="{ selected: isSelected(item.id) }"
            @click="toggleSelect(item)"
          >
            <div class="media-thumb">
              <img
                v-if="item.mimeType?.startsWith('image/')"
                :src="getItemUrl(item)"
                :alt="item.originalName"
                class="w-full h-full object-cover"
              />
              <div v-else class="flex items-center justify-center h-full bg-gray-100 text-gray-400">
                <ImageIcon :size="24" />
              </div>
              <div v-if="isSelected(item.id)" class="selected-badge">
                <Check :size="14" class="text-white" />
              </div>
            </div>
            <div class="media-name">{{ item.originalName || item.filename }}</div>
          </div>
        </div>

        <div v-if="total > 24" class="mt-4 text-center">
          <a-pagination
            v-model:current="page"
            :total="total"
            :pageSize="24"
            size="small"
            @change="loadMedia"
          />
        </div>
      </a-spin>

      <!-- Footer actions -->
      <div class="flex items-center justify-between mt-4 pt-4 border-t">
        <span class="text-sm text-gray-500">{{ selectedIds.size }} selected</span>
        <div class="flex gap-2">
          <a-button @click="close">Cancel</a-button>
          <a-button type="primary" :disabled="!selectedIds.size" @click="confirm">
            Insert Selected
          </a-button>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  transition: all 0.15s;
}
.tab-btn.active {
  background: white;
  color: #1f2937;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.media-item {
  cursor: pointer;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.15s;
  overflow: hidden;
}
.media-item:hover {
  border-color: #d1d5db;
}
.media-item.selected {
  border-color: #1677ff;
}

.media-thumb {
  position: relative;
  width: 100%;
  padding-top: 100%;
  overflow: hidden;
  background: #f3f4f6;
  border-radius: 6px;
}
.media-thumb > img,
.media-thumb > div {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.selected-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #1677ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-name {
  padding: 4px 2px;
  font-size: 11px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
