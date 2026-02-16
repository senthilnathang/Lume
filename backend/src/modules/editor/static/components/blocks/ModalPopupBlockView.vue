<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Maximize2 } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const triggerText = computed(() => props.node.attrs.triggerText || 'Open Modal');
const triggerVariant = computed(() => props.node.attrs.triggerVariant || 'primary');
const modalTitle = computed(() => props.node.attrs.modalTitle || 'Modal Title');
const modalContent = computed(() => props.node.attrs.modalContent || 'Your modal content here');
const modalWidth = computed(() => props.node.attrs.modalWidth || 'md');

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="modal-popup-block-wrapper" :class="{ 'is-selected': selected }" data-type="modalPopup">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><Maximize2 :size="12" /> Modal Popup</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="modal-popup-preview" contenteditable="false" @click="selectThisNode">
      <div class="trigger-section">
        <span class="trigger-label">Trigger:</span>
        <span class="trigger-btn" :class="`trigger-${triggerVariant}`">{{ triggerText }}</span>
      </div>
      <div class="modal-preview-card">
        <div class="modal-preview-header">
          <span class="modal-preview-title">{{ modalTitle }}</span>
          <span class="modal-preview-badge">{{ modalWidth }}</span>
        </div>
        <div class="modal-preview-body">{{ modalContent }}</div>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.modal-popup-block-wrapper { position: relative; border: 2px dashed transparent; border-radius: 4px; transition: border-color 0.15s; margin: 8px 0; padding: 8px; }
.modal-popup-block-wrapper:hover { border-color: #d1d5db; }
.modal-popup-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls { position: absolute; top: -1px; left: -1px; right: -1px; display: flex; align-items: center; gap: 4px; opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none; }
.modal-popup-block-wrapper:hover .block-controls, .modal-popup-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.modal-popup-preview { padding: 12px; }
.trigger-section { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.trigger-label { font-size: 12px; color: #9ca3af; }
.trigger-btn { padding: 8px 20px; border-radius: 6px; font-weight: 600; font-size: 14px; cursor: default; }
.trigger-primary { background: #1677ff; color: white; }
.trigger-secondary { background: #6b7280; color: white; }
.trigger-outline { background: transparent; color: #1677ff; border: 2px solid #1677ff; }

.modal-preview-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
.modal-preview-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; background: white; }
.modal-preview-title { font-weight: 600; font-size: 14px; color: #111827; }
.modal-preview-badge { font-size: 10px; background: #e5e7eb; color: #6b7280; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
.modal-preview-body { padding: 16px; font-size: 13px; color: #6b7280; line-height: 1.5; }
</style>
