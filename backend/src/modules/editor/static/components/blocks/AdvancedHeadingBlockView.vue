<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Heading } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const headingStyles = computed(() => ({
  textAlign: props.node.attrs.alignment || 'left',
  color: props.node.attrs.color || '#000000',
  fontSize: `${props.node.attrs.fontSize || 32}px`,
  fontWeight: props.node.attrs.fontWeight || '600',
  margin: 0,
  lineHeight: 1.3,
}));

const separatorStyles = computed(() => {
  const sep = props.node.attrs.separator;
  if (sep === 'none') return null;
  return {
    borderTop: `2px ${sep} ${props.node.attrs.separatorColor || '#e5e7eb'}`,
    width: `${props.node.attrs.separatorWidth || 60}px`,
    margin: props.node.attrs.alignment === 'center' ? '12px auto 0' :
            props.node.attrs.alignment === 'right' ? '12px 0 0 auto' : '12px 0 0 0',
  };
});

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="advanced-heading-block-wrapper" :class="{ 'is-selected': selected }" data-type="advancedHeading">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><Heading :size="12" /> Advanced Heading</span>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>
    <div contenteditable="false" class="heading-preview" @click="selectThisNode">
      <component :is="node.attrs.tag || 'h2'" :style="headingStyles">
        {{ node.attrs.text || 'Heading' }}
      </component>
      <div v-if="separatorStyles" :style="separatorStyles"></div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.advanced-heading-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 8px;
}
.advanced-heading-block-wrapper:hover { border-color: #d1d5db; }
.advanced-heading-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.advanced-heading-block-wrapper:hover .block-controls,
.advanced-heading-block-wrapper.is-selected .block-controls {
  opacity: 1; pointer-events: all;
}
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.heading-preview h1, .heading-preview h2, .heading-preview h3,
.heading-preview h4, .heading-preview h5, .heading-preview h6 {
  margin: 0;
}
</style>
