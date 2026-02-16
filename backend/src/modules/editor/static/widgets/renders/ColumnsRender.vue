<script setup lang="ts">
import '../widget-styles.css';

withDefaults(defineProps<{
  columns?: number;
  gap?: string | number;
  layout?: string;
}>(), {
  columns: 2,
  gap: '24',
  layout: 'equal',
});
</script>

<template>
  <div class="lume-columns" :style="{ gap: gap + 'px' }">
    <slot />
  </div>
</template>
