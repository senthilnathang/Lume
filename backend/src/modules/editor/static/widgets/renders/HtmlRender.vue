<script setup lang="ts">
import '../widget-styles.css';

withDefaults(defineProps<{
  content?: string;
}>(), {
  content: '',
});
</script>

<template>
  <div class="lume-html" v-html="content" />
</template>
