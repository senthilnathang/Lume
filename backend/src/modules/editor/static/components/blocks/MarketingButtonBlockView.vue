<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Megaphone } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const text = computed(() => props.node.attrs.text || 'Get Started');
const subtext = computed(() => props.node.attrs.subtext || '');
const variant = computed(() => props.node.attrs.variant || 'primary');
const size = computed(() => props.node.attrs.size || 'md');

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="marketing-button-block-wrapper" :class="{ 'is-selected': selected }" data-type="marketingButton">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><Megaphone :size="12" /> Marketing Button</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="marketing-button-preview" contenteditable="false" @click="selectThisNode">
      <div class="marketing-btn" :class="[`btn-${variant}`, `btn-${size}`]">
        <span class="marketing-btn-text">{{ text }}</span>
        <span v-if="subtext" class="marketing-btn-subtext">{{ subtext }}</span>
      </div>
      <div v-if="node.attrs.url" class="marketing-btn-url">{{ node.attrs.url }}</div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.marketing-button-block-wrapper { position: relative; border: 2px dashed transparent; border-radius: 4px; transition: border-color 0.15s; margin: 8px 0; padding: 8px; }
.marketing-button-block-wrapper:hover { border-color: #d1d5db; }
.marketing-button-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls { position: absolute; top: -1px; left: -1px; right: -1px; display: flex; align-items: center; gap: 4px; opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none; }
.marketing-button-block-wrapper:hover .block-controls, .marketing-button-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.marketing-button-preview { text-align: center; padding: 16px; }
.marketing-btn { display: inline-flex; flex-direction: column; align-items: center; border-radius: 8px; cursor: default; transition: all 0.2s; text-align: center; }
.marketing-btn-text { font-weight: 700; }
.marketing-btn-subtext { font-size: 12px; opacity: 0.85; margin-top: 2px; }

.btn-primary { background: #1677ff; color: white; border: 2px solid #1677ff; }
.btn-secondary { background: #6b7280; color: white; border: 2px solid #6b7280; }
.btn-success { background: #22c55e; color: white; border: 2px solid #22c55e; }
.btn-danger { background: #ef4444; color: white; border: 2px solid #ef4444; }
.btn-outline { background: transparent; color: #1677ff; border: 2px solid #1677ff; }
.btn-gradient { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: 2px solid transparent; }

.btn-sm { padding: 10px 24px; font-size: 14px; }
.btn-sm .marketing-btn-subtext { font-size: 11px; }
.btn-md { padding: 14px 32px; font-size: 16px; }
.btn-lg { padding: 18px 44px; font-size: 20px; }
.btn-lg .marketing-btn-subtext { font-size: 14px; }

.marketing-btn-url { margin-top: 8px; font-size: 11px; color: #9ca3af; }
</style>
