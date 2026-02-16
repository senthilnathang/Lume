<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Images, ImageIcon } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const images = computed(() => {
  const raw = props.node.attrs.images;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw) {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
});

const gridStyles = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${props.node.attrs.columns || 3}, 1fr)`,
  gap: props.node.attrs.gap || '16px',
}));

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="image-gallery-block-wrapper" :class="{ 'is-selected': selected }" data-type="imageGallery">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><Images :size="12" /> Image Gallery</span>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>
    <div contenteditable="false" class="gallery-preview" @click="selectThisNode">
      <div v-if="images.length > 0" :style="gridStyles">
        <div v-for="(img, idx) in images" :key="idx" class="gallery-item">
          <img :src="img.src" :alt="img.alt || ''" class="gallery-image" />
          <p v-if="img.caption" class="gallery-caption">{{ img.caption }}</p>
        </div>
      </div>
      <div v-else class="gallery-empty">
        <ImageIcon :size="32" />
        <p>No images added. Use the settings panel to add images.</p>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.image-gallery-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 8px;
}
.image-gallery-block-wrapper:hover { border-color: #d1d5db; }
.image-gallery-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.image-gallery-block-wrapper:hover .block-controls,
.image-gallery-block-wrapper.is-selected .block-controls {
  opacity: 1; pointer-events: all;
}
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.gallery-preview {
  padding: 12px;
}
.gallery-item {
  overflow: hidden;
  border-radius: 6px;
  background: #f9fafb;
}
.gallery-image {
  width: 100%;
  height: 160px;
  object-fit: cover;
  display: block;
}
.gallery-caption {
  margin: 0;
  padding: 8px;
  font-size: 12px;
  color: #6b7280;
  text-align: center;
}
.gallery-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #9ca3af;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  text-align: center;
}
.gallery-empty p {
  margin: 8px 0 0;
  font-size: 13px;
}
</style>
