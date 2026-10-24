<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Star } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const stars = computed(() => {
  const rating = Number(props.node.attrs.rating) || 0;
  const scale = Number(props.node.attrs.scale) || 5;
  const result = [];
  for (let i = 1; i <= scale; i++) {
    if (i <= Math.floor(rating)) result.push('full');
    else if (i - 0.5 <= rating) result.push('half');
    else result.push('empty');
  }
  return result;
});

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') props.editor.commands.setNodeSelection(pos);
}
</script>

<template>
  <NodeViewWrapper class="star-rating-block-wrapper" :class="{ 'is-selected': selected }" data-type="starRatingBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><Star :size="12" /> Star Rating</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="star-rating-preview" contenteditable="false" @click="selectThisNode">
      <div v-if="node.attrs.title" class="star-title">{{ node.attrs.title }}</div>
      <div class="stars-row">
        <Star
          v-for="(type, i) in stars"
          :key="i"
          :size="node.attrs.size || 24"
          :fill="type === 'full' ? node.attrs.color : type === 'half' ? node.attrs.color : 'none'"
          :stroke="node.attrs.color"
          :style="{ opacity: type === 'empty' ? 0.3 : 1 }"
        />
        <span class="rating-value">{{ node.attrs.rating }}/{{ node.attrs.scale }}</span>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.star-rating-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 4px;
}
.star-rating-block-wrapper:hover { border-color: #d1d5db; }
.star-rating-block-wrapper.is-selected { border-color: #1677ff; }

.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.star-rating-block-wrapper:hover .block-controls,
.star-rating-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }

.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.star-rating-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
}
.star-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}
.stars-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.rating-value {
  margin-left: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
}
</style>
