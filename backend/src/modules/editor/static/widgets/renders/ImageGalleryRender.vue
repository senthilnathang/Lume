<script setup lang="ts">
import { computed } from 'vue';
import '../widget-styles.css';

interface GalleryImage {
  src: string;
  alt?: string;
  caption?: string;
}

const props = withDefaults(defineProps<{
  images?: GalleryImage[];
  columns?: number;
  gap?: string;
  lightbox?: boolean;
  displayStyle?: string;
}>(), {
  images: () => [],
  columns: 3,
  gap: '16px',
  lightbox: true,
  displayStyle: 'grid',
});

const galleryClasses = computed(() => [
  'lume-image-gallery',
  `lume-image-gallery--cols-${props.columns}`,
  props.displayStyle === 'masonry' ? 'lume-image-gallery--masonry' : '',
]);

const galleryStyle = computed(() => ({
  gap: props.gap,
  ...(props.displayStyle === 'masonry' ? { columnGap: props.gap } : {}),
}));
</script>

<template>
  <div :class="galleryClasses" :style="galleryStyle">
    <div
      v-for="(image, index) in images"
      :key="index"
      class="lume-gallery-item"
    >
      <img :src="image.src" :alt="image.alt || ''" />
      <div v-if="image.caption" class="lume-gallery-caption">
        {{ image.caption }}
      </div>
    </div>
  </div>
</template>
