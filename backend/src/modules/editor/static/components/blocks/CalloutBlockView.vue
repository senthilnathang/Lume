<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const typeConfig = computed(() => {
  const configs: Record<string, { bg: string; border: string; icon: any; color: string }> = {
    info: { bg: '#eff6ff', border: '#3b82f6', icon: Info, color: '#1d4ed8' },
    warning: { bg: '#fffbeb', border: '#f59e0b', icon: AlertTriangle, color: '#b45309' },
    success: { bg: '#f0fdf4', border: '#22c55e', icon: CheckCircle2, color: '#15803d' },
    error: { bg: '#fef2f2', border: '#ef4444', icon: XCircle, color: '#b91c1c' },
  };
  return configs[props.node.attrs.type] || configs.info;
});

const calloutStyles = computed(() => ({
  background: typeConfig.value.bg,
  borderLeft: `4px solid ${typeConfig.value.border}`,
  color: typeConfig.value.color,
}));
</script>

<template>
  <NodeViewWrapper class="callout-block-wrapper" :class="{ 'is-selected': selected }" data-type="calloutBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><Info :size="12" /> Callout</span>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>
    <div class="callout-box" :style="calloutStyles">
      <div class="callout-icon" contenteditable="false">
        <component :is="typeConfig.icon" :size="20" />
      </div>
      <div class="callout-body">
        <div v-if="node.attrs.title" class="callout-title" contenteditable="false">{{ node.attrs.title }}</div>
        <NodeViewContent class="callout-content" />
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.callout-block-wrapper {
  position: relative; border: 2px dashed transparent; border-radius: 4px;
  transition: border-color 0.15s; margin: 8px 0;
}
.callout-block-wrapper:hover { border-color: #d1d5db; }
.callout-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.callout-block-wrapper:hover .block-controls,
.callout-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }
.callout-box { display: flex; gap: 12px; padding: 16px; border-radius: 8px; }
.callout-icon { flex-shrink: 0; padding-top: 2px; }
.callout-body { flex: 1; min-width: 0; }
.callout-title { font-weight: 600; margin-bottom: 4px; font-size: 15px; }
.callout-content { font-size: 14px; }
.callout-content :deep(p) { margin: 0.25em 0; }
</style>
