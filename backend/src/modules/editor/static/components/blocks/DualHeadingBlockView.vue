<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Heading } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const wrapperStyles = computed(() => ({
  textAlign: props.node.attrs.alignment || 'center',
}));

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="dual-heading-block-wrapper" :class="{ 'is-selected': selected }" :style="wrapperStyles" data-type="dualHeading">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><Heading :size="12" /> Dual Heading</span>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>
    <div contenteditable="false" class="dual-heading-preview" @click="selectThisNode">
      <component :is="node.attrs.tag || 'h1'" class="dual-heading-text">
        <span :style="{ color: node.attrs.firstColor || '#000000' }">{{ node.attrs.firstText || 'Welcome to' }}</span>
        {{ ' ' }}
        <span :style="{ color: node.attrs.secondColor || '#3b82f6' }">{{ node.attrs.secondText || 'Our Website' }}</span>
      </component>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.dual-heading-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 8px;
}
.dual-heading-block-wrapper:hover { border-color: #d1d5db; }
.dual-heading-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.dual-heading-block-wrapper:hover .block-controls,
.dual-heading-block-wrapper.is-selected .block-controls {
  opacity: 1; pointer-events: all;
}
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.dual-heading-text {
  margin: 0;
  line-height: 1.3;
}
</style>
