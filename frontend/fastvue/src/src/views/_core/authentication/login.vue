<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/form';

import { computed, onMounted, ref } from 'vue';

import { AuthenticationLogin } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Alert, Checkbox } from 'ant-design-vue';

import { useAuthStore } from '#/store';

defineOptions({
  name: 'Login',
});

const authStore = useAuthStore();

const loading = ref(false);
const errorMessage = ref<string | null>(null);
const rememberMe = ref(false);

// Check for saved username
onMounted(() => {
  const savedUsername = localStorage.getItem('fastvue_remembered_username');
  if (savedUsername) {
    rememberMe.value = true;
  }
});

const formSchema = computed((): VbenFormSchema[] => {
  const savedUsername = localStorage.getItem('fastvue_remembered_username') || '';

  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('authentication.usernamePlaceholder') || 'Enter your username',
        size: 'large',
        allowClear: true,
      },
      defaultValue: savedUsername,
      fieldName: 'username',
      label: $t('authentication.username') || 'Username',
      rules: 'required',
    },
    {
      component: 'InputPassword',
      componentProps: {
        placeholder: $t('authentication.passwordPlaceholder') || 'Enter your password',
        size: 'large',
      },
      fieldName: 'password',
      label: $t('authentication.password') || 'Password',
      rules: 'required',
    },
  ];
});

async function handleLogin(values: Record<string, any>) {
  errorMessage.value = null;
  loading.value = true;

  try {
    // Save username if remember me is checked
    if (rememberMe.value) {
      localStorage.setItem('fastvue_remembered_username', values.username);
    } else {
      localStorage.removeItem('fastvue_remembered_username');
    }

    await authStore.authLogin({
      username: values.username,
      password: values.password,
    });
  } catch (error: any) {
    // Extract error message
    errorMessage.value =
      error?.response?.data?.error ||
      error?.response?.data?.detail ||
      error?.message ||
      'Login failed. Please check your credentials.';
  } finally {
    loading.value = false;
  }
}

function handleRememberMeChange(checked: boolean) {
  rememberMe.value = checked;
  if (!checked) {
    localStorage.removeItem('fastvue_remembered_username');
  }
}
</script>

<template>
  <div class="w-full">
    <!-- Error Alert -->
    <Alert
      v-if="errorMessage"
      :message="errorMessage"
      type="error"
      show-icon
      closable
      class="mb-4"
      @close="errorMessage = null"
    />

    <AuthenticationLogin
      :form-schema="formSchema"
      :loading="loading"
      :show-code-login="false"
      :show-forget-password="true"
      :show-qrcode-login="false"
      :show-register="false"
      :show-remember-me="true"
      :show-third-party-login="false"
      @submit="handleLogin"
    >
      <template #rememberMe>
        <div class="flex items-center justify-between w-full">
          <Checkbox
            :checked="rememberMe"
            @change="(e: any) => handleRememberMeChange(e.target.checked)"
          >
            {{ $t('authentication.rememberMe') || 'Remember me' }}
          </Checkbox>
        </div>
      </template>
    </AuthenticationLogin>
  </div>
</template>
