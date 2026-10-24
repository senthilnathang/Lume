<script setup lang="ts">
import { computed } from 'vue';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  text?: string;
  subtext?: string;
  url?: string;
  icon?: string;
  size?: string;
  variant?: string;
  hoverEffect?: string;
}>(), {
  text: 'Get Started',
  subtext: '',
  url: '',
  icon: '',
  size: 'md',
  variant: 'primary',
  hoverEffect: 'grow',
});

const sizeStyles = computed(() => {
  const sizes: Record<string, Record<string, string>> = {
    sm: { padding: '10px 20px', fontSize: '0.9375rem' },
    md: { padding: '16px 32px', fontSize: '1.125rem' },
    lg: { padding: '20px 40px', fontSize: '1.25rem' },
  };
  return sizes[props.size] || sizes.md;
});

const buttonClasses = computed(() => [
  'lume-marketing-button',
  props.variant === 'gradient' ? 'lume-marketing-button--gradient' : '',
  `lume-marketing-button--hover-${props.hoverEffect}`,
]);
</script>

<template>
  <div style="text-align: center;">
    <a
      :href="url || '#'"
      :class="buttonClasses"
      :style="sizeStyles"
    >
      <span v-if="icon" class="lume-marketing-button-icon">{{ icon }}</span>
      <span>
        {{ text }}
        <span v-if="subtext" class="lume-marketing-button-subtext">{{ subtext }}</span>
      </span>
    </a>
  </div>
</template>
