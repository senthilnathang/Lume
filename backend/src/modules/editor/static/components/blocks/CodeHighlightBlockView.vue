<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Code2 } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const codePreview = computed(() => {
  const code = props.node.attrs.code || '';
  if (!code) return 'No code added yet';
  const lines = code.split('\n');
  if (lines.length > 8) return lines.slice(0, 8).join('\n') + '\n...';
  return code;
});

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') props.editor.commands.setNodeSelection(pos);
}
</script>

<template>
  <NodeViewWrapper class="code-highlight-block-wrapper" :class="{ 'is-selected': selected }" data-type="codeHighlightBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><Code2 :size="12" /> Code</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="code-preview" contenteditable="false" @click="selectThisNode" :class="node.attrs.theme">
      <div class="code-header">
        <span class="code-lang">{{ node.attrs.language }}</span>
        <div class="code-dots">
          <span class="dot red"></span>
          <span class="dot yellow"></span>
          <span class="dot green"></span>
        </div>
      </div>
      <pre class="code-body"><code>{{ codePreview }}</code></pre>
      <div class="code-meta">
        <span class="code-meta-tag">{{ node.attrs.theme }}</span>
        <span v-if="node.attrs.lineNumbers" class="code-meta-tag">Line #</span>
        <span v-if="node.attrs.copyButton" class="code-meta-tag">Copy btn</span>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.code-highlight-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 4px;
}
.code-highlight-block-wrapper:hover { border-color: #d1d5db; }
.code-highlight-block-wrapper.is-selected { border-color: #1677ff; }

.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.code-highlight-block-wrapper:hover .block-controls,
.code-highlight-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }

.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.code-preview {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
}
.code-preview.dark {
  background: #1e1e2e;
}
.code-preview.light {
  background: #f8f8f8;
}
.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.code-preview.light .code-header {
  border-bottom-color: #e5e7eb;
}
.code-lang {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.code-preview.dark .code-lang { color: #9ca3af; }
.code-preview.light .code-lang { color: #6b7280; }
.code-dots {
  display: flex;
  gap: 6px;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.dot.red { background: #ef4444; }
.dot.yellow { background: #f59e0b; }
.dot.green { background: #22c55e; }
.code-body {
  margin: 0;
  padding: 14px;
  font-family: 'SF Mono', Monaco, Menlo, monospace;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre;
}
.code-preview.dark .code-body { color: #cdd6f4; }
.code-preview.light .code-body { color: #1f2937; }
.code-meta {
  display: flex;
  gap: 6px;
  padding: 8px 14px;
  border-top: 1px solid rgba(255,255,255,0.1);
}
.code-preview.light .code-meta { border-top-color: #e5e7eb; }
.code-meta-tag {
  font-size: 11px;
  background: rgba(255,255,255,0.1);
  padding: 2px 8px;
  border-radius: 4px;
  color: #9ca3af;
}
.code-preview.light .code-meta-tag {
  background: #e5e7eb;
  color: #6b7280;
}
</style>
