import { defineOverridesPreferences } from '@vben/preferences';

/**
 * FastVue Project Configuration
 * Override default preferences as needed
 */
export const overridesPreferences = defineOverridesPreferences({
  app: {
    name: import.meta.env.VITE_APP_TITLE,
    // Use mixed mode: static routes (settings, etc.) + dynamic module routes from backend
    accessMode: 'mixed',
    // Default home path after login
    defaultHomePath: '/dashboard',
    // Enable refresh token
    enableRefreshToken: false,
    // Default language
    locale: 'en-US',
    // Enable dynamic page titles
    dynamicTitle: true,
    // Preferences moved to Configurations > Appearance (admin-only)
    enablePreferences: false,
  },
  logo: {
    enable: true,
    source: '/logo.svg',
  },
  sidebar: {
    collapsed: false,
    width: 240,
    // Show collapse button
    collapsedButton: true,
    // Expand sidebar on hover when collapsed
    expandOnHover: true,
  },
  header: {
    enable: true,
    height: 50,
    mode: 'fixed',
  },
  footer: {
    enable: true,
    fixed: false,
  },
  tabbar: {
    enable: false,
    persist: true,
    showIcon: true,
  },
  theme: {
    // Default to Professional Blue theme
    builtinType: 'default',
    colorPrimary: 'hsl(212 100% 45%)',
    // Light mode by default
    mode: 'light',
    // Border radius
    radius: '0.5',
  },
  breadcrumb: {
    enable: true,
    showIcon: true,
    showHome: true,
  },
  widget: {
    // Enable widgets
    fullscreen: true,
    globalSearch: true,
    languageToggle: false, // Disabled - only English supported
    lockScreen: true,
    notification: true,
    refresh: true,
    sidebarToggle: true,
    themeToggle: true,
  },
  copyright: {
    companyName: 'FastVue',
    companySiteLink: '#',
    date: new Date().getFullYear().toString(),
    enable: true,
  },
});
