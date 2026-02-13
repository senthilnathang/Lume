<script lang="ts" setup>
/**
 * ImagePreview Component
 *
 * Displays an image thumbnail with lightbox preview on click.
 */
import { ref } from 'vue';

import { Modal } from 'ant-design-vue';
import {
  DownloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  RotateLeftOutlined,
  RotateRightOutlined,
  CloseOutlined,
} from '@ant-design/icons-vue';

// Props
interface Props {
  /** Image URL */
  src: string;
  /** Alt text */
  alt?: string;
  /** Image filename */
  filename?: string;
  /** Thumbnail width */
  width?: number | string;
  /** Thumbnail height */
  height?: number | string;
  /** Show download button */
  showDownload?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  alt: 'Image preview',
  filename: 'image',
  width: 120,
  height: 120,
  showDownload: true,
  disabled: false,
});

// State
const visible = ref(false);
const scale = ref(1);
const rotate = ref(0);

// Methods
function openPreview() {
  if (props.disabled) return;
  visible.value = true;
  scale.value = 1;
  rotate.value = 0;
}

function closePreview() {
  visible.value = false;
}

function zoomIn() {
  scale.value = Math.min(scale.value + 0.25, 3);
}

function zoomOut() {
  scale.value = Math.max(scale.value - 0.25, 0.25);
}

function rotateLeft() {
  rotate.value -= 90;
}

function rotateRight() {
  rotate.value += 90;
}

function downloadImage() {
  const link = document.createElement('a');
  link.href = props.src;
  link.download = props.filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
</script>

<template>
  <div class="image-preview">
    <!-- Thumbnail -->
    <div
      class="image-thumbnail"
      :style="{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }"
      @click="openPreview"
    >
      <img
        :src="src"
        :alt="alt"
        class="thumbnail-img"
      />
      <div class="thumbnail-overlay">
        <ZoomInOutlined class="overlay-icon" />
      </div>
    </div>

    <!-- Lightbox Modal -->
    <Modal
      v-model:open="visible"
      :footer="null"
      :closable="false"
      width="90%"
      centered
      class="image-lightbox"
      wrap-class-name="image-lightbox-wrapper"
    >
      <template #title>
        <div class="lightbox-header">
          <span class="lightbox-filename">{{ filename }}</span>
          <div class="lightbox-controls">
            <button class="control-btn" title="Zoom Out" @click="zoomOut">
              <ZoomOutOutlined />
            </button>
            <span class="zoom-level">{{ Math.round(scale * 100) }}%</span>
            <button class="control-btn" title="Zoom In" @click="zoomIn">
              <ZoomInOutlined />
            </button>
            <button class="control-btn" title="Rotate Left" @click="rotateLeft">
              <RotateLeftOutlined />
            </button>
            <button class="control-btn" title="Rotate Right" @click="rotateRight">
              <RotateRightOutlined />
            </button>
            <button
              v-if="showDownload"
              class="control-btn"
              title="Download"
              @click="downloadImage"
            >
              <DownloadOutlined />
            </button>
            <button class="control-btn" title="Close" @click="closePreview">
              <CloseOutlined />
            </button>
          </div>
        </div>
      </template>

      <div class="lightbox-content">
        <img
          :src="src"
          :alt="alt"
          class="lightbox-img"
          :style="{
            transform: `scale(${scale}) rotate(${rotate}deg)`,
          }"
        />
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.image-preview {
  display: inline-block;
}

.image-thumbnail {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid var(--ant-color-border);
  background: var(--ant-color-bg-layout);
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.thumbnail-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-thumbnail:hover .thumbnail-overlay {
  opacity: 1;
}

.image-thumbnail:hover .thumbnail-img {
  transform: scale(1.05);
}

.overlay-icon {
  font-size: 24px;
  color: #fff;
}

.lightbox-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.lightbox-filename {
  font-weight: 500;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lightbox-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: var(--ant-color-bg-container);
  color: var(--ant-color-text);
  cursor: pointer;
  transition: all 0.2s;
}

.control-btn:hover {
  background: var(--ant-color-primary-bg);
  color: var(--ant-color-primary);
}

.zoom-level {
  min-width: 48px;
  text-align: center;
  font-size: 12px;
  color: var(--ant-color-text-secondary);
}

.lightbox-content {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  max-height: 70vh;
  overflow: auto;
  background: var(--ant-color-bg-layout);
  border-radius: 8px;
}

.lightbox-img {
  max-width: 100%;
  max-height: 70vh;
  transition: transform 0.3s ease;
}
</style>
