<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
}>();

defineEmits<{
  action: [];
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 px-6">
    <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
      <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    </div>
    <p class="text-gray-500 font-medium">{{ title || 'No data' }}</p>
    <p v-if="description" class="text-sm text-gray-400 mt-1 max-w-md text-center">{{ description }}</p>
    <NuxtLink v-if="actionTo" :to="actionTo"
      class="mt-4 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
      {{ actionLabel || 'Get Started' }}
    </NuxtLink>
    <button v-else-if="actionLabel" @click="$emit('action')"
      class="mt-4 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
      {{ actionLabel }}
    </button>
  </div>
</template>
