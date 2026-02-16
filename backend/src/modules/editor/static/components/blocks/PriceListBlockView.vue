<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, List } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const items = computed(() => {
  const raw = props.node.attrs.items;
  if (Array.isArray(raw) && raw.length > 0) return raw;
  return [
    { title: 'Menu Item One', description: 'A delicious first option', price: '$12.00', image: '' },
    { title: 'Menu Item Two', description: 'Another great choice', price: '$15.00', image: '' },
    { title: 'Menu Item Three', description: 'Chef\'s recommendation', price: '$18.00', image: '' },
  ];
});

const showSeparator = computed(() => props.node.attrs.separator !== false);

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="price-list-block-wrapper" :class="{ 'is-selected': selected }" data-type="priceList">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><List :size="12" /> Price List</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="price-list-preview" contenteditable="false" @click="selectThisNode">
      <div
        v-for="(item, index) in items"
        :key="index"
        class="price-item"
        :class="{ 'has-separator': showSeparator && index < items.length - 1 }"
      >
        <div v-if="item.image" class="price-item-image">
          <img :src="item.image" :alt="item.title" />
        </div>
        <div class="price-item-info">
          <div class="price-item-header">
            <span class="price-item-title">{{ item.title }}</span>
            <span class="price-item-dots"></span>
            <span class="price-item-price">{{ item.price }}</span>
          </div>
          <div v-if="item.description" class="price-item-desc">{{ item.description }}</div>
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.price-list-block-wrapper { position: relative; border: 2px dashed transparent; border-radius: 4px; transition: border-color 0.15s; margin: 8px 0; padding: 8px; }
.price-list-block-wrapper:hover { border-color: #d1d5db; }
.price-list-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls { position: absolute; top: -1px; left: -1px; right: -1px; display: flex; align-items: center; gap: 4px; opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none; }
.price-list-block-wrapper:hover .block-controls, .price-list-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.price-list-preview { padding: 12px 0; }
.price-item { display: flex; gap: 12px; padding: 12px 0; }
.price-item.has-separator { border-bottom: 1px solid #e5e7eb; }
.price-item-image { width: 60px; height: 60px; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
.price-item-image img { width: 100%; height: 100%; object-fit: cover; }
.price-item-info { flex: 1; min-width: 0; }
.price-item-header { display: flex; align-items: baseline; gap: 8px; }
.price-item-title { font-weight: 600; font-size: 15px; color: #111827; white-space: nowrap; }
.price-item-dots { flex: 1; border-bottom: 2px dotted #d1d5db; margin-bottom: 4px; min-width: 20px; }
.price-item-price { font-weight: 700; font-size: 15px; color: #1677ff; white-space: nowrap; }
.price-item-desc { font-size: 13px; color: #6b7280; margin-top: 2px; }
</style>
