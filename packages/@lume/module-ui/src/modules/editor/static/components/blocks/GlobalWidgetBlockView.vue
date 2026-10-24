<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { Globe, GripVertical, Trash2 } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

function deleteNode() {
  props.deleteNode();
}
</script>

<template>
  <NodeViewWrapper class="global-widget-block-view" data-drag-handle>
    <div class="gwb-container">
      <!-- Drag handle -->
      <div class="gwb-handle" contenteditable="false">
        <GripVertical :size="14" class="text-gray-400" />
      </div>

      <!-- Widget indicator -->
      <div class="gwb-body">
        <div class="gwb-icon-wrap">
          <Globe :size="20" class="text-blue-500" />
        </div>
        <div class="gwb-info">
          <span class="gwb-label">Global Widget</span>
          <span class="gwb-name">{{ props.node.attrs.name || 'Unnamed Widget' }}</span>
        </div>
        <div class="gwb-badge">GLOBAL</div>
      </div>

      <!-- Delete button -->
      <button class="gwb-delete" contenteditable="false" @click="deleteNode">
        <Trash2 :size="13" />
      </button>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.global-widget-block-view {
  display: block;
  margin: 8px 0;
}
.gwb-container {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1.5px dashed #93c5fd;
  border-radius: 8px;
  background: #eff6ff;
  padding: 10px 12px;
  cursor: default;
  user-select: none;
}
.gwb-handle {
  cursor: grab;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.gwb-body {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}
.gwb-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: #dbeafe;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.gwb-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.gwb-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #93c5fd;
  line-height: 1.2;
}
.gwb-name {
  font-size: 13px;
  font-weight: 600;
  color: #1e40af;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gwb-badge {
  margin-left: auto;
  background: #2563eb;
  color: white;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 2px 8px;
  border-radius: 12px;
  flex-shrink: 0;
}
.gwb-delete {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #9ca3af;
  transition: all 0.15s;
}
.gwb-delete:hover {
  background: #fee2e2;
  color: #dc2626;
}
</style>
