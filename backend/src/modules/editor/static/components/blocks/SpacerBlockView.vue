<script setup lang="ts">
import { computed, ref } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, MoveVertical } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);
const isDragging = ref(false);
const startY = ref(0);
const startHeight = ref(0);

const spacerStyles = computed(() => ({
  height: `${props.node.attrs.height}px`,
}));

function startResize(e: MouseEvent) {
  isDragging.value = true;
  startY.value = e.clientY;
  startHeight.value = parseInt(props.node.attrs.height) || 40;
  document.addEventListener('mousemove', onResize);
  document.addEventListener('mouseup', stopResize);
}

function onResize(e: MouseEvent) {
  if (!isDragging.value) return;
  const diff = e.clientY - startY.value;
  const newHeight = Math.max(8, startHeight.value + diff);
  props.updateAttributes({ height: String(newHeight) });
}

function stopResize() {
  isDragging.value = false;
  document.removeEventListener('mousemove', onResize);
  document.removeEventListener('mouseup', stopResize);
}

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="spacer-block-wrapper" :class="{ 'is-selected': selected }" data-type="spacerBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><MoveVertical :size="12" /> Spacer · {{ node.attrs.height }}px</span>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>
    <div class="spacer-area" :style="spacerStyles" contenteditable="false" @click="selectThisNode">
      <div class="spacer-line" />
      <div class="spacer-resize-handle" @mousedown.prevent="startResize" />
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.spacer-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
}
.spacer-block-wrapper:hover { border-color: #d1d5db; }
.spacer-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.spacer-block-wrapper:hover .block-controls,
.spacer-block-wrapper.is-selected .block-controls {
  opacity: 1; pointer-events: all;
}
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }
.spacer-area {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 8px;
}
.spacer-line {
  width: 100%;
  border-top: 1px dashed #d1d5db;
}
.spacer-resize-handle {
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  cursor: ns-resize;
  opacity: 0;
  transition: opacity 0.15s;
}
.spacer-block-wrapper:hover .spacer-resize-handle {
  opacity: 1;
}
</style>
