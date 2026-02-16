<script setup lang="ts">
import { ref, computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, ToggleLeft } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const activeOption = ref<'primary' | 'secondary'>('primary');

const primaryLabel = computed(() => props.node.attrs.primaryLabel || 'Option A');
const secondaryLabel = computed(() => props.node.attrs.secondaryLabel || 'Option B');
const primaryContent = computed(() => props.node.attrs.primaryContent || 'Content for option A');
const secondaryContent = computed(() => props.node.attrs.secondaryContent || 'Content for option B');
const styleVariant = computed(() => props.node.attrs.style || 'switch');

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="content-toggle-block-wrapper" :class="{ 'is-selected': selected }" data-type="contentToggle">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><ToggleLeft :size="12" /> Content Toggle</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="toggle-preview" contenteditable="false" @click="selectThisNode">
      <div class="toggle-switcher" :class="`toggle-${styleVariant}`">
        <button
          class="toggle-option"
          :class="{ active: activeOption === 'primary' }"
          @click="activeOption = 'primary'"
        >{{ primaryLabel }}</button>
        <button
          class="toggle-option"
          :class="{ active: activeOption === 'secondary' }"
          @click="activeOption = 'secondary'"
        >{{ secondaryLabel }}</button>
      </div>
      <div class="toggle-content">
        <div v-if="activeOption === 'primary'" class="toggle-panel">{{ primaryContent }}</div>
        <div v-else class="toggle-panel">{{ secondaryContent }}</div>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.content-toggle-block-wrapper { position: relative; border: 2px dashed transparent; border-radius: 4px; transition: border-color 0.15s; margin: 8px 0; padding: 8px; }
.content-toggle-block-wrapper:hover { border-color: #d1d5db; }
.content-toggle-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls { position: absolute; top: -1px; left: -1px; right: -1px; display: flex; align-items: center; gap: 4px; opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none; }
.content-toggle-block-wrapper:hover .block-controls, .content-toggle-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.toggle-preview { padding: 12px; }
.toggle-switcher { display: flex; gap: 0; background: #f3f4f6; border-radius: 8px; padding: 4px; width: fit-content; margin: 0 auto; }
.toggle-option { padding: 8px 20px; border: none; background: transparent; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; color: #6b7280; transition: all 0.2s; }
.toggle-option.active { background: white; color: #111827; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.toggle-content { margin-top: 16px; padding: 16px; background: #f9fafb; border-radius: 8px; min-height: 60px; }
.toggle-panel { font-size: 14px; color: #374151; line-height: 1.6; }
</style>
