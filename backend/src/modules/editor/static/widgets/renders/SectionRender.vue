<script setup lang="ts">
import { computed } from 'vue';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  backgroundColor?: string;
  backgroundImage?: string;
  paddingTop?: string | number;
  paddingBottom?: string | number;
  maxWidth?: string | number;
}>(), {
  backgroundColor: 'transparent',
  backgroundImage: '',
  paddingTop: '40',
  paddingBottom: '40',
  maxWidth: '1200',
});

const sectionStyles = computed(() => ({
  backgroundColor: props.backgroundColor,
  backgroundImage: props.backgroundImage ? `url(${props.backgroundImage})` : 'none',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  paddingTop: `${props.paddingTop}px`,
  paddingBottom: `${props.paddingBottom}px`,
}));

const innerStyles = computed(() => ({
  maxWidth: `${props.maxWidth}px`,
  margin: '0 auto',
}));
</script>

<template>
  <section class="lume-section" :style="sectionStyles">
    <div class="lume-section-inner" :style="innerStyles">
      <slot />
    </div>
  </section>
</template>
