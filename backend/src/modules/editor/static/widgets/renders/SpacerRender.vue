<script setup lang="ts">
import '../widget-styles.css';

withDefaults(defineProps<{
  height?: number | string;
}>(), {
  height: 40,
});
</script>

<template>
  <div class="lume-spacer" :style="{ height: height + 'px' }" />
</template>
