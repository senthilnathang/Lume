<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Sparkles } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') props.editor.commands.setNodeSelection(pos);
}

const triggerLabel = computed(() => {
  const triggers: Record<string, string> = { none: 'Auto', hover: 'On Hover', scroll: 'On Scroll', viewport: 'In Viewport' };
  return triggers[props.node.attrs.trigger] || 'Auto';
});
</script>

<template>
  <NodeViewWrapper class="lottie-block-wrapper" :class="{ 'is-selected': selected }" data-type="lottieBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><Sparkles :size="12" /> Lottie</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="lottie-preview" contenteditable="false" @click="selectThisNode" :style="{ height: node.attrs.height }">
      <div class="lottie-placeholder">
        <Sparkles :size="36" />
        <div class="lottie-info">
          <div class="lottie-title">Lottie Animation</div>
          <div v-if="node.attrs.jsonUrl" class="lottie-url">{{ node.attrs.jsonUrl }}</div>
          <div v-else class="lottie-url empty">No animation URL set</div>
        </div>
      </div>
      <div class="lottie-meta">
        <span class="lottie-meta-tag">{{ triggerLabel }}</span>
        <span v-if="node.attrs.loop" class="lottie-meta-tag">Loop</span>
        <span class="lottie-meta-tag">{{ node.attrs.speed }}x speed</span>
        <span class="lottie-meta-tag">{{ node.attrs.width }} x {{ node.attrs.height }}</span>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.lottie-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 4px;
}
.lottie-block-wrapper:hover { border-color: #d1d5db; }
.lottie-block-wrapper.is-selected { border-color: #1677ff; }

.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.lottie-block-wrapper:hover .block-controls,
.lottie-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }

.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.lottie-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  min-height: 120px;
}
.lottie-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #9ca3af;
}
.lottie-info { text-align: center; }
.lottie-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}
.lottie-url {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lottie-url.empty {
  color: #d97706;
}
.lottie-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
}
.lottie-meta-tag {
  font-size: 11px;
  color: #6b7280;
  background: #e5e7eb;
  padding: 2px 8px;
  border-radius: 4px;
}
</style>
