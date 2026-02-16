<script setup lang="ts">
import { computed, ref } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, ImageIcon, Upload } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);
const showUrlInput = ref(false);
const urlInput = ref(props.node.attrs.src || '');

const wrapperStyles = computed(() => ({
  textAlign: props.node.attrs.alignment || 'center',
}));

const imgStyles = computed(() => ({
  maxWidth: props.node.attrs.width || '100%',
}));

function updateSrc() {
  props.updateAttributes({ src: urlInput.value });
  showUrlInput.value = false;
}
</script>

<template>
  <NodeViewWrapper class="image-block-wrapper" :class="{ 'is-selected': selected }" :style="wrapperStyles" data-type="imageBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><ImageIcon :size="12" /> Image</span>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>
    <div v-if="node.attrs.src" class="image-container" contenteditable="false">
      <img :src="node.attrs.src" :alt="node.attrs.alt" :style="imgStyles" />
      <p v-if="node.attrs.caption" class="image-caption">{{ node.attrs.caption }}</p>
    </div>
    <div v-else class="image-placeholder" contenteditable="false">
      <div v-if="!showUrlInput" class="placeholder-content" @click="showUrlInput = true">
        <Upload :size="32" />
        <p>Click to add an image URL</p>
      </div>
      <div v-else class="url-input-wrapper">
        <input
          v-model="urlInput"
          type="text"
          placeholder="Enter image URL..."
          class="url-input"
          @keydown.enter="updateSrc"
        />
        <button class="url-submit" @click="updateSrc">Add</button>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.image-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 4px;
}
.image-block-wrapper:hover { border-color: #d1d5db; }
.image-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls {
  position: absolute;
  top: -1px;
  left: -1px;
  right: -1px;
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 10;
  pointer-events: none;
}
.image-block-wrapper:hover .block-controls,
.image-block-wrapper.is-selected .block-controls {
  opacity: 1;
  pointer-events: all;
}
.block-drag-handle {
  cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px;
  display: flex; align-items: center; color: #6b7280;
}
.block-drag-handle:hover { background: #e5e7eb; }
.block-label {
  font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px;
  border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none;
}
.block-delete {
  margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2;
  border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center;
}
.block-delete:hover { background: #fee2e2; }
.image-container img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}
.image-caption {
  text-align: center;
  color: #6b7280;
  font-size: 13px;
  margin-top: 8px;
}
.image-placeholder {
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
}
.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #9ca3af;
}
.url-input-wrapper {
  display: flex;
  gap: 8px;
  max-width: 400px;
  margin: 0 auto;
}
.url-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  font-size: 14px;
}
.url-input:focus { border-color: #1677ff; }
.url-submit {
  padding: 8px 16px;
  background: #1677ff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}
.url-submit:hover { background: #0958d9; }
</style>
