<script setup lang="ts">
import { computed } from 'vue';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  content?: string;
  author?: string;
  authorTitle?: string;
  authorImage?: string;
  borderColor?: string;
  style?: string;
}>(), {
  content: 'Quote text...',
  author: '',
  authorTitle: '',
  authorImage: '',
  borderColor: '#1677ff',
  style: 'default',
});
</script>

<template>
  <figure class="lume-blockquote" :class="`lume-blockquote--${style}`">
    <blockquote :style="{ borderLeftColor: borderColor }">
      <svg class="lume-blockquote-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" :stroke="borderColor" stroke-width="1.5"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
      <p class="lume-blockquote-text">{{ content }}</p>
    </blockquote>
    <figcaption v-if="author" class="lume-blockquote-author">
      <img v-if="authorImage" :src="authorImage" :alt="author" class="lume-blockquote-avatar" />
      <div>
        <cite class="lume-blockquote-name">{{ author }}</cite>
        <span v-if="authorTitle" class="lume-blockquote-role">{{ authorTitle }}</span>
      </div>
    </figcaption>
  </figure>
</template>

<style scoped>
.lume-blockquote { margin: 0; padding: 0; }
.lume-blockquote blockquote {
  margin: 0;
  padding: 20px 24px;
  border-left: 4px solid #1677ff;
  position: relative;
}
.lume-blockquote--modern blockquote {
  border-left: none;
  background: #f9fafb;
  border-radius: 12px;
  padding: 28px 32px;
}
.lume-blockquote--minimal blockquote {
  border-left: none;
  padding: 0;
}
.lume-blockquote-icon {
  margin-bottom: 12px;
  opacity: 0.4;
}
.lume-blockquote-text {
  font-size: 18px;
  line-height: 1.7;
  color: #374151;
  font-style: italic;
  margin: 0;
}
.lume-blockquote-author {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding-left: 28px;
}
.lume-blockquote--modern .lume-blockquote-author { padding-left: 32px; }
.lume-blockquote--minimal .lume-blockquote-author { padding-left: 0; }
.lume-blockquote-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
}
.lume-blockquote-name {
  display: block;
  font-style: normal;
  font-weight: 600;
  color: #1f2937;
  font-size: 15px;
}
.lume-blockquote-role {
  display: block;
  font-size: 13px;
  color: #6b7280;
  margin-top: 2px;
}
</style>
