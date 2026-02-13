<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

definePageMeta({ layout: false });

const authStore = useAuthStore();

onMounted(() => {
  if (import.meta.client) {
    const token = localStorage.getItem('access_token');
    if (token) {
      navigateTo('/dashboard');
    } else {
      navigateTo('/auth/login');
    }
  }
});
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50">
    <div class="text-center text-gray-400">
      Redirecting...
    </div>
  </div>
</template>
