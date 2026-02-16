<script setup lang="ts">
import '../widget-styles.css';

withDefaults(defineProps<{
  firstText?: string;
  secondText?: string;
  tag?: string;
  firstColor?: string;
  secondColor?: string;
  alignment?: string;
}>(), {
  firstText: 'Welcome to',
  secondText: 'Our Website',
  tag: 'h1',
  firstColor: '#000000',
  secondColor: '#3b82f6',
  alignment: 'center',
});
</script>

<template>
  <div class="lume-dual-heading" :style="{ textAlign: alignment }">
    <component :is="tag" style="margin: 0; line-height: 1.3">
      <span class="lume-dual-heading-first" :style="{ color: firstColor }">{{ firstText }} </span>
      <span class="lume-dual-heading-second" :style="{ color: secondColor }">{{ secondText }}</span>
    </component>
  </div>
</template>
