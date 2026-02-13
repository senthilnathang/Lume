<script setup lang="ts">
definePageMeta({ middleware: 'auth' });
</script>

<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-heading font-bold text-gray-900">Quiz Dashboard</h1>
    <p class="text-sm text-gray-500">Quiz module will be available after Business module migration (Phase 3B)</p>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div v-for="item in ['Quiz List', 'Questions Bank', 'Analytics', 'My Attempts']"
        :key="item"
        class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 opacity-60">
        <h3 class="text-sm font-medium text-gray-900">{{ item }}</h3>
        <p class="text-xs text-gray-400 mt-1">Coming soon</p>
      </div>
    </div>
  </div>
</template>
