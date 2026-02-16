<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, MousePointerClick } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const buttonClasses = computed(() => {
  const v = props.node.attrs.variant || 'primary';
  const s = props.node.attrs.size || 'md';
  return `btn-block btn-${v} btn-${s}`;
});

const wrapperStyles = computed(() => ({
  textAlign: props.node.attrs.alignment || 'left',
}));
</script>

<template>
  <NodeViewWrapper class="button-block-wrapper" :class="{ 'is-selected': selected }" :style="wrapperStyles" data-type="buttonBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><MousePointerClick :size="12" /> Button</span>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>
    <div contenteditable="false" class="button-preview">
      <span :class="buttonClasses" :style="{ display: node.attrs.fullWidth ? 'block' : 'inline-block' }">
        {{ node.attrs.text || 'Button' }}
      </span>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.button-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 8px;
}
.button-block-wrapper:hover { border-color: #d1d5db; }
.button-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.button-block-wrapper:hover .block-controls,
.button-block-wrapper.is-selected .block-controls {
  opacity: 1; pointer-events: all;
}
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.btn-block {
  padding: 10px 24px;
  border-radius: 6px;
  font-weight: 600;
  cursor: default;
  text-align: center;
  transition: all 0.2s;
}
.btn-primary { background: #1677ff; color: white; border: 1px solid #1677ff; }
.btn-outline { background: transparent; color: #1677ff; border: 1px solid #1677ff; }
.btn-ghost { background: transparent; color: #1677ff; border: 1px solid transparent; }
.btn-danger { background: #ef4444; color: white; border: 1px solid #ef4444; }
.btn-sm { padding: 6px 16px; font-size: 13px; }
.btn-md { padding: 10px 24px; font-size: 14px; }
.btn-lg { padding: 14px 32px; font-size: 16px; }
</style>
