<script setup lang="ts">
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import { computed } from 'vue'

const props = defineProps(nodeViewProps)

const tagName = computed(() => props.node.attrs.tagName || 'site_name')

const tagLabels: Record<string, string> = {
  site_name: 'Site Name',
  current_year: 'Year',
  current_date: 'Date',
  page_title: 'Page Title',
  page_url: 'Page URL',
}

const displayText = computed(() => '{' + (tagLabels[tagName.value] || tagName.value) + '}')
</script>

<template>
  <NodeViewWrapper as="span" class="dynamic-tag-chip">
    {{ displayText }}
  </NodeViewWrapper>
</template>

<style scoped>
.dynamic-tag-chip {
  display: inline;
  background: #dbeafe;
  color: #1d4ed8;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 0.85em;
  font-weight: 500;
  cursor: default;
  white-space: nowrap;
}
</style>
