<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, List } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const styleLabel = computed(() => {
  const map: Record<string, string> = { list: 'Bullet', numbered: 'Numbered', dots: 'Dots' };
  return map[props.node.attrs.displayStyle] || 'List';
});

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="toc-block-wrapper" :class="{ 'is-selected': selected }" data-type="tocBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><List :size="12" /> TOC</span>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>

    <div class="toc-preview" contenteditable="false" @click="selectThisNode">
      <div class="toc-header">
        <List :size="18" class="toc-header-icon" />
        <span class="toc-title">{{ node.attrs.title || 'Table of Contents' }}</span>
        <div class="toc-badges">
          <span class="toc-badge">Depth: {{ node.attrs.maxDepth }}</span>
          <span class="toc-badge">{{ styleLabel }}</span>
          <span v-if="node.attrs.sticky" class="toc-badge toc-badge--sticky">Sticky</span>
          <span v-if="node.attrs.collapsible" class="toc-badge">Collapsible</span>
        </div>
      </div>
      <div class="toc-sample-entries">
        <div class="toc-entry toc-entry--h2">
          <span class="toc-bullet" />
          <span>Section Title</span>
        </div>
        <div v-if="node.attrs.maxDepth >= 3" class="toc-entry toc-entry--h3">
          <span class="toc-bullet" />
          <span>Subsection</span>
        </div>
        <div v-if="node.attrs.maxDepth >= 4" class="toc-entry toc-entry--h4">
          <span class="toc-bullet" />
          <span>Detail</span>
        </div>
        <div class="toc-entry toc-entry--h2">
          <span class="toc-bullet" />
          <span>Another Section</span>
        </div>
        <div v-if="node.attrs.maxDepth >= 3" class="toc-entry toc-entry--h3">
          <span class="toc-bullet" />
          <span>Another Subsection</span>
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.toc-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 4px;
}
.toc-block-wrapper:hover { border-color: #d1d5db; }
.toc-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.toc-block-wrapper:hover .block-controls,
.toc-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.toc-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}
.toc-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e5e7eb;
}
.toc-header-icon { color: #6b7280; }
.toc-title {
  font-weight: 600;
  font-size: 15px;
  color: #374151;
  flex: 1;
}
.toc-badges { display: flex; gap: 4px; }
.toc-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #e5e7eb;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}
.toc-badge--sticky { background: #dbeafe; color: #1d4ed8; }
.toc-sample-entries { display: flex; flex-direction: column; gap: 4px; }
.toc-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6b7280;
}
.toc-entry--h2 { padding-left: 0; }
.toc-entry--h3 { padding-left: 20px; }
.toc-entry--h4 { padding-left: 40px; }
.toc-bullet {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #d1d5db;
  flex-shrink: 0;
}
</style>
