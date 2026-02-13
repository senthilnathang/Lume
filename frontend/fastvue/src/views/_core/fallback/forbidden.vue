<script lang="ts" setup>
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, Result } from 'ant-design-vue';

defineOptions({
  name: 'FallbackForbidden',
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
      status="403"
      title="403"
      sub-title="Sorry, you are not authorized to access this page."
    >
      <template #extra>
        <Button type="default" @click="goBack">Go Back</Button>
        <Button type="primary" @click="goHome">Back to Home</Button>
      </template>
    </Result>
  </Page>
</template>
