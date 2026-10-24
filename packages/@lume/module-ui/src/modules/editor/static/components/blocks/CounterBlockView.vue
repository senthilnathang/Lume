<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Hash } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const formattedValue = computed(() => {
  const val = Number(props.node.attrs.endValue) || 0;
  const prefix = props.node.attrs.prefix || '';
  const suffix = props.node.attrs.suffix || '';
  const formatted = props.node.attrs.separator ? val.toLocaleString() : String(val);
  return `${prefix}${formatted}${suffix}`;
});

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') props.editor.commands.setNodeSelection(pos);
}
</script>

<template>
  <NodeViewWrapper class="counter-block-wrapper" :class="{ 'is-selected': selected }" data-type="counterBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><Hash :size="12" /> Counter</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="counter-preview" contenteditable="false" @click="selectThisNode">
      <div class="counter-value" :style="{ color: node.attrs.color }">
        {{ formattedValue }}
      </div>
      <div class="counter-meta">
        <span class="counter-meta-tag">{{ node.attrs.startValue }} -> {{ node.attrs.endValue }}</span>
        <span class="counter-meta-tag">{{ node.attrs.duration }}ms</span>
        <span class="counter-meta-tag">{{ node.attrs.tag }}</span>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.counter-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 4px;
}
.counter-block-wrapper:hover { border-color: #d1d5db; }
.counter-block-wrapper.is-selected { border-color: #1677ff; }

.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.counter-block-wrapper:hover .block-controls,
.counter-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }

.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.counter-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
}
.counter-value {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 8px;
}
.counter-meta {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
}
.counter-meta-tag {
  font-size: 11px;
  color: #6b7280;
  background: #e5e7eb;
  padding: 2px 8px;
  border-radius: 4px;
}
</style>
