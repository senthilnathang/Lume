<script lang="ts" setup>
/**
 * AttachmentUploader Component
 *
 * Drag-and-drop file upload with progress indication.
 * Supports uploading to the attachments API.
 */
import { ref, computed } from 'vue';

import { Upload, Button, Progress, message as antMessage } from 'ant-design-vue';
import type { UploadChangeParam, UploadFile } from 'ant-design-vue';
import {
  PlusOutlined,
  DeleteOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons-vue';

import { useAccessStore } from '@vben/stores';
import type { Attachment } from './AttachmentList.vue';

// Props
interface Props {
  /** Upload action URL (defaults to /api/v1/attachments/upload) */
  action?: string;
  /** Entity type to attach to (e.g., 'messages', 'inbox_items') */
  attachableType?: string;
  /** Entity ID to attach to */
  attachableId?: number;
  /** Already uploaded attachments */
  modelValue?: Attachment[];
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Maximum number of files */
  maxCount?: number;
  /** Accepted file types (e.g., 'image/*,.pdf') */
  accept?: string;
  /** Show as compact button */
  compact?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Custom headers for upload request */
  headers?: Record<string, string>;
  /** Additional form data */
  data?: Record<string, string>;
  /** Enable multiple file selection */
  multiple?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  action: '/api/v1/attachments/upload',
  attachableType: 'messages',
  attachableId: 0,
  modelValue: () => [],
  maxSize: 10 * 1024 * 1024, // 10MB
  maxCount: 10,
  accept: '',
  compact: false,
  disabled: false,
  headers: () => ({}),
  data: () => ({}),
  multiple: true,
});

// Get auth token for headers
const accessStore = useAccessStore();
const authHeaders = computed(() => ({
  Authorization: `Bearer ${accessStore.accessToken}`,
  ...props.headers,
}));

// Build form data with attachable info
const formData = computed(() => ({
  attachable_type: props.attachableType,
  attachable_id: String(props.attachableId),
  ...props.data,
}));

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: Attachment[]): void;
  (e: 'upload', file: Attachment): void;
  (e: 'remove', index: number): void;
  (e: 'error', error: Error, file: UploadFile): void;
}>();

// State
const fileList = ref<UploadFile[]>([]);
const uploading = ref(false);
const dragOver = ref(false);

// Computed
const canUpload = computed(() => {
  return !props.disabled && props.modelValue.length < props.maxCount;
});

const remainingSlots = computed(() => {
  return props.maxCount - props.modelValue.length;
});

const formattedMaxSize = computed(() => {
  const mb = props.maxSize / (1024 * 1024);
  return `${mb}MB`;
});

// Methods
function beforeUpload(file: File): boolean | Promise<boolean> {
  // Check file size
  if (file.size > props.maxSize) {
    antMessage.error(`File "${file.name}" exceeds maximum size of ${formattedMaxSize.value}`);
    return false;
  }

  // Check file count
  if (props.modelValue.length >= props.maxCount) {
    antMessage.error(`Maximum ${props.maxCount} files allowed`);
    return false;
  }

  return true;
}

function handleChange(info: UploadChangeParam) {
  const { file, fileList: newFileList } = info;

  fileList.value = newFileList;

  if (file.status === 'uploading') {
    uploading.value = true;
  }

  if (file.status === 'done') {
    uploading.value = false;

    // Assuming the response contains the attachment data
    const response = file.response as Attachment | { attachment: Attachment };
    const attachment = 'attachment' in response ? response.attachment : response;

    if (attachment) {
      const newAttachments = [...props.modelValue, attachment];
      emit('update:modelValue', newAttachments);
      emit('upload', attachment);
      antMessage.success(`${file.name} uploaded successfully`);
    }

    // Remove from file list after processing
    fileList.value = fileList.value.filter((f) => f.uid !== file.uid);
  }

  if (file.status === 'error') {
    uploading.value = false;
    antMessage.error(`${file.name} upload failed`);
    emit('error', new Error('Upload failed'), file);

    // Remove failed file from list
    fileList.value = fileList.value.filter((f) => f.uid !== file.uid);
  }
}

function handleRemove(index: number) {
  const newAttachments = [...props.modelValue];
  newAttachments.splice(index, 1);
  emit('update:modelValue', newAttachments);
  emit('remove', index);
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  if (!props.disabled) {
    dragOver.value = true;
  }
}

function handleDragLeave() {
  dragOver.value = false;
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  dragOver.value = false;
  // Files will be handled by the Upload component
}
</script>

<template>
  <div class="attachment-uploader">
    <!-- Compact mode: Button only -->
    <Upload
      v-if="compact"
      :action="action"
      :headers="authHeaders"
      :data="formData"
      :multiple="multiple"
      :accept="accept"
      :disabled="!canUpload"
      :before-upload="beforeUpload"
      :show-upload-list="false"
      @change="handleChange"
    >
      <Button
        :disabled="!canUpload"
        :loading="uploading"
      >
        <template #icon>
          <PlusOutlined />
        </template>
        Attach
        <span v-if="modelValue.length > 0" class="attachment-count">
          ({{ modelValue.length }})
        </span>
      </Button>
    </Upload>

    <!-- Full mode: Drag and drop area -->
    <div
      v-else
      :class="[
        'upload-area',
        {
          'upload-area--disabled': !canUpload,
          'upload-area--drag-over': dragOver,
        },
      ]"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <Upload.Dragger
        :action="action"
        :headers="authHeaders"
        :data="formData"
        :multiple="multiple"
        :accept="accept"
        :disabled="!canUpload"
        :before-upload="beforeUpload"
        :show-upload-list="false"
        @change="handleChange"
      >
        <div class="upload-content">
          <p class="upload-icon">
            <CloudUploadOutlined />
          </p>
          <p class="upload-text">
            Drag files here or click to upload
          </p>
          <p class="upload-hint">
            Max {{ formattedMaxSize }} per file, up to {{ remainingSlots }} more files
          </p>
        </div>
      </Upload.Dragger>
    </div>

    <!-- Uploading files progress -->
    <div v-if="fileList.length > 0" class="upload-progress-list">
      <div
        v-for="file in fileList"
        :key="file.uid"
        class="upload-progress-item"
      >
        <span class="file-name">{{ file.name }}</span>
        <Progress
          :percent="file.percent || 0"
          :status="file.status === 'error' ? 'exception' : 'active'"
          size="small"
        />
      </div>
    </div>

    <!-- Uploaded files list (compact preview) -->
    <div v-if="modelValue.length > 0 && compact" class="uploaded-files">
      <div
        v-for="(attachment, index) in modelValue"
        :key="index"
        class="uploaded-file"
      >
        <span class="uploaded-name">{{ attachment.filename }}</span>
        <Button
          type="text"
          size="small"
          danger
          @click="handleRemove(index)"
        >
          <template #icon>
            <DeleteOutlined />
          </template>
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.attachment-uploader {
  width: 100%;
}

.upload-area {
  border-radius: 8px;
  transition: all 0.2s;
}

.upload-area--disabled {
  opacity: 0.5;
  pointer-events: none;
}

.upload-area--drag-over :deep(.ant-upload-drag) {
  border-color: var(--ant-color-primary);
  background: var(--ant-color-primary-bg);
}

.upload-content {
  padding: 20px;
  text-align: center;
}

.upload-icon {
  margin-bottom: 12px;
  font-size: 48px;
  color: var(--ant-color-primary);
}

.upload-text {
  margin-bottom: 4px;
  font-size: 16px;
  color: var(--ant-color-text);
}

.upload-hint {
  font-size: 12px;
  color: var(--ant-color-text-secondary);
}

.upload-progress-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-progress-item {
  padding: 8px 12px;
  border: 1px solid var(--ant-color-border);
  border-radius: 6px;
  background: var(--ant-color-bg-container);
}

.upload-progress-item .file-name {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uploaded-files {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.uploaded-file {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid var(--ant-color-border);
  border-radius: 6px;
  background: var(--ant-color-bg-container);
  font-size: 12px;
}

.uploaded-name {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-count {
  margin-left: 4px;
  color: var(--ant-color-text-secondary);
}
</style>
