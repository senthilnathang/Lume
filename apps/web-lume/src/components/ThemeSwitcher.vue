<template>
  <a-dropdown trigger="click">
    <a-button type="text" :title="isDark ? 'Switch to light' : 'Switch to dark'">
      <template #icon>
        <span v-if="isDark">☀</span>
        <span v-else>🌙</span>
      </template>
    </a-button>
    <template #overlay>
      <a-menu style="min-width: 220px">
        <a-menu-item key="toggle" @click="toggleTheme">
          Switch to {{ isDark ? 'light' : 'dark' }} mode
        </a-menu-item>
        <a-menu-sub-menu key="mode" title="Theme mode">
          <a-menu-item key="light" @click="setThemeMode('light')">Light</a-menu-item>
          <a-menu-item key="dark" @click="setThemeMode('dark')">Dark</a-menu-item>
          <a-menu-item key="auto" @click="setThemeMode('auto')">System</a-menu-item>
        </a-menu-sub-menu>
        <a-menu-divider />
        <a-menu-item key="presets" disabled>Presets</a-menu-item>
        <div class="theme-swatches">
          <span
            v-for="preset in LUME_THEME_PRESETS"
            :key="preset.name"
            class="theme-swatch"
            :class="{ active: primaryColor === preset.color }"
            :style="{ backgroundColor: preset.color }"
            :title="preset.name"
            @click.stop="applyPreset(preset.name)"
          />
        </div>
        <a-menu-divider />
        <a-menu-item key="reset" @click="resetTheme">Reset to defaults</a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>
<script setup lang="ts">
import { useLumeTheme, LUME_THEME_PRESETS } from '@/composables/useLumeTheme';

const { isDark, primaryColor, toggleTheme, setThemeMode, applyPreset, resetTheme } = useLumeTheme();
</script>
<style scoped>
.theme-swatches {
  display: flex;
  gap: 8px;
  padding: 4px 12px 8px;
  flex-wrap: wrap;
}
.theme-swatch {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
}
.theme-swatch.active {
  border-color: #1677ff;
}
</style>
