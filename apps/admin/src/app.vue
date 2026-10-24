<template>
  <a-config-provider :theme="tokenTheme">
    <RouterView />
  </a-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { theme } from 'ant-design-vue';
import { RouterView } from 'vue-router';
import { useLumeTheme } from '@/composables/useLumeTheme';

const { isDark, primaryColor, borderRadius, fontSize, compact } = useLumeTheme();

const tokenTheme = computed(() => ({
  token: {
    colorPrimary: primaryColor.value,
    colorSuccess: '#22c55e',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    borderRadius: borderRadius.value,
    controlHeight: 36,
    controlHeightLG: 40,
    controlHeightSM: 28,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  components: {
    Button: {
      fontWeight: 500,
      paddingInline: 16,
      paddingInlineLG: 20,
      paddingInlineSM: 12,
      primaryShadow: '0 2px 0 rgba(79, 70, 229, 0.06)',
      defaultShadow: '0 2px 0 rgba(0, 0, 0, 0.02)',
      dangerShadow: '0 2px 0 rgba(239, 68, 68, 0.06)',
      defaultBorderColor: '#d1d5db',
      defaultColor: '#374151',
      defaultBg: '#ffffff',
      defaultHoverBorderColor: '#4f46e5',
      defaultHoverColor: '#4f46e5',
      contentFontSize: 14,
      contentFontSizeLG: 15,
      contentFontSizeSM: 13,
    },
  },
  algorithm: [
    ...(isDark.value ? [theme.darkAlgorithm] : [theme.defaultAlgorithm]),
    ...(compact.value ? [theme.compactAlgorithm] : []),
  ],
  fontSize: fontSize.value,
}));</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
}

* {
  box-sizing: border-box;
}
</style>
