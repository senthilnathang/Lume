<script lang="ts" setup>
import { AuthenticationForgetPassword } from '@vben/common-ui';

defineOptions({
  name: 'ForgetPassword',
});

async function handleSubmit(values: Record<string, any>) {
  console.log('Password reset request:', values);
  // TODO: Implement password reset API call
}
</script>

<template>
  <AuthenticationForgetPassword :form-schema="[]" :on-submit="handleSubmit" />
</template>
