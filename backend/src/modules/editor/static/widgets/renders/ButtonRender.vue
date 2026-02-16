<script setup lang="ts">
import { computed } from 'vue';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  text?: string;
  url?: string;
  variant?: string;
  size?: string;
  alignment?: string;
  fullWidth?: boolean;
}>(), {
  text: 'Click Me',
  url: '',
  variant: 'primary',
  size: 'md',
  alignment: 'left',
  fullWidth: false,
});

const buttonClasses = computed(() => [
  'lume-button',
  `lume-button--${props.variant}`,
  `lume-button--${props.size}`,
]);

const buttonStyle = computed(() =>
  props.fullWidth ? { display: 'block', width: '100%' } : {}
);
</script>

<template>
  <div class="lume-button-wrapper" :style="{ textAlign: alignment }">
    <a :href="url || '#'" :class="buttonClasses" :style="buttonStyle">
      {{ text }}
    </a>
  </div>
</template>
