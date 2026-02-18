<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Columns2, ImageIcon } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') props.editor.commands.setNodeSelection(pos);
}
</script>

<template>
  <NodeViewWrapper class="before-after-block-wrapper" :class="{ 'is-selected': selected }" data-type="beforeAfterBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><Columns2 :size="12" /> Before/After</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="before-after-preview" contenteditable="false" @click="selectThisNode">
      <div class="comparison-display">
        <div class="comparison-side">
          <div v-if="node.attrs.beforeImage" class="comparison-img">
            <img :src="node.attrs.beforeImage" alt="Before" />
          </div>
          <div v-else class="comparison-placeholder"><ImageIcon :size="20" /></div>
          <span class="comparison-label">{{ node.attrs.beforeLabel }}</span>
        </div>
        <div class="comparison-divider" :style="{ backgroundColor: node.attrs.handleColor === '#ffffff' ? '#d1d5db' : node.attrs.handleColor }">
          <Columns2 :size="14" />
        </div>
        <div class="comparison-side">
          <div v-if="node.attrs.afterImage" class="comparison-img">
            <img :src="node.attrs.afterImage" alt="After" />
          </div>
          <div v-else class="comparison-placeholder"><ImageIcon :size="20" /></div>
          <span class="comparison-label">{{ node.attrs.afterLabel }}</span>
        </div>
      </div>
      <div class="ba-meta">
        <span class="ba-meta-tag">{{ node.attrs.orientation }}</span>
        <span class="ba-meta-tag">Start: {{ node.attrs.startPosition }}%</span>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.before-after-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 4px;
}
.before-after-block-wrapper:hover { border-color: #d1d5db; }
.before-after-block-wrapper.is-selected { border-color: #1677ff; }

.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.before-after-block-wrapper:hover .block-controls,
.before-after-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }

.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.before-after-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
}
.comparison-display {
  display: flex;
  align-items: center;
  gap: 8px;
}
.comparison-side {
  flex: 1;
  text-align: center;
}
.comparison-img {
  width: 100%;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 6px;
}
.comparison-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.comparison-placeholder {
  width: 100%;
  height: 80px;
  background: #e5e7eb;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  margin-bottom: 6px;
}
.comparison-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
}
.comparison-divider {
  width: 3px;
  height: 80px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
}
.ba-meta {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e5e7eb;
}
.ba-meta-tag {
  font-size: 11px;
  color: #6b7280;
  background: #e5e7eb;
  padding: 2px 8px;
  border-radius: 4px;
}
</style>
