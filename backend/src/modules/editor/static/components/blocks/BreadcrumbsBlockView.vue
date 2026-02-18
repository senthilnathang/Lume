<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, ChevronRight } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') props.editor.commands.setNodeSelection(pos);
}
</script>

<template>
  <NodeViewWrapper class="breadcrumbs-block-wrapper" :class="{ 'is-selected': selected }" data-type="breadcrumbsBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><ChevronRight :size="12" /> Breadcrumbs</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="breadcrumbs-preview" contenteditable="false" @click="selectThisNode">
      <div class="breadcrumb-mock" :style="{ fontSize: node.attrs.fontSize + 'px', color: node.attrs.color }">
        <span class="crumb-link">{{ node.attrs.homeLabel }}</span>
        <span class="crumb-sep">{{ node.attrs.separator }}</span>
        <span class="crumb-link">Category</span>
        <span class="crumb-sep">{{ node.attrs.separator }}</span>
        <span v-if="node.attrs.showCurrent" class="crumb-current">Current Page</span>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.breadcrumbs-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 4px;
}
.breadcrumbs-block-wrapper:hover { border-color: #d1d5db; }
.breadcrumbs-block-wrapper.is-selected { border-color: #1677ff; }

.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.breadcrumbs-block-wrapper:hover .block-controls,
.breadcrumbs-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }

.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.breadcrumbs-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
}
.breadcrumb-mock {
  display: flex;
  align-items: center;
  gap: 8px;
}
.crumb-link {
  color: #1677ff;
  text-decoration: underline;
  cursor: default;
}
.crumb-sep {
  color: #9ca3af;
}
.crumb-current {
  font-weight: 500;
}
</style>
