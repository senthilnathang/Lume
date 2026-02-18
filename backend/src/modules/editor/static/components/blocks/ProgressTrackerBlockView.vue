<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Loader } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') props.editor.commands.setNodeSelection(pos);
}
</script>

<template>
  <NodeViewWrapper class="progress-tracker-block-wrapper" :class="{ 'is-selected': selected }" data-type="progressTrackerBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><Loader :size="12" /> Reading Progress</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="progress-tracker-preview" contenteditable="false" @click="selectThisNode">
      <div class="tracker-mock">
        <div class="tracker-bar" :style="{ height: node.attrs.height + 'px', backgroundColor: node.attrs.backgroundColor }">
          <div class="tracker-fill" :style="{ width: '60%', backgroundColor: node.attrs.color, height: '100%' }"></div>
        </div>
        <div class="tracker-info">
          <Loader :size="18" />
          <span>Reading Progress Indicator</span>
        </div>
      </div>
      <div class="tracker-meta">
        <span class="tracker-meta-tag">{{ node.attrs.position }}</span>
        <span class="tracker-meta-tag">{{ node.attrs.height }}px</span>
        <span class="tracker-meta-tag">{{ node.attrs.style }}</span>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.progress-tracker-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 4px;
}
.progress-tracker-block-wrapper:hover { border-color: #d1d5db; }
.progress-tracker-block-wrapper.is-selected { border-color: #1677ff; }

.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.progress-tracker-block-wrapper:hover .block-controls,
.progress-tracker-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }

.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.progress-tracker-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
}
.tracker-mock {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tracker-bar {
  width: 100%;
  border-radius: 4px;
  overflow: hidden;
}
.tracker-fill {
  border-radius: 4px;
  transition: width 0.3s;
}
.tracker-info {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  color: #6b7280;
  font-size: 13px;
}
.tracker-meta {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
}
.tracker-meta-tag {
  font-size: 11px;
  color: #6b7280;
  background: #e5e7eb;
  padding: 2px 8px;
  border-radius: 4px;
}
</style>
