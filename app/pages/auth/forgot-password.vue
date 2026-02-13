<script setup lang="ts">
definePageMeta({ layout: false });

const email = ref('');
const submitted = ref(false);
const error = ref('');
const isLoading = ref(false);

async function handleSubmit() {
  error.value = '';
  isLoading.value = true;
  try {
    await $fetch('/api/v1/auth/password/forgot', {
      method: 'POST',
      body: { email: email.value },
    });
    submitted.value = true;
  } catch (err: any) {
    error.value = err?.data?.message || 'Something went wrong.';
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
        <p class="mt-2 text-sm text-gray-500">Reset your password</p>
      </div>

      <div v-if="submitted" class="p-4 text-sm text-green-700 bg-green-50 rounded-lg border border-green-200">
        If an account with that email exists, you will receive a password reset link.
      </div>

      <template v-else>
        <div v-if="error" class="p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
          {{ error }}
        </div>
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">Email Address</label>
            <input id="email" v-model="email" type="email" required autocomplete="email"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Enter your email" />
          </div>
          <button type="submit" :disabled="isLoading"
            class="w-full py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors">
            {{ isLoading ? 'Sending...' : 'Send Reset Link' }}
          </button>
        </form>
      </template>

      <div class="text-center text-sm">
        <NuxtLink to="/auth/login" class="text-primary-600 hover:text-primary-500">
          Back to sign in
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
