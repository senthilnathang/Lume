<script setup lang="ts">
import { computed } from 'vue';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  quote?: string;
  authorName?: string;
  authorRole?: string;
  authorImage?: string;
  rating?: number;
  displayStyle?: string;
}>(), {
  quote: 'This is an amazing product!',
  authorName: 'Jane Smith',
  authorRole: 'CEO, Company',
  authorImage: '',
  rating: 5,
  displayStyle: 'card',
});

const containerClasses = computed(() => [
  'lume-testimonial',
  `lume-testimonial--${props.displayStyle}`,
]);

const stars = computed(() => {
  const filled = Math.round(props.rating);
  return Array.from({ length: 5 }, (_, i) => i < filled);
});

const authorInitials = computed(() => {
  return props.authorName
    .split(' ')
    .map(w => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
});
</script>

<template>
  <div :class="containerClasses">
    <div v-if="rating > 0" class="lume-testimonial-rating">
      <span
        v-for="(filled, index) in stars"
        :key="index"
        :class="['lume-testimonial-rating-star', { 'lume-testimonial-rating-star--empty': !filled }]"
      >&#9733;</span>
    </div>
    <p class="lume-testimonial-quote">{{ quote }}</p>
    <div class="lume-testimonial-author">
      <img
        v-if="authorImage"
        :src="authorImage"
        :alt="authorName"
      />
      <div
        v-else
        :style="{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: '#e5e7eb',
          color: '#6b7280',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '600',
          fontSize: '0.875rem',
          flexShrink: 0,
        }"
      >
        {{ authorInitials }}
      </div>
      <div>
        <div class="lume-testimonial-author-name">{{ authorName }}</div>
        <div class="lume-testimonial-author-title">{{ authorRole }}</div>
      </div>
    </div>
  </div>
</template>
