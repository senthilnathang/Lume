<script setup lang="ts">
definePageMeta({ layout: 'default' });
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] p-6">
    <div class="text-center">
      <h1 class="text-6xl font-bold text-gray-200">404</h1>
      <p class="text-lg text-gray-500 mt-4">Page not found</p>
      <p class="text-sm text-gray-400 mt-2">The page you're looking for doesn't exist or has been moved.</p>
      <NuxtLink to="/dashboard"
        class="inline-block mt-6 px-6 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
        Go to Dashboard
      </NuxtLink>
    </div>
  </div>
</template>
