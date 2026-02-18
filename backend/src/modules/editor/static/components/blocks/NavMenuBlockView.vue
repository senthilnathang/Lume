<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Menu } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') props.editor.commands.setNodeSelection(pos);
}
</script>

<template>
  <NodeViewWrapper class="nav-menu-block-wrapper" :class="{ 'is-selected': selected }" data-type="navMenuBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><Menu :size="12" /> Nav Menu</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="nav-menu-preview" contenteditable="false" @click="selectThisNode">
      <div class="nav-mock" :class="node.attrs.layout">
        <div class="nav-item">Home</div>
        <div class="nav-item">About</div>
        <div class="nav-item">Services</div>
        <div class="nav-item">Contact</div>
      </div>
      <div class="nav-meta">
        <span class="nav-meta-tag">{{ node.attrs.menuLocation }} menu</span>
        <span class="nav-meta-tag">{{ node.attrs.layout }}</span>
        <span class="nav-meta-tag">Mobile: {{ node.attrs.mobileLayout }}</span>
        <span class="nav-meta-tag">&lt;{{ node.attrs.hamburgerBreakpoint }}px</span>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.nav-menu-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 4px;
}
.nav-menu-block-wrapper:hover { border-color: #d1d5db; }
.nav-menu-block-wrapper.is-selected { border-color: #1677ff; }

.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.nav-menu-block-wrapper:hover .block-controls,
.nav-menu-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }

.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.nav-menu-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
}
.nav-mock {
  display: flex;
  gap: 20px;
  padding: 10px 14px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}
.nav-mock.vertical {
  flex-direction: column;
  gap: 8px;
}
.nav-mock.dropdown {
  flex-direction: column;
  gap: 4px;
}
.nav-item {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
  cursor: default;
}
.nav-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e5e7eb;
}
.nav-meta-tag {
  font-size: 11px;
  color: #6b7280;
  background: #e5e7eb;
  padding: 2px 8px;
  border-radius: 4px;
}
</style>
