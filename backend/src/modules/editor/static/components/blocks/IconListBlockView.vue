<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, List, CheckCircle, ArrowRight, Star, Zap, Heart, Shield, Circle } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const iconMap: Record<string, any> = {
  check: CheckCircle,
  arrow: ArrowRight,
  star: Star,
  zap: Zap,
  heart: Heart,
  shield: Shield,
  circle: Circle,
};

const items = computed(() => {
  const raw = props.node.attrs.items;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw) {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
});

const defaultItems = [
  { text: 'First list item', icon: 'check', link: '' },
  { text: 'Second list item', icon: 'check', link: '' },
  { text: 'Third list item', icon: 'check', link: '' },
];

const displayItems = computed(() => items.value.length > 0 ? items.value : defaultItems);

function getIcon(name: string) {
  return iconMap[name] || CheckCircle;
}

const layoutStyles = computed(() => ({
  flexDirection: props.node.attrs.layout === 'horizontal' ? 'row' : 'column',
  flexWrap: props.node.attrs.layout === 'horizontal' ? 'wrap' : 'nowrap',
} as Record<string, string>));

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="icon-list-block-wrapper" :class="{ 'is-selected': selected }" data-type="iconList">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><List :size="12" /> Icon List</span>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>
    <div contenteditable="false" class="icon-list-preview" :style="layoutStyles" @click="selectThisNode">
      <div
        v-for="(item, idx) in displayItems"
        :key="idx"
        class="icon-list-item"
        :class="{ 'has-connector': node.attrs.connector && idx < displayItems.length - 1 && node.attrs.layout !== 'horizontal' }"
      >
        <div class="icon-list-icon" :style="{ color: node.attrs.iconColor || '#3b82f6' }">
          <component :is="getIcon(item.icon)" :size="node.attrs.iconSize || 20" />
        </div>
        <span class="icon-list-text">{{ item.text }}</span>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.icon-list-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 8px;
}
.icon-list-block-wrapper:hover { border-color: #d1d5db; }
.icon-list-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.icon-list-block-wrapper:hover .block-controls,
.icon-list-block-wrapper.is-selected .block-controls {
  opacity: 1; pointer-events: all;
}
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.icon-list-preview {
  display: flex;
  gap: 12px;
  padding: 12px 0;
}
.icon-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  padding: 4px 0;
}
.icon-list-item.has-connector::after {
  content: '';
  position: absolute;
  left: 9px;
  top: 100%;
  width: 2px;
  height: 12px;
  background: #e5e7eb;
}
.icon-list-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.icon-list-text {
  font-size: 14px;
  color: #374151;
  line-height: 1.4;
}
</style>
