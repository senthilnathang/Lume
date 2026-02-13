<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

definePageMeta({
  layout: false,
});

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const form = reactive({
  username: '',
  password: '',
  totp_code: '',
});

const showTwoFactor = ref(false);
const error = ref('');
const isLoading = ref(false);

async function handleLogin() {
  error.value = '';
  isLoading.value = true;

  try {
    const result = await authStore.login({
      username: form.username,
      password: form.password,
      totp_code: showTwoFactor.value ? form.totp_code : undefined,
    });

    if (result.requires2FA) {
      showTwoFactor.value = true;
      return;
    }

    const redirect = (route.query.redirect as string) || '/dashboard';
    await navigateTo(redirect);
  } catch (err: any) {
    error.value = err?.data?.message || err?.statusMessage || 'Login failed. Please try again.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
      <!-- Logo & Title -->
      <div class="text-center">
        <h1 class="text-3xl font-heading font-bold text-primary-700">Lume</h1>
        <p class="mt-2 text-sm text-gray-500">Sign in to your account</p>
      </div>

      <!-- Error -->
      <div v-if="error" class="p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
        {{ error }}
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <!-- Username / Email -->
        <div>
          <label for="username" class="block text-sm font-medium text-gray-700">
            Username or Email
          </label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            required
            autocomplete="username"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            placeholder="Enter your username or email"
          />
        </div>

        <!-- Password -->
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
            autocomplete="current-password"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            placeholder="Enter your password"
          />
        </div>

        <!-- 2FA Code -->
        <div v-if="showTwoFactor">
          <label for="totp" class="block text-sm font-medium text-gray-700">
            Two-Factor Code
          </label>
          <input
            id="totp"
            v-model="form.totp_code"
            type="text"
            required
            autocomplete="one-time-code"
            maxlength="6"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm tracking-widest text-center"
            placeholder="000000"
          />
        </div>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="isLoading"
          class="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg v-if="isLoading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ isLoading ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>

      <!-- Links -->
      <div class="flex items-center justify-between text-sm">
        <NuxtLink to="/auth/forgot-password" class="text-primary-600 hover:text-primary-500">
          Forgot password?
        </NuxtLink>
        <NuxtLink to="/auth/register" class="text-primary-600 hover:text-primary-500">
          Create account
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
