<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, PanelRightOpen, ArrowLeft, ArrowRight } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const variantStyles = computed(() => {
  const map: Record<string, { bg: string; border: string; color: string }> = {
    primary: { bg: '#1677ff', border: '#1677ff', color: '#fff' },
    outline: { bg: 'transparent', border: '#1677ff', color: '#1677ff' },
    ghost: { bg: 'transparent', border: 'transparent', color: '#1677ff' },
  };
  return map[props.node.attrs.triggerVariant] || map.primary;
});

const directionIcon = computed(() =>
  props.node.attrs.direction === 'left' ? ArrowLeft : ArrowRight
);

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="offcanvas-block-wrapper" :class="{ 'is-selected': selected }" data-type="offCanvasBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><PanelRightOpen :size="12" /> Off-Canvas</span>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>

    <div class="offcanvas-preview" contenteditable="false" @click="selectThisNode">
      <div class="offcanvas-preview-layout">
        <!-- Trigger button preview -->
        <div class="trigger-section">
          <div
            class="trigger-button-preview"
            :style="{
              backgroundColor: variantStyles.bg,
              border: `1px solid ${variantStyles.border}`,
              color: variantStyles.color,
            }"
          >
            {{ node.attrs.triggerText || 'Open Panel' }}
          </div>
        </div>

        <!-- Direction indicator -->
        <div class="direction-indicator">
          <component :is="directionIcon" :size="16" />
        </div>

        <!-- Mini panel preview -->
        <div class="panel-preview" :class="{ 'panel-preview--left': node.attrs.direction === 'left' }">
          <div class="panel-preview-header">
            <span class="panel-preview-title">{{ node.attrs.panelTitle || 'Panel' }}</span>
            <span v-if="node.attrs.showCloseButton" class="panel-preview-close">&times;</span>
          </div>
          <div class="panel-preview-body">
            <div class="panel-preview-line" style="width: 80%;" />
            <div class="panel-preview-line" style="width: 60%;" />
            <div class="panel-preview-line" style="width: 70%;" />
          </div>
          <div class="panel-preview-meta">
            {{ node.attrs.width }}px &middot; {{ node.attrs.direction }}
          </div>
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.offcanvas-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 4px;
}
.offcanvas-block-wrapper:hover { border-color: #d1d5db; }
.offcanvas-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.offcanvas-block-wrapper:hover .block-controls,
.offcanvas-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.offcanvas-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
}
.offcanvas-preview-layout {
  display: flex;
  align-items: center;
  gap: 16px;
}
.trigger-section { flex-shrink: 0; }
.trigger-button-preview {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: default;
  white-space: nowrap;
}
.direction-indicator {
  color: #9ca3af;
  flex-shrink: 0;
}
.panel-preview {
  flex: 1;
  max-width: 200px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  border-left: 3px solid #1677ff;
}
.panel-preview--left {
  border-left: 1px solid #e5e7eb;
  border-right: 3px solid #1677ff;
}
.panel-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-bottom: 1px solid #f3f4f6;
  background: #fafafa;
}
.panel-preview-title {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
}
.panel-preview-close {
  font-size: 14px;
  color: #9ca3af;
  line-height: 1;
}
.panel-preview-body {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.panel-preview-line {
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
}
.panel-preview-meta {
  padding: 4px 10px 6px;
  font-size: 9px;
  color: #9ca3af;
  text-align: center;
}
</style>
