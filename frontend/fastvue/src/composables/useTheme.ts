import { computed } from 'vue';

import { preferences, updatePreferences } from '@vben/preferences';

/**
 * HRMS Theme presets
 */
export const HRMS_THEME_PRESETS = [
  {
    name: 'Professional Blue',
    color: 'hsl(212 100% 45%)',
    type: 'default',
  },
  {
    name: 'Corporate Green',
    color: 'hsl(161 90% 43%)',
    type: 'green',
  },
  {
    name: 'Modern Purple',
    color: 'hsl(245 82% 67%)',
    type: 'violet',
  },
  {
    name: 'Executive Gray',
    color: 'hsl(240 5% 26%)',
    type: 'zinc',
  },
  {
    name: 'Warm Orange',
    color: 'hsl(18 89% 40%)',
    type: 'orange',
  },
  {
    name: 'Deep Blue',
    color: 'hsl(211 91% 39%)',
    type: 'deep-blue',
  },
] as const;

export type ThemeMode = 'dark' | 'light' | 'auto';
export type LayoutType = 'full-content' | 'header-nav' | 'mixed-nav' | 'sidebar-mixed-nav' | 'sidebar-nav';

/**
 * Composable for theme customization
 *
 * Usage:
 * const { isDark, toggleTheme, setThemeColor, currentLayout } = useTheme();
 */
export function useTheme() {
  // Current theme mode
  const themeMode = computed(() => preferences.theme.mode);
  const isDark = computed(() => preferences.theme.mode === 'dark');

  // Current primary color
  const primaryColor = computed(() => preferences.theme.colorPrimary);

  // Current layout
  const currentLayout = computed(() => preferences.app.layout);

  // Sidebar settings
  const sidebarCollapsed = computed(() => preferences.sidebar.collapsed);
  const sidebarWidth = computed(() => preferences.sidebar.width);

  // Toggle between dark and light mode
  function toggleTheme() {
    updatePreferences({
      theme: {
        mode: isDark.value ? 'light' : 'dark',
      },
    });
  }

  // Set specific theme mode
  function setThemeMode(mode: ThemeMode) {
    updatePreferences({
      theme: {
        mode,
      },
    });
  }

  // Set primary color using HSL string
  function setThemeColor(color: string) {
    updatePreferences({
      theme: {
        colorPrimary: color,
      },
    });
  }

  // Set builtin theme type
  function setBuiltinTheme(type: string) {
    updatePreferences({
      theme: {
        builtinType: type as any,
      },
    });
  }

  // Apply HRMS preset theme
  function applyHrmsPreset(presetName: string) {
    const preset = HRMS_THEME_PRESETS.find((p) => p.name === presetName);
    if (preset) {
      setThemeColor(preset.color);
      setBuiltinTheme(preset.type);
    }
  }

  // Set layout type
  function setLayout(layout: LayoutType) {
    updatePreferences({
      app: {
        layout,
      },
    });
  }

  // Toggle sidebar collapse
  function toggleSidebar() {
    updatePreferences({
      sidebar: {
        collapsed: !sidebarCollapsed.value,
      },
    });
  }

  // Set sidebar width
  function setSidebarWidth(width: number) {
    updatePreferences({
      sidebar: {
        width,
      },
    });
  }

  // Set border radius
  function setBorderRadius(radius: string) {
    updatePreferences({
      theme: {
        radius,
      },
    });
  }

  // Set font size
  function setFontSize(size: number) {
    updatePreferences({
      theme: {
        fontSize: size,
      },
    });
  }

  // Enable/disable color weak mode (accessibility)
  function setColorWeakMode(enable: boolean) {
    updatePreferences({
      app: {
        colorWeakMode: enable,
      },
    });
  }

  // Enable/disable gray mode
  function setGrayMode(enable: boolean) {
    updatePreferences({
      app: {
        colorGrayMode: enable,
      },
    });
  }

  // Enable/disable watermark
  function setWatermark(enable: boolean, content?: string) {
    updatePreferences({
      app: {
        watermark: enable,
        watermarkContent: content || '',
      },
    });
  }

  // Reset theme to defaults
  function resetTheme() {
    updatePreferences({
      theme: {
        builtinType: 'default',
        colorPrimary: 'hsl(212 100% 45%)',
        mode: 'light',
        radius: '0.5',
        fontSize: 16,
      },
    });
  }

  return {
    // State
    themeMode,
    isDark,
    primaryColor,
    currentLayout,
    sidebarCollapsed,
    sidebarWidth,
    // Presets
    HRMS_THEME_PRESETS,
    // Actions
    toggleTheme,
    setThemeMode,
    setThemeColor,
    setBuiltinTheme,
    applyHrmsPreset,
    setLayout,
    toggleSidebar,
    setSidebarWidth,
    setBorderRadius,
    setFontSize,
    setColorWeakMode,
    setGrayMode,
    setWatermark,
    resetTheme,
  };
}
