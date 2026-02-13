<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

definePageMeta({
  layout: false,
});

const authStore = useAuthStore();

const form = reactive({
  full_name: '',
  email: '',
  username: '',
  password: '',
  confirm_password: '',
});

const error = ref('');
const isLoading = ref(false);

async function handleRegister() {
  error.value = '';

  if (form.password !== form.confirm_password) {
    error.value = 'Passwords do not match';
    return;
  }

  isLoading.value = true;
  try {
    await authStore.register({
      full_name: form.full_name,
      email: form.email,
      username: form.username,
      password: form.password,
    });
    await navigateTo('/dashboard');
  } catch (err: any) {
    error.value = err?.data?.message || err?.statusMessage || 'Registration failed.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
      <div class="text-center">
        <h1 class="text-3xl font-heading font-bold text-primary-700">Lume</h1>
        <p class="mt-2 text-sm text-gray-500">Create your account</p>
      </div>

      <div v-if="error" class="p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
        {{ error }}
      </div>

      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label for="full_name" class="block text-sm font-medium text-gray-700">Full Name</label>
          <input id="full_name" v-model="form.full_name" type="text" required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
        </div>
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
          <input id="email" v-model="form.email" type="email" required autocomplete="email"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
        </div>
        <div>
          <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
          <input id="username" v-model="form.username" type="text" required autocomplete="username"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
          <input id="password" v-model="form.password" type="password" required autocomplete="new-password"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
        </div>
        <div>
          <label for="confirm_password" class="block text-sm font-medium text-gray-700">Confirm Password</label>
          <input id="confirm_password" v-model="form.confirm_password" type="password" required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
        </div>

        <button type="submit" :disabled="isLoading"
          class="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors">
          {{ isLoading ? 'Creating account...' : 'Create Account' }}
        </button>
      </form>

      <div class="text-center text-sm">
        <NuxtLink to="/auth/login" class="text-primary-600 hover:text-primary-500">
          Already have an account? Sign in
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
