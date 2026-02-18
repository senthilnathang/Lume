<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, FlipVertical2, Layers, ArrowLeftRight, ArrowUpDown } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const isHorizontal = computed(() => props.node.attrs.flipDirection === 'horizontal');

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="flipbox-block-wrapper" :class="{ 'is-selected': selected }" data-type="flipBox">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><FlipVertical2 :size="12" /> Flip Box</span>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>

    <div class="flipbox-preview" contenteditable="false" @click="selectThisNode">
      <div class="flipbox-sides">
        <div
          class="flipbox-side flipbox-front"
          :style="{ background: node.attrs.frontBgColor, borderColor: node.attrs.frontBgColor === '#ffffff' ? '#e5e7eb' : node.attrs.frontBgColor }"
        >
          <div class="flipbox-side-label">FRONT</div>
          <Layers :size="20" class="flipbox-side-icon" />
          <div class="flipbox-side-title">{{ node.attrs.frontTitle }}</div>
          <div class="flipbox-side-desc">{{ node.attrs.frontDescription }}</div>
        </div>

        <div class="flipbox-direction-indicator">
          <component :is="isHorizontal ? ArrowLeftRight : ArrowUpDown" :size="16" />
        </div>

        <div
          class="flipbox-side flipbox-back"
          :style="{ background: node.attrs.backBgColor, color: node.attrs.backTextColor }"
        >
          <div class="flipbox-side-label" :style="{ color: node.attrs.backTextColor }">BACK</div>
          <div class="flipbox-side-title">{{ node.attrs.backTitle }}</div>
          <div class="flipbox-side-desc">{{ node.attrs.backDescription }}</div>
          <div v-if="node.attrs.backLinkUrl" class="flipbox-side-link" :style="{ color: node.attrs.backTextColor }">
            {{ node.attrs.backLinkText }}
          </div>
        </div>
      </div>

      <div class="flipbox-meta">
        <span class="flipbox-meta-tag">{{ isHorizontal ? 'Horizontal' : 'Vertical' }} flip</span>
        <span class="flipbox-meta-tag">{{ node.attrs.height }}px</span>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.flipbox-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 4px;
}
.flipbox-block-wrapper:hover { border-color: #d1d5db; }
.flipbox-block-wrapper.is-selected { border-color: #1677ff; }

.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.flipbox-block-wrapper:hover .block-controls,
.flipbox-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }

.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.flipbox-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
}

.flipbox-sides {
  display: flex;
  align-items: center;
  gap: 8px;
}

.flipbox-side {
  flex: 1;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px solid transparent;
}

.flipbox-front {
  border-color: #e5e7eb;
}

.flipbox-side-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #9ca3af;
  margin-bottom: 4px;
}

.flipbox-side-icon {
  color: #6b7280;
  margin-bottom: 4px;
}

.flipbox-side-title {
  font-size: 13px;
  font-weight: 600;
}

.flipbox-side-desc {
  font-size: 11px;
  opacity: 0.8;
}

.flipbox-side-link {
  font-size: 11px;
  text-decoration: underline;
  margin-top: 4px;
  opacity: 0.9;
}

.flipbox-direction-indicator {
  color: #9ca3af;
  flex-shrink: 0;
}

.flipbox-meta {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}
.flipbox-meta-tag {
  font-size: 11px;
  color: #6b7280;
  background: #e5e7eb;
  padding: 2px 8px;
  border-radius: 4px;
}
</style>
