<script setup lang="ts">
import { ref } from 'vue';
import '../widget-styles.css';

interface FaqItem {
  question: string;
  answer: string;
}

const props = withDefaults(defineProps<{
  items?: FaqItem[];
  displayStyle?: string;
  iconPosition?: string;
  activeColor?: string;
}>(), {
  items: () => [],
  displayStyle: 'accordion',
  iconPosition: 'right',
  activeColor: '#3b82f6',
});

const openIndices = ref<Set<number>>(new Set());

function toggle(index: number) {
  if (props.displayStyle === 'accordion') {
    if (openIndices.value.has(index)) {
      openIndices.value.delete(index);
    } else {
      openIndices.value.clear();
      openIndices.value.add(index);
    }
  } else {
    if (openIndices.value.has(index)) {
      openIndices.value.delete(index);
    } else {
      openIndices.value.add(index);
    }
  }
}

function isOpen(index: number): boolean {
  return openIndices.value.has(index);
}
</script>

<template>
  <div class="lume-faq">
    <div
      v-for="(item, index) in items"
      :key="index"
      :class="['lume-faq-item', { 'lume-faq-item--open': isOpen(index) }]"
    >
      <button
        class="lume-faq-question"
        :style="isOpen(index) ? { color: activeColor } : {}"
        @click="toggle(index)"
      >
        {{ item.question }}
      </button>
      <div class="lume-faq-answer">
        <div class="lume-faq-answer-inner">
          {{ item.answer }}
        </div>
      </div>
    </div>
  </div>
</template>
