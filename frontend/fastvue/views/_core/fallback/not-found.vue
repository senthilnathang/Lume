<script lang="ts" setup>
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, Result } from 'ant-design-vue';

defineOptions({
  name: 'FallbackNotFound',
});

const router = useRouter();

function goBack() {
  router.go(-1);
}

function goHome() {
  router.push('/');
}
</script>

<template>
  <Page auto-content-height>
    <Result
      status="404"
      title="404"
      sub-title="Sorry, the page you visited does not exist."
    >
      <template #extra>
        <Button type="default" @click="goBack">Go Back</Button>
        <Button type="primary" @click="goHome">Back to Home</Button>
      </template>
    </Result>
  </Page>
</template>
