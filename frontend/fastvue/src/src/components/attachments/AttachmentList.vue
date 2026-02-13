<script lang="ts" setup>
/**
 * AttachmentList Component
 *
 * Displays a list of attachments with appropriate previews based on file type.
 */
import { computed, ref } from 'vue';

import { Empty, Modal } from 'ant-design-vue';

import ImagePreview from './ImagePreview.vue';
import FilePreview from './FilePreview.vue';

// Types
export interface Attachment {
  filename: string;
  url: string;
  mime_type: string;
  size?: number;
  uploaded_at?: string;
}

// Props
interface Props {
  /** List of attachments */
  attachments: Attachment[];
  /** Allow removing attachments */
  editable?: boolean;
  /** Show as grid layout */
  gridLayout?: boolean;
  /** Maximum items to show before "show more" */
  maxVisible?: number;
  /** Compact mode */
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  editable: false,
  gridLayout: false,
  maxVisible: 5,
  compact: false,
});

// Emits
const emit = defineEmits<{
  (e: 'remove', index: number): void;
}>();

// State
const showAll = ref(false);
const previewModal = ref({
  visible: false,
  url: '',
  type: '',
  filename: '',
});

// Computed
const visibleAttachments = computed(() => {
  if (showAll.value || props.attachments.length <= props.maxVisible) {
    return props.attachments;
  }
  return props.attachments.slice(0, props.maxVisible);
});

const hiddenCount = computed(() => {
  if (showAll.value) return 0;
  return Math.max(0, props.attachments.length - props.maxVisible);
});

const imageAttachments = computed(() =>
  props.attachments.filter((a) => a.mime_type.startsWith('image/')),
);

const fileAttachments = computed(() =>
  props.attachments.filter((a) => !a.mime_type.startsWith('image/')),
);

// Methods
function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function handleRemove(index: number) {
  emit('remove', index);
}

function openPreview(attachment: Attachment) {
  previewModal.value = {
    visible: true,
    url: attachment.url,
    type: attachment.mime_type,
    filename: attachment.filename,
  };
}

function closePreview() {
  previewModal.value.visible = false;
}

function toggleShowAll() {
  showAll.value = !showAll.value;
}
</script>

<template>
  <div class="attachment-list">
    <!-- Empty state -->
    <Empty
      v-if="attachments.length === 0"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
      description="No attachments"
    />

    <!-- Grid layout for images -->
    <div v-else-if="gridLayout" class="attachment-grid">
      <!-- Images -->
      <div v-if="imageAttachments.length > 0" class="image-grid">
        <ImagePreview
          v-for="(attachment, index) in imageAttachments"
          :key="`img-${index}`"
          :src="attachment.url"
          :filename="attachment.filename"
          :alt="attachment.filename"
          :width="120"
          :height="120"
          :show-download="true"
        />
      </div>

      <!-- Files -->
      <div v-if="fileAttachments.length > 0" class="file-list">
        <FilePreview
          v-for="(attachment, index) in fileAttachments"
          :key="`file-${index}`"
          :url="attachment.url"
          :filename="attachment.filename"
          :mime-type="attachment.mime_type"
          :size="attachment.size"
          :show-remove="editable"
          :compact="compact"
          @remove="handleRemove(attachments.indexOf(attachment))"
          @preview="openPreview(attachment)"
        />
      </div>
    </div>

    <!-- List layout -->
    <div v-else class="attachment-items">
      <template v-for="(attachment, index) in visibleAttachments" :key="index">
        <!-- Image attachment -->
        <div v-if="isImage(attachment.mime_type)" class="attachment-item attachment-item--image">
          <ImagePreview
            :src="attachment.url"
            :filename="attachment.filename"
            :alt="attachment.filename"
            :width="compact ? 60 : 80"
            :height="compact ? 60 : 80"
            :show-download="true"
          />
          <div class="image-info">
            <span class="image-name">{{ attachment.filename }}</span>
            <span v-if="attachment.size" class="image-size">
              {{ formatSize(attachment.size) }}
            </span>
          </div>
        </div>

        <!-- File attachment -->
        <FilePreview
          v-else
          :url="attachment.url"
          :filename="attachment.filename"
          :mime-type="attachment.mime_type"
          :size="attachment.size"
          :show-remove="editable"
          :compact="compact"
          @remove="handleRemove(index)"
          @preview="openPreview(attachment)"
        />
      </template>

      <!-- Show more button -->
      <button
        v-if="hiddenCount > 0"
        class="show-more-btn"
        @click="toggleShowAll"
      >
        + {{ hiddenCount }} more
      </button>

      <!-- Show less button -->
      <button
        v-if="showAll && attachments.length > maxVisible"
        class="show-more-btn"
        @click="toggleShowAll"
      >
        Show less
      </button>
    </div>

    <!-- Preview Modal for non-image files -->
    <Modal
      v-model:open="previewModal.visible"
      :title="previewModal.filename"
      :footer="null"
      width="80%"
      centered
      @cancel="closePreview"
    >
      <div class="preview-content">
        <!-- PDF Preview -->
        <iframe
          v-if="previewModal.type === 'application/pdf'"
          :src="previewModal.url"
          class="pdf-preview"
        />

        <!-- Video Preview -->
        <video
          v-else-if="previewModal.type.startsWith('video/')"
          :src="previewModal.url"
          controls
          class="video-preview"
        />

        <!-- Audio Preview -->
        <audio
          v-else-if="previewModal.type.startsWith('audio/')"
          :src="previewModal.url"
          controls
          class="audio-preview"
        />

        <!-- Unsupported type -->
        <div v-else class="unsupported-preview">
          <p>Preview not available for this file type.</p>
          <a :href="previewModal.url" target="_blank" download>Download file</a>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script lang="ts">
// Helper function for formatting file size
function formatSize(bytes: number): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}
</script>

<style scoped>
.attachment-list {
  width: 100%;
}

.attachment-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-item--image {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border: 1px solid var(--ant-color-border);
  border-radius: 8px;
  background: var(--ant-color-bg-container);
}

.image-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.image-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-size {
  font-size: 12px;
  color: var(--ant-color-text-secondary);
}

.show-more-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border: 1px dashed var(--ant-color-border);
  border-radius: 8px;
  background: transparent;
  color: var(--ant-color-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.show-more-btn:hover {
  border-color: var(--ant-color-primary);
  background: var(--ant-color-primary-bg);
}

.preview-content {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.pdf-preview {
  width: 100%;
  height: 600px;
  border: none;
  border-radius: 8px;
}

.video-preview {
  max-width: 100%;
  max-height: 500px;
  border-radius: 8px;
}

.audio-preview {
  width: 100%;
}

.unsupported-preview {
  text-align: center;
  padding: 40px;
}

.unsupported-preview a {
  color: var(--ant-color-primary);
}
</style>
