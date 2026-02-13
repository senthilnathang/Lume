<script setup lang="ts">
/**
 * Skeleton Loading Components
 *
 * Provides various skeleton loading states for better UX.
 *
 * Usage:
 * ```vue
 * <Skeleton type="card" />
 * <Skeleton type="table" :rows="5" />
 * <Skeleton type="list" :items="3" />
 * ```
 */

import { computed } from 'vue';

type SkeletonType =
  | 'text'
  | 'avatar'
  | 'card'
  | 'table'
  | 'list'
  | 'stat'
  | 'chart'
  | 'form';

interface Props {
  type?: SkeletonType;
  rows?: number;
  items?: number;
  columns?: number;
  animated?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  rows: 3,
  items: 3,
  columns: 4,
  animated: true,
});

const animationClass = computed(() => (props.animated ? 'animate-pulse' : ''));
</script>

<template>
  <!-- Text Skeleton -->
  <div v-if="type === 'text'" :class="['space-y-2', animationClass]">
    <div class="h-4 bg-gray-200 rounded w-3/4"></div>
    <div class="h-4 bg-gray-200 rounded w-full"></div>
    <div class="h-4 bg-gray-200 rounded w-5/6"></div>
  </div>

  <!-- Avatar Skeleton -->
  <div v-else-if="type === 'avatar'" :class="['flex items-center gap-3', animationClass]">
    <div class="w-10 h-10 bg-gray-200 rounded-full"></div>
    <div class="space-y-2 flex-1">
      <div class="h-4 bg-gray-200 rounded w-1/3"></div>
      <div class="h-3 bg-gray-200 rounded w-1/2"></div>
    </div>
  </div>

  <!-- Card Skeleton -->
  <div
    v-else-if="type === 'card'"
    :class="['bg-white rounded-lg border p-4 space-y-4', animationClass]"
  >
    <div class="flex items-center gap-3">
      <div class="w-12 h-12 bg-gray-200 rounded"></div>
      <div class="space-y-2 flex-1">
        <div class="h-4 bg-gray-200 rounded w-1/2"></div>
        <div class="h-3 bg-gray-200 rounded w-1/3"></div>
      </div>
    </div>
    <div class="space-y-2">
      <div class="h-3 bg-gray-200 rounded w-full"></div>
      <div class="h-3 bg-gray-200 rounded w-5/6"></div>
    </div>
  </div>

  <!-- Table Skeleton -->
  <div v-else-if="type === 'table'" :class="['space-y-3', animationClass]">
    <!-- Header -->
    <div class="flex gap-4 pb-3 border-b">
      <div
        v-for="i in columns"
        :key="`th-${i}`"
        class="h-4 bg-gray-200 rounded flex-1"
      ></div>
    </div>
    <!-- Rows -->
    <div v-for="r in rows" :key="`row-${r}`" class="flex gap-4 py-3 border-b">
      <div
        v-for="c in columns"
        :key="`cell-${r}-${c}`"
        class="h-4 bg-gray-200 rounded flex-1"
        :class="{ 'w-1/2': c === 1 }"
      ></div>
    </div>
  </div>

  <!-- List Skeleton -->
  <div v-else-if="type === 'list'" :class="['space-y-4', animationClass]">
    <div
      v-for="i in items"
      :key="`list-${i}`"
      class="flex items-center gap-4 p-4 bg-white rounded-lg border"
    >
      <div class="w-12 h-12 bg-gray-200 rounded-lg"></div>
      <div class="flex-1 space-y-2">
        <div class="h-4 bg-gray-200 rounded w-1/3"></div>
        <div class="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
      <div class="h-8 w-20 bg-gray-200 rounded"></div>
    </div>
  </div>

  <!-- Stat Card Skeleton -->
  <div
    v-else-if="type === 'stat'"
    :class="['bg-white rounded-lg border p-6', animationClass]"
  >
    <div class="flex items-center justify-between">
      <div class="space-y-3 flex-1">
        <div class="h-3 bg-gray-200 rounded w-1/2"></div>
        <div class="h-8 bg-gray-200 rounded w-2/3"></div>
        <div class="h-3 bg-gray-200 rounded w-1/3"></div>
      </div>
      <div class="w-16 h-16 bg-gray-200 rounded-full"></div>
    </div>
  </div>

  <!-- Chart Skeleton -->
  <div
    v-else-if="type === 'chart'"
    :class="['bg-white rounded-lg border p-4 space-y-4', animationClass]"
  >
    <div class="flex justify-between items-center">
      <div class="h-5 bg-gray-200 rounded w-1/4"></div>
      <div class="h-8 w-24 bg-gray-200 rounded"></div>
    </div>
    <div class="h-64 bg-gray-200 rounded"></div>
  </div>

  <!-- Form Skeleton -->
  <div v-else-if="type === 'form'" :class="['space-y-6', animationClass]">
    <div v-for="i in rows" :key="`form-${i}`" class="space-y-2">
      <div class="h-4 bg-gray-200 rounded w-1/4"></div>
      <div class="h-10 bg-gray-200 rounded w-full"></div>
    </div>
    <div class="flex gap-3 justify-end">
      <div class="h-10 w-24 bg-gray-200 rounded"></div>
      <div class="h-10 w-24 bg-gray-200 rounded"></div>
    </div>
  </div>
</template>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
