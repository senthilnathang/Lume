<script setup lang="ts">
import { computed, ref } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, HelpCircle, ChevronDown, ChevronUp } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const openIndex = ref<number | null>(0);

const items = computed(() => {
  const raw = props.node.attrs.items;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw) {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
});

function toggle(idx: number) {
  openIndex.value = openIndex.value === idx ? null : idx;
}

const defaultItems = [
  { question: 'What is your return policy?', answer: 'We offer a 30-day return policy on all items.' },
  { question: 'How long does shipping take?', answer: 'Standard shipping takes 5-7 business days.' },
  { question: 'Do you offer support?', answer: 'Yes, we offer 24/7 customer support.' },
];

const displayItems = computed(() => items.value.length > 0 ? items.value : defaultItems);

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="faq-block-wrapper" :class="{ 'is-selected': selected }" data-type="faq">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><HelpCircle :size="12" /> FAQ</span>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>
    <div contenteditable="false" class="faq-preview" @click="selectThisNode">
      <div
        v-for="(item, idx) in displayItems"
        :key="idx"
        class="faq-item"
        :class="{ 'is-open': openIndex === idx }"
      >
        <div
          class="faq-question"
          :class="{ 'icon-left': node.attrs.iconPosition === 'left' }"
          :style="openIndex === idx ? { color: node.attrs.activeColor || '#3b82f6' } : {}"
          @click="toggle(idx)"
        >
          <ChevronDown v-if="node.attrs.iconPosition === 'left' && openIndex !== idx" :size="16" />
          <ChevronUp v-if="node.attrs.iconPosition === 'left' && openIndex === idx" :size="16" />
          <span class="faq-question-text">{{ item.question }}</span>
          <ChevronDown v-if="node.attrs.iconPosition !== 'left' && openIndex !== idx" :size="16" />
          <ChevronUp v-if="node.attrs.iconPosition !== 'left' && openIndex === idx" :size="16" />
        </div>
        <div v-if="openIndex === idx" class="faq-answer">
          {{ item.answer }}
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.faq-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 8px;
}
.faq-block-wrapper:hover { border-color: #d1d5db; }
.faq-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.faq-block-wrapper:hover .block-controls,
.faq-block-wrapper.is-selected .block-controls {
  opacity: 1; pointer-events: all;
}
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.faq-preview {
  padding: 8px 0;
}
.faq-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;
}
.faq-item.is-open {
  border-color: #d1d5db;
}
.faq-question {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  color: #111827;
  user-select: none;
  transition: color 0.15s;
}
.faq-question.icon-left {
  flex-direction: row;
}
.faq-question-text {
  flex: 1;
}
.faq-answer {
  padding: 0 16px 14px;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
}
</style>
