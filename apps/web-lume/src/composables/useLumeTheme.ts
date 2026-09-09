import { ref, computed } from 'vue';

export const LUME_THEME_PRESETS = [
  { name: 'Professional Blue', color: '#4f46e5', type: 'default' },
  { name: 'Corporate Green', color: '#059669', type: 'green' },
  { name: 'Modern Purple', color: '#7c3aed', type: 'violet' },
  { name: 'Executive Gray', color: '#3f3f46', type: 'zinc' },
  { name: 'Warm Orange', color: '#c2410c', type: 'orange' },
  { name: 'Deep Blue', color: '#1d4ed8', type: 'deep-blue' },
] as const;

export type LumeThemeMode = 'dark' | 'light' | 'auto';
export type LumeLayoutType = 'sidebar' | 'topnav' | 'mixed';

export interface LumeThemeState {
  mode: LumeThemeMode;
  colorPrimary: string;
  builtinType: string;
  radius: number;
  fontSize: number;
  layout: LumeLayoutType;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  compact: boolean;
}

const STORAGE_KEY = 'lume-theme';

const DEFAULTS: LumeThemeState = {
  mode: 'light',
  colorPrimary: '#4f46e5',
  builtinType: 'default',
  radius: 6,
  fontSize: 14,
  layout: 'sidebar',
  sidebarCollapsed: false,
  sidebarWidth: 220,
  compact: false,
};

function loadState(): LumeThemeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

const state = ref<LumeThemeState>(loadState());
const mediaQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null;
const systemDark = ref(mediaQuery?.matches ?? false);

if (mediaQuery && typeof mediaQuery.addEventListener === 'function') {
  mediaQuery.addEventListener('change', (event) => {
    systemDark.value = event.matches;
    applyDomTheme();
  });
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value));
  } catch {
    /* storage unavailable (private mode) */
  }
}

function applyDomTheme() {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('lume-dark', resolvedDark.value);
  document.documentElement.style.setProperty('--lume-primary', state.value.colorPrimary);
  document.documentElement.style.setProperty('--lume-radius', `${state.value.radius}px`);
  document.documentElement.style.setProperty('--lume-font-size', `${state.value.fontSize}px`);
}

const resolvedDark = computed(
  () => state.value.mode === 'dark' || (state.value.mode === 'auto' && systemDark.value)
);

export function useLumeTheme() {
  const themeMode = computed(() => state.value.mode);
  const isDark = computed(() => resolvedDark.value);
  const primaryColor = computed(() => state.value.colorPrimary);
  const currentLayout = computed(() => state.value.layout);
  const sidebarCollapsed = computed(() => state.value.sidebarCollapsed);
  const sidebarWidth = computed(() => state.value.sidebarWidth);

  function setThemeMode(mode: LumeThemeMode) {
    state.value.mode = mode;
    persist();
    applyDomTheme();
  }

  function toggleTheme() {
    setThemeMode(resolvedDark.value ? 'light' : 'dark');
  }

  function setThemeColor(color: string) {
    state.value.colorPrimary = color;
    const preset = LUME_THEME_PRESETS.find((p) => p.color === color);
    if (preset) state.value.builtinType = preset.type;
    persist();
    applyDomTheme();
  }

  function applyPreset(presetName: string) {
    const preset = LUME_THEME_PRESETS.find((p) => p.name === presetName);
    if (preset) setThemeColor(preset.color);
  }

  function setLayout(layout: LumeLayoutType) {
    state.value.layout = layout;
    persist();
  }

  function toggleSidebar() {
    state.value.sidebarCollapsed = !state.value.sidebarCollapsed;
    persist();
  }

  function setSidebarWidth(width: number) {
    state.value.sidebarWidth = Math.max(160, Math.min(320, width));
    persist();
  }

  function setBorderRadius(radius: number) {
    state.value.radius = Math.max(0, Math.min(16, radius));
    persist();
    applyDomTheme();
  }

  function setFontSize(size: number) {
    state.value.fontSize = Math.max(12, Math.min(18, size));
    persist();
    applyDomTheme();
  }

  function setCompact(compact: boolean) {
    state.value.compact = compact;
    persist();
  }

  function resetTheme() {
    state.value = { ...DEFAULTS };
    persist();
    applyDomTheme();
  }

  applyDomTheme();

  return {
    themeMode,
    isDark,
    primaryColor,
    borderRadius: computed(() => state.value.radius),
    fontSize: computed(() => state.value.fontSize),
    compact: computed(() => state.value.compact),
    currentLayout,
    sidebarCollapsed,
    sidebarWidth,
    LUME_THEME_PRESETS,
    toggleTheme,
    setThemeMode,
    setThemeColor,
    applyPreset,
    setLayout,
    toggleSidebar,
    setSidebarWidth,
    setBorderRadius,
    setFontSize,
    setCompact,
    resetTheme,
  };
}
