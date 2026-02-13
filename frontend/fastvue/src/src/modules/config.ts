/**
 * Module Configuration
 *
 * Centralized configuration for the module system.
 * This makes the module loader more modular and configurable.
 */

export interface ModuleSystemConfig {
  /** Base URL for module static files (default: '/modules') */
  staticBaseUrl: string;
  /** API endpoint for fetching module configs (default: '/modules/installed/frontend-config') */
  configEndpoint: string;
  /** Whether to enable module loading (default: true) */
  enabled: boolean;
  /** Whether to cache discovered modules (default: true) */
  cacheDiscovery: boolean;
  /** Timeout for module loading in ms (default: 30000) */
  loadTimeout: number;
  /** Whether to log module loading events (default: false in production) */
  debug: boolean;
}

const defaultConfig: ModuleSystemConfig = {
  staticBaseUrl: '/modules',
  configEndpoint: '/modules/installed/frontend-config',
  enabled: true,
  cacheDiscovery: true,
  loadTimeout: 30000,
  debug: import.meta.env.DEV,
};

let _config: ModuleSystemConfig = { ...defaultConfig };
let _initialized = false;

/**
 * Initialize module system configuration
 * Call this during app bootstrap to customize module loading behavior
 */
export function initializeModuleConfig(
  config: Partial<ModuleSystemConfig> = {},
): ModuleSystemConfig {
  _config = {
    ...defaultConfig,
    ...config,
  };
  _initialized = true;
  return _config;
}

/**
 * Get current module system configuration
 */
export function getModuleConfig(): ModuleSystemConfig {
  if (!_initialized) {
    // Return default config if not explicitly initialized
    return defaultConfig;
  }
  return _config;
}

/**
 * Check if module system is enabled
 */
export function isModuleSystemEnabled(): boolean {
  return getModuleConfig().enabled;
}

/**
 * Reset configuration to defaults (mainly for testing)
 */
export function resetModuleConfig(): void {
  _config = { ...defaultConfig };
  _initialized = false;
}

/**
 * Update specific configuration options at runtime
 */
export function updateModuleConfig(
  updates: Partial<ModuleSystemConfig>,
): ModuleSystemConfig {
  _config = {
    ..._config,
    ...updates,
  };
  return _config;
}

export { defaultConfig };
