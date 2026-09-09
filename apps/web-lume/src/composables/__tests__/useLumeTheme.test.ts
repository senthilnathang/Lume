import { describe, it, expect, beforeEach } from 'vitest';
import { useLumeTheme, LUME_THEME_PRESETS } from '../useLumeTheme';

describe('useLumeTheme (FastVue theme port)', () => {
  beforeEach(() => {
    localStorage.clear();
    const { resetTheme } = useLumeTheme();
    resetTheme();
  });

  it('ships six presets', () => {
    expect(LUME_THEME_PRESETS).toHaveLength(6);
    expect(LUME_THEME_PRESETS[0].name).toBe('Professional Blue');
  });

  it('toggles dark mode and persists', () => {
    const first = useLumeTheme();
    expect(first.isDark.value).toBe(false);
    first.toggleTheme();
    expect(first.isDark.value).toBe(true);
    expect(JSON.parse(localStorage.getItem('lume-theme') || '{}').mode).toBe('dark');
  });

  it('applies presets by name', () => {
    const { applyPreset, primaryColor } = useLumeTheme();
    applyPreset('Corporate Green');
    expect(primaryColor.value).toBe('#059669');
    applyPreset('No Such Theme');
    expect(primaryColor.value).toBe('#059669');
  });

  it('clamps sidebar, radius, and font size', () => {
    const { setSidebarWidth, sidebarWidth, setBorderRadius, setFontSize } = useLumeTheme();
    setSidebarWidth(9999);
    expect(sidebarWidth.value).toBe(320);
    setBorderRadius(-5);
    setFontSize(99);
    const stored = JSON.parse(localStorage.getItem('lume-theme') || '{}');
    expect(stored.radius).toBe(0);
    expect(stored.fontSize).toBe(18);
  });

  it('resets to defaults', () => {
    const api = useLumeTheme();
    api.setThemeMode('dark');
    api.setThemeColor('#ff0000');
    api.resetTheme();
    expect(api.isDark.value).toBe(false);
    expect(api.primaryColor.value).toBe('#4f46e5');
  });
});
