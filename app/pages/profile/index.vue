<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

definePageMeta({ middleware: 'auth' });

const authStore = useAuthStore();
const user = computed(() => authStore.user);

const passwordForm = reactive({
  current_password: '',
  new_password: '',
  confirm_password: '',
});

const isChangingPassword = ref(false);
const passwordError = ref('');
const passwordSuccess = ref('');

async function changePassword() {
  passwordError.value = '';
  passwordSuccess.value = '';

  if (passwordForm.new_password !== passwordForm.confirm_password) {
    passwordError.value = 'Passwords do not match';
    return;
  }

  isChangingPassword.value = true;
  try {
    await $fetch('/api/v1/auth/password/change', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      },
    });
    passwordSuccess.value = 'Password changed successfully';
    passwordForm.current_password = '';
    passwordForm.new_password = '';
    passwordForm.confirm_password = '';
  } catch (err: any) {
    passwordError.value = err?.data?.message || 'Failed to change password';
  } finally {
    isChangingPassword.value = false;
  }
}
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto space-y-6">
    <h1 class="text-2xl font-heading font-bold text-gray-900">My Profile</h1>

    <!-- Profile Info -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="text-sm text-gray-500">Full Name</label>
          <p class="text-sm font-medium text-gray-900">{{ user?.full_name }}</p>
        </div>
        <div>
          <label class="text-sm text-gray-500">Email</label>
          <p class="text-sm font-medium text-gray-900">{{ user?.email }}</p>
        </div>
        <div>
          <label class="text-sm text-gray-500">Username</label>
          <p class="text-sm font-medium text-gray-900">{{ user?.username }}</p>
        </div>
        <div>
          <label class="text-sm text-gray-500">Two-Factor Auth</label>
          <p class="text-sm font-medium" :class="user?.two_factor_enabled ? 'text-green-600' : 'text-gray-400'">
            {{ user?.two_factor_enabled ? 'Enabled' : 'Disabled' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Change Password -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>

      <div v-if="passwordSuccess" class="mb-4 p-3 text-sm text-green-700 bg-green-50 rounded-lg border border-green-200">
        {{ passwordSuccess }}
      </div>
      <div v-if="passwordError" class="mb-4 p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
        {{ passwordError }}
      </div>

      <form @submit.prevent="changePassword" class="space-y-4 max-w-md">
        <div>
          <label class="block text-sm font-medium text-gray-700">Current Password</label>
          <input v-model="passwordForm.current_password" type="password" required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">New Password</label>
          <input v-model="passwordForm.new_password" type="password" required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Confirm New Password</label>
          <input v-model="passwordForm.confirm_password" type="password" required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
        </div>
        <button type="submit" :disabled="isChangingPassword"
          class="py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors">
          {{ isChangingPassword ? 'Changing...' : 'Change Password' }}
        </button>
      </form>
    </div>
  </div>
</template>
