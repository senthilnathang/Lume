<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Search } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') props.editor.commands.setNodeSelection(pos);
}
</script>

<template>
  <NodeViewWrapper class="search-form-block-wrapper" :class="{ 'is-selected': selected }" data-type="searchFormBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><Search :size="12" /> Search Form</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="search-form-preview" contenteditable="false" @click="selectThisNode">
      <div class="search-mock" :class="node.attrs.style">
        <div class="search-input-mock">
          <Search :size="16" class="search-icon" />
          <span class="search-placeholder">{{ node.attrs.placeholder }}</span>
        </div>
        <button v-if="node.attrs.showButton" class="search-btn-mock">
          {{ node.attrs.buttonText }}
        </button>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.search-form-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 4px;
}
.search-form-block-wrapper:hover { border-color: #d1d5db; }
.search-form-block-wrapper.is-selected { border-color: #1677ff; }

.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.search-form-block-wrapper:hover .block-controls,
.search-form-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }

.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.search-form-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
}
.search-mock {
  display: flex;
  gap: 8px;
  max-width: 500px;
  margin: 0 auto;
}
.search-mock.rounded .search-input-mock {
  border-radius: 24px;
}
.search-mock.rounded .search-btn-mock {
  border-radius: 24px;
}
.search-mock.minimal .search-input-mock {
  border: none;
  border-bottom: 2px solid #e5e7eb;
  border-radius: 0;
}
.search-input-mock {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
}
.search-icon { color: #9ca3af; flex-shrink: 0; }
.search-placeholder {
  font-size: 14px;
  color: #9ca3af;
}
.search-btn-mock {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  background: #1677ff;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: default;
  white-space: nowrap;
}
</style>
