export { default as PreferencesButton } from './preferences-button.vue';
export { default as Preferences } from './preferences.vue';
export * from './use-open-preferences';

// Appearance block components for reuse in configuration pages
export {
  Block as PreferenceBlock,
  BuiltinTheme as PreferenceBuiltinTheme,
  ColorMode as PreferenceColorMode,
  FontFamily as PreferenceFontFamily,
  FontSize as PreferenceFontSize,
  Radius as PreferenceRadius,
  Theme as PreferenceTheme,
} from './blocks';
