<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, BarChart3 } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const items = computed(() => {
  const raw = props.node.attrs.items;
  if (Array.isArray(raw) && raw.length > 0) return raw;
  return [
    { label: 'HTML/CSS', percentage: 90, color: '#3b82f6' },
    { label: 'JavaScript', percentage: 75, color: '#22c55e' },
    { label: 'Vue.js', percentage: 85, color: '#8b5cf6' },
  ];
});

const showPercentage = computed(() => props.node.attrs.showPercentage !== false);
const animated = computed(() => props.node.attrs.animated !== false);
const styleVariant = computed(() => props.node.attrs.style || 'bar');

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="progress-bar-block-wrapper" :class="{ 'is-selected': selected }" data-type="progressBar">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><BarChart3 :size="12" /> Progress Bar</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="progress-preview" contenteditable="false" @click="selectThisNode">
      <div v-for="(item, index) in items" :key="index" class="progress-item">
        <div class="progress-item-header">
          <span class="progress-item-label">{{ item.label }}</span>
          <span v-if="showPercentage" class="progress-item-pct">{{ item.percentage }}%</span>
        </div>
        <div class="progress-track">
          <div
            class="progress-fill"
            :class="{ 'is-animated': animated }"
            :style="{ width: item.percentage + '%', backgroundColor: item.color || '#3b82f6' }"
          ></div>
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.progress-bar-block-wrapper { position: relative; border: 2px dashed transparent; border-radius: 4px; transition: border-color 0.15s; margin: 8px 0; padding: 8px; }
.progress-bar-block-wrapper:hover { border-color: #d1d5db; }
.progress-bar-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls { position: absolute; top: -1px; left: -1px; right: -1px; display: flex; align-items: center; gap: 4px; opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none; }
.progress-bar-block-wrapper:hover .block-controls, .progress-bar-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.progress-preview { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.progress-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.progress-item-label { font-size: 14px; font-weight: 500; color: #374151; }
.progress-item-pct { font-size: 13px; font-weight: 600; color: #6b7280; }
.progress-track { width: 100%; height: 10px; background: #f3f4f6; border-radius: 999px; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 999px; transition: width 0.6s ease; }
.progress-fill.is-animated { animation: progressGrow 1s ease-out; }
@keyframes progressGrow { from { width: 0%; } }
</style>
