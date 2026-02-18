<script setup lang="ts">
import { computed, inject, ref } from 'vue'

const props = defineProps<{
  tagName?: string;
  fieldKey?: string;
}>()

// These can be injected by the parent page renderer
const pageContext = inject<Record<string, any>>('pageContext', {})
const siteSettings = inject<Record<string, any>>('siteSettings', {})

const resolvedValue = computed(() => {
  switch (props.tagName) {
    case 'site_name':
      return siteSettings.site_name || siteSettings.siteName || 'Lume';
    case 'current_year':
      return new Date().getFullYear().toString();
    case 'current_date':
      return new Date().toLocaleDateString();
    case 'page_title':
      return pageContext.title || (typeof document !== 'undefined' ? document.title : '');
    case 'page_url':
      return typeof window !== 'undefined' ? window.location.href : '';
    case 'post_date':
      return pageContext.publishedAt
        ? new Date(pageContext.publishedAt).toLocaleDateString()
        : pageContext.createdAt
          ? new Date(pageContext.createdAt).toLocaleDateString()
          : '';
    case 'post_author':
      return pageContext.authorName || pageContext.author?.name || '';
    case 'post_excerpt':
      return pageContext.excerpt || '';
    case 'post_terms':
      if (Array.isArray(pageContext.terms)) {
        return pageContext.terms.map((t: any) => t.name || t).join(', ');
      }
      return pageContext.pageType || '';
    case 'comments_count':
      return String(pageContext.commentsCount ?? 0);
    case 'author_name':
      return pageContext.authorName || pageContext.author?.name || '';
    case 'author_avatar':
      return pageContext.authorAvatar || pageContext.author?.avatar || '';
    case 'user_name':
      return pageContext.userName || '';
    case 'archive_title':
      return pageContext.archiveTitle || '';
    case 'custom_field':
      if (props.fieldKey && pageContext.customFields) {
        return pageContext.customFields[props.fieldKey] || '';
      }
      if (props.fieldKey && pageContext.meta) {
        return pageContext.meta[props.fieldKey] || '';
      }
      return '';
    default:
      return `{${props.tagName}}`;
  }
})
</script>

<template>
  <span class="dynamic-tag-value">
    <template v-if="tagName === 'author_avatar' && resolvedValue">
      <img :src="resolvedValue" alt="Author avatar" class="dynamic-tag-avatar" />
    </template>
    <template v-else>
      {{ resolvedValue }}
    </template>
  </span>
</template>

<style scoped>
.dynamic-tag-value {
  /* Renders as inline text */
}
.dynamic-tag-avatar {
  display: inline-block;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  vertical-align: middle;
}
</style>
