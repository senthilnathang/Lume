<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Columns3 } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const containerStyles = computed(() => ({
  gap: `${props.node.attrs.gap}px`,
}));
</script>

<template>
  <NodeViewWrapper class="columns-block-wrapper" :class="{ 'is-selected': selected }" data-type="columnsBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><Columns3 :size="12" /> Columns</span>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>
    <NodeViewContent class="columns-content" :style="containerStyles" />
  </NodeViewWrapper>
</template>

<style scoped>
.columns-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 8px;
}
.columns-block-wrapper:hover { border-color: #d1d5db; }
.columns-block-wrapper.is-selected { border-color: #1677ff; }
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
.columns-block-wrapper:hover .block-controls,
.columns-block-wrapper.is-selected .block-controls {
  opacity: 1;
  pointer-events: all;
}
.block-drag-handle {
  cursor: grab;
  padding: 4px;
  background: #f3f4f6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  color: #6b7280;
}
.block-drag-handle:hover { background: #e5e7eb; }
.block-label {
  font-size: 11px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  user-select: none;
}
.block-delete {
  margin-left: auto;
  cursor: pointer;
  padding: 4px;
  background: #fef2f2;
  border: none;
  border-radius: 4px;
  color: #ef4444;
  display: flex;
  align-items: center;
}
.block-delete:hover { background: #fee2e2; }
.columns-content {
  display: flex;
  min-height: 60px;
}
.columns-content :deep(> div) {
  flex: 1;
}
</style>
