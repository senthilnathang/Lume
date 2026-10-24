<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Layout } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const blockStyles = computed(() => ({
  backgroundColor: props.node.attrs.backgroundColor || 'transparent',
  backgroundImage: props.node.attrs.backgroundImage ? `url(${props.node.attrs.backgroundImage})` : 'none',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  paddingTop: `${props.node.attrs.paddingTop}px`,
  paddingBottom: `${props.node.attrs.paddingBottom}px`,
}));

const contentStyles = computed(() => ({
  maxWidth: `${props.node.attrs.maxWidth}px`,
  margin: '0 auto',
}));
</script>

<template>
  <NodeViewWrapper class="section-block-wrapper" :class="{ 'is-selected': selected }" :style="blockStyles" data-type="sectionBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><Layout :size="12" /> Section</span>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>
    <div :style="contentStyles">
      <NodeViewContent class="section-content" />
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.section-block-wrapper {
  position: relative;
  min-height: 60px;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
}
.section-block-wrapper:hover {
  border-color: #d1d5db;
}
.section-block-wrapper.is-selected {
  border-color: #1677ff;
}
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
.section-block-wrapper:hover .block-controls,
.section-block-wrapper.is-selected .block-controls {
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
.section-content { min-height: 40px; }
</style>
