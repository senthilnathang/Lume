/**
 * Module Configuration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  initializeModuleConfig,
  getModuleConfig,
  isModuleSystemEnabled,
  resetModuleConfig,
  updateModuleConfig,
  defaultConfig,
  type ModuleSystemConfig,
} from '../config';

describe('Module Configuration', () => {
  beforeEach(() => {
    resetModuleConfig();
  });

  describe('initializeModuleConfig', () => {
    it('should initialize with default values', () => {
      const config = initializeModuleConfig();
      expect(config.staticBaseUrl).toBe('/modules');
      expect(config.configEndpoint).toBe('/modules/installed/frontend-config');
      expect(config.enabled).toBe(true);
      expect(config.cacheDiscovery).toBe(true);
      expect(config.loadTimeout).toBe(30000);
    });

    it('should merge custom config with defaults', () => {
      const config = initializeModuleConfig({
        staticBaseUrl: '/custom/modules',
        enabled: false,
      });
      expect(config.staticBaseUrl).toBe('/custom/modules');
      expect(config.enabled).toBe(false);
      expect(config.configEndpoint).toBe('/modules/installed/frontend-config');
    });

    it('should override all defaults when provided', () => {
      const customConfig: ModuleSystemConfig = {
        staticBaseUrl: '/my-modules',
        configEndpoint: '/api/modules/config',
        enabled: false,
        cacheDiscovery: false,
        loadTimeout: 60000,
        debug: true,
      };
      const config = initializeModuleConfig(customConfig);
      expect(config).toEqual(customConfig);
    });
  });

  describe('getModuleConfig', () => {
    it('should return default config when not initialized', () => {
      const config = getModuleConfig();
      expect(config).toEqual(defaultConfig);
    });

    it('should return initialized config', () => {
      initializeModuleConfig({ enabled: false });
      const config = getModuleConfig();
      expect(config.enabled).toBe(false);
    });
  });

  describe('isModuleSystemEnabled', () => {
    it('should return true by default', () => {
      expect(isModuleSystemEnabled()).toBe(true);
    });

    it('should return false when disabled', () => {
      initializeModuleConfig({ enabled: false });
      expect(isModuleSystemEnabled()).toBe(false);
    });

    it('should return true when explicitly enabled', () => {
      initializeModuleConfig({ enabled: true });
      expect(isModuleSystemEnabled()).toBe(true);
    });
  });

  describe('updateModuleConfig', () => {
    it('should update specific config options', () => {
      initializeModuleConfig();
      const updated = updateModuleConfig({ loadTimeout: 50000 });
      expect(updated.loadTimeout).toBe(50000);
      expect(updated.staticBaseUrl).toBe('/modules');
    });

    it('should preserve unmodified options', () => {
      initializeModuleConfig({ enabled: false, debug: true });
      const updated = updateModuleConfig({ loadTimeout: 10000 });
      expect(updated.enabled).toBe(false);
      expect(updated.debug).toBe(true);
      expect(updated.loadTimeout).toBe(10000);
    });
  });

  describe('resetModuleConfig', () => {
    it('should reset to default configuration', () => {
      initializeModuleConfig({
        staticBaseUrl: '/custom',
        enabled: false,
        loadTimeout: 100000,
      });
      resetModuleConfig();
      const config = getModuleConfig();
      expect(config).toEqual(defaultConfig);
    });
  });
});
