<script setup lang="ts">
import { computed, ref } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, ChevronsUpDown, ChevronDown } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

interface AccordionItem {
  title: string;
  content: string;
  icon: string;
}

const items = computed<AccordionItem[]>(() => {
  try {
    const parsed = JSON.parse(props.node.attrs.items || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
});

const openIndexes = ref<Set<number>>(new Set([props.node.attrs.defaultOpen ?? 0]));

function toggleItem(index: number) {
  if (props.node.attrs.allowMultiple) {
    if (openIndexes.value.has(index)) openIndexes.value.delete(index);
    else openIndexes.value.add(index);
  } else {
    if (openIndexes.value.has(index)) openIndexes.value.clear();
    else { openIndexes.value.clear(); openIndexes.value.add(index); }
  }
}

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') props.editor.commands.setNodeSelection(pos);
}
</script>

<template>
  <NodeViewWrapper class="accordion-block-wrapper" :class="{ 'is-selected': selected }" data-type="accordionBlock">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><ChevronsUpDown :size="12" /> Accordion</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="accordion-preview" contenteditable="false" @click="selectThisNode">
      <div v-if="items.length === 0" class="accordion-empty">
        <ChevronsUpDown :size="24" />
        <span>Add accordion items in settings</span>
      </div>
      <div v-else class="accordion-items">
        <div v-for="(item, i) in items" :key="i" class="accordion-item" :class="{ open: openIndexes.has(i) }">
          <div class="accordion-item-header" @click.stop="toggleItem(i)">
            <span>{{ item.title || `Item ${i + 1}` }}</span>
            <ChevronDown :size="14" :class="{ rotated: openIndexes.has(i) }" />
          </div>
          <div v-if="openIndexes.has(i)" class="accordion-item-body">
            {{ item.content || 'No content' }}
          </div>
        </div>
      </div>
      <div class="accordion-meta">
        <span class="accordion-meta-tag">{{ items.length }} items</span>
        <span class="accordion-meta-tag">{{ node.attrs.style }}</span>
        <span v-if="node.attrs.allowMultiple" class="accordion-meta-tag">Multi-open</span>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.accordion-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 4px;
}
.accordion-block-wrapper:hover { border-color: #d1d5db; }
.accordion-block-wrapper.is-selected { border-color: #1677ff; }

.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.accordion-block-wrapper:hover .block-controls,
.accordion-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }

.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.accordion-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
}
.accordion-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #9ca3af;
  padding: 16px;
  justify-content: center;
}
.accordion-items { display: flex; flex-direction: column; gap: 4px; }
.accordion-item {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}
.accordion-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  background: white;
}
.accordion-item-header:hover { background: #f9fafb; }
.accordion-item-body {
  padding: 10px 14px;
  font-size: 12px;
  color: #6b7280;
  border-top: 1px solid #e5e7eb;
  background: white;
}
.rotated { transform: rotate(180deg); transition: transform 0.2s; }
.accordion-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
}
.accordion-meta-tag {
  font-size: 11px;
  color: #6b7280;
  background: #e5e7eb;
  padding: 2px 8px;
  border-radius: 4px;
}
</style>
