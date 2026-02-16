<script setup lang="ts">
import { computed } from 'vue';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  pageType?: string;
  count?: number;
  columns?: number;
  showExcerpt?: boolean;
  showImage?: boolean;
  showDate?: boolean;
  orderBy?: string;
}>(), {
  pageType: 'all',
  count: 6,
  columns: 3,
  showExcerpt: true,
  showImage: true,
  showDate: true,
  orderBy: 'newest',
});

const gridClass = computed(() => {
  if (props.columns === 2) return 'lume-posts-grid lume-posts-grid--cols-2';
  if (props.columns === 4) return 'lume-posts-grid lume-posts-grid--cols-4';
  return 'lume-posts-grid';
});

const placeholders = computed(() =>
  Array.from({ length: props.count }, (_, i) => ({
    id: i,
    title: `Post Title ${i + 1}`,
    excerpt: 'This is a placeholder excerpt for the post card. In production, real content would appear here.',
    date: 'Jan 15, 2026',
  }))
);
</script>

<template>
  <div :class="gridClass">
    <div
      v-for="card in placeholders"
      :key="card.id"
      class="lume-post-card"
    >
      <div
        v-if="showImage"
        class="lume-post-card-image"
        style="background-color: var(--lume-bg-subtle); display: flex; align-items: center; justify-content: center; color: var(--lume-text-muted); font-size: 0.8125rem;"
      >
        Image Placeholder
      </div>
      <div class="lume-post-card-body">
        <div v-if="showDate" class="lume-post-card-date">{{ card.date }}</div>
        <h4 class="lume-post-card-title">{{ card.title }}</h4>
        <p v-if="showExcerpt" class="lume-post-card-excerpt">{{ card.excerpt }}</p>
      </div>
    </div>
  </div>
</template>
