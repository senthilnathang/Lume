<script lang="ts" setup>
import { Spin } from 'ant-design-vue';

defineOptions({
  name: 'LoadingOverlay',
});

withDefaults(
  defineProps<{
    loading: boolean;
    tip?: string;
    size?: 'small' | 'default' | 'large';
    fullscreen?: boolean;
  }>(),
  {
    loading: false,
    tip: 'Loading...',
    size: 'default',
    fullscreen: false,
  }
);
</script>

<template>
  <div class="loading-overlay-wrapper" :class="{ 'loading-overlay-wrapper--fullscreen': fullscreen }">
    <Spin
      :spinning="loading"
      :tip="tip"
      :size="size"
      class="loading-overlay-spinner"
    >
      <slot />
    </Spin>
  </div>
</template>

<style scoped>
.loading-overlay-wrapper {
  position: relative;
  min-height: 100px;
}

.loading-overlay-wrapper--fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-overlay-spinner {
  width: 100%;
  height: 100%;
}

:root.dark .loading-overlay-wrapper--fullscreen {
  background: rgba(0, 0, 0, 0.8);
}
</style>
