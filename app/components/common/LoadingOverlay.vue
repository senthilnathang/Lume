<script setup lang="ts">
defineProps<{
  show: boolean;
  text?: string;
}>();
</script>

<template>
  <Transition name="fade">
    <div v-if="show" class="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-xl">
      <div class="flex flex-col items-center gap-3">
        <svg class="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span v-if="text" class="text-sm text-gray-500">{{ text }}</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
