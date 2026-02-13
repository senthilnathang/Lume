<script setup lang="ts">
import { computed } from 'vue';

import { $t } from '@vben/locales';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@vben-core/shadcn-ui';

defineOptions({
  name: 'PreferenceFontFamily',
});

const modelValue = defineModel<string>({
  default: 'system-ui',
});

// Font family options with display name and CSS value
// Google Fonts are loaded in index.html
const fontFamilyOptions = computed(() => [
  {
    label: $t('preferences.theme.fontFamilySystem'),
    value: 'system-ui',
    preview: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  {
    label: 'Inter',
    value: '"Inter", sans-serif',
    preview: '"Inter", sans-serif',
  },
  {
    label: 'Roboto',
    value: '"Roboto", sans-serif',
    preview: '"Roboto", sans-serif',
  },
  {
    label: 'Open Sans',
    value: '"Open Sans", sans-serif',
    preview: '"Open Sans", sans-serif',
  },
  {
    label: 'Lato',
    value: '"Lato", sans-serif',
    preview: '"Lato", sans-serif',
  },
  {
    label: 'Poppins',
    value: '"Poppins", sans-serif',
    preview: '"Poppins", sans-serif',
  },
  {
    label: 'Nunito',
    value: '"Nunito", sans-serif',
    preview: '"Nunito", sans-serif',
  },
  {
    label: 'Source Sans 3',
    value: '"Source Sans 3", sans-serif',
    preview: '"Source Sans 3", sans-serif',
  },
  {
    label: 'Ubuntu',
    value: '"Ubuntu", sans-serif',
    preview: '"Ubuntu", sans-serif',
  },
  {
    label: 'Noto Sans',
    value: '"Noto Sans", sans-serif',
    preview: '"Noto Sans", sans-serif',
  },
  {
    label: 'Arial',
    value: 'Arial, sans-serif',
    preview: 'Arial, sans-serif',
  },
  {
    label: 'Helvetica',
    value: 'Helvetica, Arial, sans-serif',
    preview: 'Helvetica, Arial, sans-serif',
  },
  {
    label: 'Georgia',
    value: 'Georgia, serif',
    preview: 'Georgia, serif',
  },
  {
    label: 'Times New Roman',
    value: '"Times New Roman", Times, serif',
    preview: '"Times New Roman", Times, serif',
  },
  {
    label: 'Courier New',
    value: '"Courier New", Courier, monospace',
    preview: '"Courier New", Courier, monospace',
  },
]);

const selectedFont = computed(() => {
  return fontFamilyOptions.value.find((f) => f.value === modelValue.value);
});
</script>

<template>
  <div class="flex w-full flex-col gap-4">
    <Select v-model="modelValue">
      <SelectTrigger class="w-full">
        <SelectValue :placeholder="$t('preferences.theme.fontFamily')">
          <span :style="{ fontFamily: selectedFont?.preview }">
            {{ selectedFont?.label }}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          v-for="font in fontFamilyOptions"
          :key="font.value"
          :value="font.value"
          :style="{ fontFamily: font.preview }"
        >
          {{ font.label }}
        </SelectItem>
      </SelectContent>
    </Select>
    <div class="text-muted-foreground text-xs">
      {{ $t('preferences.theme.fontFamilyTip') }}
    </div>
  </div>
</template>
