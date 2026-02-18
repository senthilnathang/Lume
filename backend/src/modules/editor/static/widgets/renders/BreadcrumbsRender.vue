<script setup lang="ts">
import { computed } from 'vue';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  separator?: string;
  homeLabel?: string;
  showCurrent?: boolean;
  fontSize?: number;
  color?: string;
}>(), {
  separator: '/',
  homeLabel: 'Home',
  showCurrent: true,
  fontSize: 14,
  color: '#6b7280',
});

const crumbs = computed(() => {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  const parts = path.split('/').filter(Boolean);
  const result = [{ label: props.homeLabel, url: '/' }];
  let url = '';
  parts.forEach((part, i) => {
    url += '/' + part;
    const label = part.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    result.push({
      label,
      url: i < parts.length - 1 ? url : '',
    });
  });
  return result;
});
</script>

<template>
  <nav class="lume-breadcrumbs" :style="{ fontSize: fontSize + 'px', color }" aria-label="Breadcrumb">
    <ol class="lume-breadcrumbs-list">
      <li v-for="(crumb, i) in crumbs" :key="i" class="lume-breadcrumbs-item">
        <a v-if="crumb.url && (showCurrent || i < crumbs.length - 1)" :href="crumb.url" class="lume-breadcrumbs-link">{{ crumb.label }}</a>
        <span v-else class="lume-breadcrumbs-current" :class="{ 'is-last': i === crumbs.length - 1 }">{{ crumb.label }}</span>
        <span v-if="i < crumbs.length - 1" class="lume-breadcrumbs-sep" aria-hidden="true">{{ separator }}</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.lume-breadcrumbs-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 0;
}
.lume-breadcrumbs-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.lume-breadcrumbs-link {
  color: inherit;
  text-decoration: none;
  transition: color 0.15s;
}
.lume-breadcrumbs-link:hover {
  color: #1677ff;
  text-decoration: underline;
}
.lume-breadcrumbs-current.is-last {
  font-weight: 500;
  color: #374151;
}
.lume-breadcrumbs-sep {
  margin: 0 4px;
  opacity: 0.5;
}
</style>
