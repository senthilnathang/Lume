<script setup lang="ts">
import { computed } from 'vue';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  width?: string;
}>(), {
  width: '',
});

const columnStyles = computed(() => ({
  width: props.width || undefined,
  flex: props.width ? 'none' : '1',
}));
</script>

<template>
  <div class="lume-column" :style="columnStyles">
    <slot />
  </div>
</template>
