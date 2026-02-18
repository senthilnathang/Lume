<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  tagName?: string;
}>()

const resolvedValue = computed(() => {
  switch (props.tagName) {
    case 'site_name':
      return 'Lume'; // Could be injected from siteSettings
    case 'current_year':
      return new Date().getFullYear().toString();
    case 'current_date':
      return new Date().toLocaleDateString();
    case 'page_title':
      return document?.title || '';
    case 'page_url':
      return typeof window !== 'undefined' ? window.location.href : '';
    default:
      return `{${props.tagName}}`;
  }
})
</script>

<template>
  <span class="dynamic-tag-value">{{ resolvedValue }}</span>
</template>

<style scoped>
.dynamic-tag-value {
  /* No special styling — renders as inline text */
}
</style>
