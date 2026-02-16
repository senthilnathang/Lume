<script setup lang="ts">
import { computed } from 'vue';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  src?: string;
  aspectRatio?: string;
  autoplay?: boolean;
}>(), {
  src: '',
  aspectRatio: '16:9',
  autoplay: false,
});

const embedUrl = computed(() => {
  if (!props.src) return '';
  const ytMatch = props.src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = props.src.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return props.src;
});

const aspectClass = computed(() =>
  `lume-video--${props.aspectRatio.replace(':', '-')}`
);
</script>

<template>
  <div :class="['lume-video', aspectClass]">
    <iframe
      v-if="embedUrl"
      :src="embedUrl"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
    />
    <div v-else class="lume-video-placeholder">
      No video source provided
    </div>
  </div>
</template>
