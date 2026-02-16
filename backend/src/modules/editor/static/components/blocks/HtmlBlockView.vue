<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Code2, Eye, EyeOff } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);
const showPreview = ref(false);
const localContent = ref(props.node.attrs.content || '');

watch(() => props.node.attrs.content, (v) => { localContent.value = v || ''; });

function updateContent() {
  props.updateAttributes({ content: localContent.value });
}
</script>

<template>
  <NodeViewWrapper class="html-block-wrapper" :class="{ 'is-selected': selected }" data-type="htmlBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><Code2 :size="12" /> HTML</span>
      <button class="preview-toggle" @click="showPreview = !showPreview">
        <Eye v-if="!showPreview" :size="14" />
        <EyeOff v-else :size="14" />
      </button>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>
    <div contenteditable="false">
      <div v-if="showPreview" class="html-preview" v-html="localContent" />
      <textarea
        v-else
        v-model="localContent"
        class="html-code-editor"
        placeholder="Enter HTML code..."
        @blur="updateContent"
        @keydown.ctrl.enter="updateContent"
      />
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.html-block-wrapper {
  position: relative; border: 2px dashed transparent; border-radius: 4px;
  transition: border-color 0.15s; margin: 8px 0;
}
.html-block-wrapper:hover { border-color: #d1d5db; }
.html-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.html-block-wrapper:hover .block-controls,
.html-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.preview-toggle {
  cursor: pointer; padding: 4px; background: #f3f4f6; border: none;
  border-radius: 4px; color: #6b7280; display: flex; align-items: center;
}
.preview-toggle:hover { background: #e5e7eb; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }
.html-code-editor {
  width: 100%; min-height: 120px; padding: 12px 16px; border: 1px solid #e5e7eb;
  border-radius: 6px; font-family: 'SF Mono', Monaco, Menlo, monospace; font-size: 13px;
  line-height: 1.6; resize: vertical; background: #1e1e2e; color: #cdd6f4; outline: none;
}
.html-code-editor:focus { border-color: #1677ff; }
.html-preview { padding: 16px; background: #fafafa; border: 1px solid #e5e7eb; border-radius: 6px; min-height: 60px; }
</style>
