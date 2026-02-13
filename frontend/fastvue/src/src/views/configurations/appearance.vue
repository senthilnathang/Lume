<script lang="ts" setup>
import type { BuiltinThemeType, ThemeModeType } from '@vben/types';

import { computed } from 'vue';

import { Page } from '@vben/common-ui';
import {
  PreferenceBlock,
  PreferenceBuiltinTheme,
  PreferenceColorMode,
  PreferenceFontFamily,
  PreferenceFontSize,
  PreferenceRadius,
  PreferenceTheme,
} from '@vben/layouts';
import { $t } from '@vben/locales';
import {
  preferences,
  resetPreferences,
  updatePreferences,
  usePreferences,
} from '@vben/preferences';

import { Button, Card, message } from 'ant-design-vue';

const { isDark } = usePreferences();

// Computed two-way bindings for appearance settings
const themeMode = computed<ThemeModeType>({
  get: () => preferences.theme.mode,
  set: (v) => updatePreferences({ theme: { mode: v } }),
});

const themeBuiltinType = computed<BuiltinThemeType>({
  get: () => preferences.theme.builtinType,
  set: (v) => updatePreferences({ theme: { builtinType: v } }),
});

const themeColorPrimary = computed<string>({
  get: () => preferences.theme.colorPrimary,
  set: (v) => updatePreferences({ theme: { colorPrimary: v } }),
});

const themeRadius = computed<string>({
  get: () => preferences.theme.radius,
  set: (v) => updatePreferences({ theme: { radius: v } }),
});

const themeFontSize = computed<number>({
  get: () => preferences.theme.fontSize,
  set: (v) => updatePreferences({ theme: { fontSize: v } }),
});

const themeFontFamily = computed<string>({
  get: () => preferences.theme.fontFamily,
  set: (v) => updatePreferences({ theme: { fontFamily: v } }),
});

const themeSemiDarkSidebar = computed<boolean>({
  get: () => preferences.theme.semiDarkSidebar,
  set: (v) => updatePreferences({ theme: { semiDarkSidebar: v } }),
});

const themeSemiDarkHeader = computed<boolean>({
  get: () => preferences.theme.semiDarkHeader,
  set: (v) => updatePreferences({ theme: { semiDarkHeader: v } }),
});

const appColorGrayMode = computed<boolean>({
  get: () => preferences.app.colorGrayMode,
  set: (v) => updatePreferences({ app: { colorGrayMode: v } }),
});

const appColorWeakMode = computed<boolean>({
  get: () => preferences.app.colorWeakMode,
  set: (v) => updatePreferences({ app: { colorWeakMode: v } }),
});

function handleReset() {
  resetPreferences();
  message.success('Appearance settings reset to defaults');
}
</script>

<template>
  <Page
    :title="$t('preferences.appearance')"
    description="Configure the look and feel of the application"
  >
    <div class="max-w-2xl">
      <Card class="mb-4">
        <PreferenceBlock :title="$t('preferences.theme.title')">
          <PreferenceTheme
            v-model="themeMode"
            v-model:theme-semi-dark-sidebar="themeSemiDarkSidebar"
            v-model:theme-semi-dark-header="themeSemiDarkHeader"
          />
        </PreferenceBlock>
      </Card>

      <Card class="mb-4">
        <PreferenceBlock :title="$t('preferences.theme.builtin.title')">
          <PreferenceBuiltinTheme
            v-model="themeBuiltinType"
            v-model:theme-color-primary="themeColorPrimary"
            :is-dark="isDark"
          />
        </PreferenceBlock>
      </Card>

      <Card class="mb-4">
        <PreferenceBlock :title="$t('preferences.theme.radius')">
          <PreferenceRadius v-model="themeRadius" />
        </PreferenceBlock>
      </Card>

      <Card class="mb-4">
        <PreferenceBlock :title="$t('preferences.theme.fontSize')">
          <PreferenceFontSize v-model="themeFontSize" />
        </PreferenceBlock>
      </Card>

      <Card class="mb-4">
        <PreferenceBlock :title="$t('preferences.theme.fontFamily')">
          <PreferenceFontFamily v-model="themeFontFamily" />
        </PreferenceBlock>
      </Card>

      <Card class="mb-4">
        <PreferenceBlock :title="$t('preferences.other')">
          <PreferenceColorMode
            v-model:app-color-gray-mode="appColorGrayMode"
            v-model:app-color-weak-mode="appColorWeakMode"
          />
        </PreferenceBlock>
      </Card>

      <div class="mt-4">
        <Button @click="handleReset">Reset to Defaults</Button>
      </div>
    </div>
  </Page>
</template>
