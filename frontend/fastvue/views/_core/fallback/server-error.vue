<script lang="ts" setup>
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, Result } from 'ant-design-vue';

defineOptions({
  name: 'FallbackServerError',
});

const router = useRouter();

function goBack() {
  router.go(-1);
}

function goHome() {
  router.push('/');
}

function refreshPage() {
  window.location.reload();
}
</script>

<template>
  <Page auto-content-height>
    <Result
      status="500"
      title="500"
      sub-title="Sorry, something went wrong on our server. Please try again later."
    >
      <template #extra>
        <Button type="default" @click="goBack">Go Back</Button>
        <Button type="default" @click="refreshPage">Refresh Page</Button>
        <Button type="primary" @click="goHome">Back to Home</Button>
      </template>
    </Result>
  </Page>
</template>
