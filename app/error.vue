<script setup lang="ts">
import type { NuxtError } from '#app';

const props = defineProps<{
  error: NuxtError;
}>();

const handleError = () => clearError({ redirect: '/' });

const statusCode = computed(() => props.error?.statusCode || 500);
const message = computed(() => {
  if (statusCode.value === 404) return 'Page not found';
  if (statusCode.value === 403) return 'Access forbidden';
  return 'Something went wrong';
});
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background">
    <div class="text-center">
      <h1 class="font-heading text-6xl font-bold text-primary">
        {{ statusCode }}
      </h1>
      <p class="mt-4 text-lg text-muted-foreground">
        {{ message }}
      </p>
      <button
        class="btn btn-primary mt-8"
        @click="handleError"
      >
        Go Home
      </button>
    </div>
  </div>
</template>
