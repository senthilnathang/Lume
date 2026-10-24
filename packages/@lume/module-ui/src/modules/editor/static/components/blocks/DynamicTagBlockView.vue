<script setup lang="ts">
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import { computed } from 'vue'

const props = defineProps(nodeViewProps)

const tagName = computed(() => props.node.attrs.tagName || 'site_name')
const fieldKey = computed(() => props.node.attrs.fieldKey || '')

const tagLabels: Record<string, string> = {
  site_name: 'Site Name',
  current_year: 'Year',
  current_date: 'Date',
  page_title: 'Page Title',
  page_url: 'Page URL',
  post_date: 'Post Date',
  post_author: 'Post Author',
  post_excerpt: 'Post Excerpt',
  post_terms: 'Post Terms',
  comments_count: 'Comments Count',
  author_name: 'Author Name',
  author_avatar: 'Author Avatar',
  user_name: 'User Name',
  archive_title: 'Archive Title',
  custom_field: 'Custom Field',
}

const displayText = computed(() => {
  if (tagName.value === 'custom_field' && fieldKey.value) {
    return '{Custom: ' + fieldKey.value + '}'
  }
  return '{' + (tagLabels[tagName.value] || tagName.value) + '}'
})
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
