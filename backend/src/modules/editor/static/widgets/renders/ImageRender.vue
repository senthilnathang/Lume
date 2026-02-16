<script setup lang="ts">
import '../widget-styles.css';

withDefaults(defineProps<{
  src?: string;
  alt?: string;
  caption?: string;
  alignment?: string;
  width?: string;
  link?: string;
}>(), {
  src: '',
  alt: '',
  caption: '',
  alignment: 'center',
  width: '100%',
  link: '',
});
</script>

<template>
  <figure class="lume-image" :style="{ textAlign: alignment }">
    <a v-if="link" :href="link" target="_blank" rel="noopener noreferrer">
      <img v-if="src" :src="src" :alt="alt" :style="{ maxWidth: width }" />
    </a>
    <img v-else-if="src" :src="src" :alt="alt" :style="{ maxWidth: width }" />
    <figcaption v-if="caption">{{ caption }}</figcaption>
  </figure>
</template>
