<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Quote } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') props.editor.commands.setNodeSelection(pos);
}
</script>

<template>
  <NodeViewWrapper class="blockquote-block-wrapper" :class="{ 'is-selected': selected }" data-type="blockquoteBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><Quote :size="12" /> Blockquote</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="blockquote-preview" contenteditable="false" @click="selectThisNode">
      <div class="quote-content" :style="{ borderLeftColor: node.attrs.borderColor }">
        <Quote :size="20" class="quote-icon" :style="{ color: node.attrs.borderColor }" />
        <p class="quote-text">{{ node.attrs.content || 'Quote text...' }}</p>
        <div v-if="node.attrs.author" class="quote-author">
          <img v-if="node.attrs.authorImage" :src="node.attrs.authorImage" class="author-avatar" />
          <div>
            <div class="author-name">{{ node.attrs.author }}</div>
            <div v-if="node.attrs.authorTitle" class="author-title">{{ node.attrs.authorTitle }}</div>
          </div>
        </div>
      </div>
      <div class="blockquote-meta">
        <span class="blockquote-meta-tag">{{ node.attrs.style }}</span>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.blockquote-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 4px;
}
.blockquote-block-wrapper:hover { border-color: #d1d5db; }
.blockquote-block-wrapper.is-selected { border-color: #1677ff; }

.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.blockquote-block-wrapper:hover .block-controls,
.blockquote-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }

.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.blockquote-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
}
.quote-content {
  border-left: 4px solid #1677ff;
  padding-left: 16px;
}
.quote-icon { margin-bottom: 8px; opacity: 0.5; }
.quote-text {
  font-size: 15px;
  font-style: italic;
  color: #374151;
  margin: 0 0 12px;
  line-height: 1.6;
}
.quote-author {
  display: flex;
  align-items: center;
  gap: 10px;
}
.author-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}
.author-name {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}
.author-title {
  font-size: 12px;
  color: #9ca3af;
}
.blockquote-meta {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
}
.blockquote-meta-tag {
  font-size: 11px;
  color: #6b7280;
  background: #e5e7eb;
  padding: 2px 8px;
  border-radius: 4px;
}
</style>
