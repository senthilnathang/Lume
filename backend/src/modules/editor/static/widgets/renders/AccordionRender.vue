<script setup lang="ts">
import { ref, computed } from 'vue';
import '../widget-styles.css';

interface AccordionItem {
  title: string;
  content: string;
  icon?: string;
}

const props = withDefaults(defineProps<{
  items?: AccordionItem[] | string;
  allowMultiple?: boolean;
  defaultOpen?: number;
  style?: string;
}>(), {
  items: () => [],
  allowMultiple: false,
  defaultOpen: 0,
  style: 'default',
});

const parsedItems = computed<AccordionItem[]>(() => {
  if (typeof props.items === 'string') {
    try { return JSON.parse(props.items); } catch { return []; }
  }
  return Array.isArray(props.items) ? props.items : [];
});

const openIndexes = ref<Set<number>>(new Set([props.defaultOpen]));

function toggle(index: number) {
  if (props.allowMultiple) {
    if (openIndexes.value.has(index)) openIndexes.value.delete(index);
    else openIndexes.value.add(index);
  } else {
    if (openIndexes.value.has(index)) openIndexes.value.clear();
    else { openIndexes.value.clear(); openIndexes.value.add(index); }
  }
}
</script>

<template>
  <div class="lume-accordion" :class="`lume-accordion--${style}`">
    <div
      v-for="(item, i) in parsedItems"
      :key="i"
      class="lume-accordion-item"
      :class="{ 'is-open': openIndexes.has(i) }"
    >
      <button class="lume-accordion-header" @click="toggle(i)" :aria-expanded="openIndexes.has(i)">
        <span class="lume-accordion-title">{{ item.title }}</span>
        <svg class="lume-accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="lume-accordion-body" v-show="openIndexes.has(i)">
        <div class="lume-accordion-content" v-html="item.content"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lume-accordion { width: 100%; }

.lume-accordion-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}
.lume-accordion-item.is-open {
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.lume-accordion--bordered .lume-accordion-item {
  border-width: 2px;
}
.lume-accordion--minimal .lume-accordion-item {
  border: none;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 0;
  margin-bottom: 0;
}

.lume-accordion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px 18px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  color: #1f2937;
  transition: background 0.15s;
}
.lume-accordion-header:hover { background: #f9fafb; }

.lume-accordion-chevron {
  transition: transform 0.25s ease;
  flex-shrink: 0;
  color: #6b7280;
}
.lume-accordion-item.is-open .lume-accordion-chevron {
  transform: rotate(180deg);
}

.lume-accordion-body {
  overflow: hidden;
}
.lume-accordion-content {
  padding: 0 18px 16px;
  color: #4b5563;
  line-height: 1.7;
}
</style>
