<script lang="ts" setup>
/**
 * FilePreview Component
 *
 * Displays a file preview with icon based on mime type.
 */
import { computed } from 'vue';

import { Button, Tooltip, Typography } from 'ant-design-vue';
import {
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileZipOutlined,
  FileImageOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  SoundOutlined,
  CodeOutlined,
  DownloadOutlined,
  EyeOutlined,
  DeleteOutlined,
} from '@ant-design/icons-vue';

// Props
interface Props {
  /** File URL */
  url: string;
  /** File name */
  filename: string;
  /** MIME type */
  mimeType?: string;
  /** File size in bytes */
  size?: number;
  /** Show remove button */
  showRemove?: boolean;
  /** Show preview button (for supported types) */
  showPreview?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  mimeType: 'application/octet-stream',
  size: 0,
  showRemove: false,
  showPreview: true,
  compact: false,
  disabled: false,
});

// Emits
const emit = defineEmits<{
  (e: 'remove'): void;
  (e: 'preview'): void;
}>();

// File icon mapping
const fileIcons: Record<string, any> = {
  // Documents
  'application/pdf': FilePdfOutlined,
  'application/msword': FileWordOutlined,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileWordOutlined,
  'application/vnd.ms-excel': FileExcelOutlined,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileExcelOutlined,
  'application/vnd.ms-powerpoint': FilePptOutlined,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': FilePptOutlined,
  // Archives
  'application/zip': FileZipOutlined,
  'application/x-rar-compressed': FileZipOutlined,
  'application/x-7z-compressed': FileZipOutlined,
  'application/gzip': FileZipOutlined,
  'application/x-tar': FileZipOutlined,
  // Text
  'text/plain': FileTextOutlined,
  'text/csv': FileExcelOutlined,
  'text/markdown': FileTextOutlined,
  // Code
  'text/javascript': CodeOutlined,
  'text/typescript': CodeOutlined,
  'application/json': CodeOutlined,
  'text/html': CodeOutlined,
  'text/css': CodeOutlined,
  'text/xml': CodeOutlined,
  'application/xml': CodeOutlined,
};

// File color mapping
const fileColors: Record<string, string> = {
  'application/pdf': '#ff4d4f',
  'application/msword': '#1890ff',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '#1890ff',
  'application/vnd.ms-excel': '#52c41a',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '#52c41a',
  'application/vnd.ms-powerpoint': '#fa8c16',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '#fa8c16',
  'application/zip': '#722ed1',
  'image': '#13c2c2',
  'video': '#eb2f96',
  'audio': '#faad14',
};

// Computed
const fileIcon = computed(() => {
  // Check exact mime type first
  if (fileIcons[props.mimeType]) {
    return fileIcons[props.mimeType];
  }

  // Check type category
  const type = props.mimeType.split('/')[0];
  switch (type) {
    case 'image':
      return FileImageOutlined;
    case 'video':
      return VideoCameraOutlined;
    case 'audio':
      return SoundOutlined;
    case 'text':
      return FileTextOutlined;
    default:
      return FileOutlined;
  }
});

const iconColor = computed(() => {
  // Check exact mime type first
  if (fileColors[props.mimeType]) {
    return fileColors[props.mimeType];
  }

  // Check type category
  const type = props.mimeType.split('/')[0]!;
  if (fileColors[type]) {
    return fileColors[type]!;
  }

  return '#8c8c8c';
});

const formattedSize = computed(() => {
  if (!props.size) return '';

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = props.size;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
});

const fileExtension = computed(() => {
  const parts = props.filename.split('.');
  return parts.length > 1 ? (parts.pop()?.toUpperCase() ?? '') : '';
});

const canPreview = computed(() => {
  if (!props.showPreview) return false;
  const type = props.mimeType.split('/')[0]!;
  return ['image', 'video', 'audio'].includes(type) || props.mimeType === 'application/pdf';
});

// Methods
function downloadFile() {
  const link = document.createElement('a');
  link.href = props.url;
  link.download = props.filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function handlePreview() {
  emit('preview');
}

function handleRemove() {
  emit('remove');
}
</script>

<template>
  <div :class="['file-preview', { 'file-preview--compact': compact }]">
    <!-- File Icon -->
    <div class="file-icon" :style="{ color: iconColor }">
      <component :is="fileIcon" />
      <span v-if="fileExtension && !compact" class="file-ext">{{ fileExtension }}</span>
    </div>

    <!-- File Info -->
    <div class="file-info">
      <Tooltip :title="filename">
        <Typography.Text class="file-name" ellipsis>
          {{ filename }}
        </Typography.Text>
      </Tooltip>
      <Typography.Text v-if="formattedSize && !compact" type="secondary" class="file-size">
        {{ formattedSize }}
      </Typography.Text>
    </div>

    <!-- Actions -->
    <div class="file-actions">
      <Tooltip v-if="canPreview" title="Preview">
        <Button
          type="text"
          size="small"
          :disabled="disabled"
          @click="handlePreview"
        >
          <template #icon>
            <EyeOutlined />
          </template>
        </Button>
      </Tooltip>

      <Tooltip title="Download">
        <Button
          type="text"
          size="small"
          :disabled="disabled"
          @click="downloadFile"
        >
          <template #icon>
            <DownloadOutlined />
          </template>
        </Button>
      </Tooltip>

      <Tooltip v-if="showRemove" title="Remove">
        <Button
          type="text"
          size="small"
          danger
          :disabled="disabled"
          @click="handleRemove"
        >
          <template #icon>
            <DeleteOutlined />
          </template>
        </Button>
      </Tooltip>
    </div>
  </div>
</template>

<style scoped>
.file-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid var(--ant-color-border);
  border-radius: 8px;
  background: var(--ant-color-bg-container);
  transition: all 0.2s;
}

.file-preview:hover {
  border-color: var(--ant-color-primary-border);
  background: var(--ant-color-primary-bg);
}

.file-preview--compact {
  padding: 4px 8px;
  gap: 8px;
}

.file-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 24px;
  flex-shrink: 0;
}

.file-preview--compact .file-icon {
  width: 28px;
  height: 28px;
  font-size: 18px;
}

.file-ext {
  position: absolute;
  bottom: -4px;
  right: -4px;
  font-size: 9px;
  font-weight: 600;
  padding: 1px 3px;
  border-radius: 3px;
  background: var(--ant-color-bg-spotlight);
  color: var(--ant-color-text);
}

.file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.file-name {
  font-weight: 500;
  line-height: 1.4;
}

.file-size {
  font-size: 12px;
  line-height: 1.2;
}

.file-preview--compact .file-info {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.file-preview--compact .file-size {
  flex-shrink: 0;
}

.file-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
</style>
