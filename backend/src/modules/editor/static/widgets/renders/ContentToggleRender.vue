<script setup lang="ts">
import { ref } from 'vue';
import '../widget-styles.css';

withDefaults(defineProps<{
  primaryLabel?: string;
  secondaryLabel?: string;
  primaryContent?: string;
  secondaryContent?: string;
  displayStyle?: string;
}>(), {
  primaryLabel: 'Option A',
  secondaryLabel: 'Option B',
  primaryContent: 'Content for option A',
  secondaryContent: 'Content for option B',
  displayStyle: 'switch',
});

const active = ref<'primary' | 'secondary'>('primary');
</script>

<template>
  <div class="lume-content-toggle">
    <div class="lume-toggle-switch">
      <button
        :class="['lume-toggle-option', { 'lume-toggle-option--active': active === 'primary' }]"
        @click="active = 'primary'"
      >
        {{ primaryLabel }}
      </button>
      <button
        :class="['lume-toggle-option', { 'lume-toggle-option--active': active === 'secondary' }]"
        @click="active = 'secondary'"
      >
        {{ secondaryLabel }}
      </button>
    </div>
    <div class="lume-toggle-content">
      <div v-if="active === 'primary'" v-html="primaryContent" />
      <div v-else v-html="secondaryContent" />
    </div>
  </div>
</template>
