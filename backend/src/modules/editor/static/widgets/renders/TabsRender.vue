<script setup lang="ts">
import { ref, computed } from 'vue';
import '../widget-styles.css';

interface Tab {
  title: string;
  content: string;
}

const props = withDefaults(defineProps<{
  tabs?: Tab[] | string;
  defaultActive?: number;
  style?: string;
  position?: string;
}>(), {
  tabs: () => [],
  defaultActive: 0,
  style: 'default',
  position: 'top',
});

const parsedTabs = computed<Tab[]>(() => {
  if (typeof props.tabs === 'string') {
    try { return JSON.parse(props.tabs); } catch { return []; }
  }
  return Array.isArray(props.tabs) ? props.tabs : [];
});

const activeIndex = ref(props.defaultActive);

function setActive(index: number) {
  activeIndex.value = index;
}
</script>

<template>
  <div class="lume-tabs" :class="[`lume-tabs--${style}`, `lume-tabs--${position}`]">
    <div class="lume-tabs-nav" role="tablist">
      <button
        v-for="(tab, i) in parsedTabs"
        :key="i"
        class="lume-tabs-tab"
        :class="{ 'is-active': activeIndex === i }"
        role="tab"
        :aria-selected="activeIndex === i"
        @click="setActive(i)"
      >
        {{ tab.title }}
      </button>
    </div>
    <div class="lume-tabs-content">
      <div
        v-for="(tab, i) in parsedTabs"
        :key="i"
        v-show="activeIndex === i"
        class="lume-tabs-panel"
        role="tabpanel"
      >
        <div v-html="tab.content"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lume-tabs { width: 100%; }
.lume-tabs--left { display: flex; gap: 16px; }
.lume-tabs--right { display: flex; flex-direction: row-reverse; gap: 16px; }
.lume-tabs--left .lume-tabs-nav,
.lume-tabs--right .lume-tabs-nav { flex-direction: column; border-bottom: none; min-width: 150px; }

.lume-tabs-nav {
  display: flex;
  gap: 0;
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 16px;
}
.lume-tabs-tab {
  padding: 10px 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  color: #6b7280;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
  white-space: nowrap;
}
.lume-tabs-tab:hover { color: #374151; }
.lume-tabs-tab.is-active { color: #1677ff; border-bottom-color: #1677ff; }

/* Pills style */
.lume-tabs--pills .lume-tabs-nav { border-bottom: none; gap: 6px; }
.lume-tabs--pills .lume-tabs-tab {
  border-radius: 8px;
  border-bottom: none;
  margin-bottom: 0;
}
.lume-tabs--pills .lume-tabs-tab.is-active {
  background: #1677ff;
  color: white;
}

/* Underline style */
.lume-tabs--underline .lume-tabs-tab { border-bottom-width: 3px; }

.lume-tabs-content { flex: 1; }
.lume-tabs-panel { line-height: 1.7; color: #374151; }
</style>
