import { resolveDependencies, moduleRegistry, moduleLoaderState } from '../../src/core/modules/__loader__.js';

// Helper to create mock module objects
const mockModule = (name, depends = []) => ({
  name,
  path: `/fake/modules/${name}`,
  manifest: { name, version: '1.0.0', depends },
  init: null,
  models: {},
  api: null,
  services: {},
  demoData: null,
  loaded: true,
  initialized: false
});

describe('Module Loader - resolveDependencies', () => {
  test('puts base module first', () => {
    const modules = [
      mockModule('user', ['base']),
      mockModule('base', []),
      mockModule('auth', ['base'])
    ];

    const result = resolveDependencies(modules);
    expect(result[0].name).toBe('base');
  });

  test('resolves simple dependency chain', () => {
    const modules = [
      mockModule('rbac', ['auth']),
      mockModule('auth', ['base']),
      mockModule('base', [])
    ];

    const result = resolveDependencies(modules);
    const names = result.map(m => m.name);

    expect(names.indexOf('base')).toBeLessThan(names.indexOf('auth'));
    expect(names.indexOf('auth')).toBeLessThan(names.indexOf('rbac'));
  });

  test('auto-adds base dependency for modules without it', () => {
    const modules = [
      mockModule('base', []),
      mockModule('standalone', []) // no explicit deps
    ];

    const result = resolveDependencies(modules);
    const names = result.map(m => m.name);
    // base should come before standalone since base is auto-dependency
    expect(names.indexOf('base')).toBeLessThan(names.indexOf('standalone'));
  });

  test('handles modules with multiple dependencies', () => {
    const modules = [
      mockModule('base', []),
      mockModule('auth', ['base']),
      mockModule('user', ['base']),
      mockModule('admin', ['auth', 'user'])
    ];

    const result = resolveDependencies(modules);
    const names = result.map(m => m.name);

    expect(names.indexOf('base')).toBeLessThan(names.indexOf('admin'));
    expect(names.indexOf('auth')).toBeLessThan(names.indexOf('admin'));
    expect(names.indexOf('user')).toBeLessThan(names.indexOf('admin'));
  });

  test('converts legacy "core" dependency to "base"', () => {
    const modules = [
      mockModule('base', []),
      mockModule('legacy', ['core']) // legacy 'core' -> 'base'
    ];

    const result = resolveDependencies(modules);
    const names = result.map(m => m.name);
    expect(names.indexOf('base')).toBeLessThan(names.indexOf('legacy'));
  });

  test('handles missing dependency gracefully', () => {
    const modules = [
      mockModule('base', []),
      mockModule('orphan', ['nonexistent'])
    ];

    // Should not throw
    const result = resolveDependencies(modules);
    expect(result).toHaveLength(2);
  });

  test('handles circular dependency without infinite loop', () => {
    const modules = [
      mockModule('base', []),
      mockModule('a', ['b']),
      mockModule('b', ['a'])
    ];

    // Should not hang or throw
    const result = resolveDependencies(modules);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].name).toBe('base');
  });

  test('returns all modules even in complex graph', () => {
    const modules = [
      mockModule('base', []),
      mockModule('auth', ['base']),
      mockModule('user', ['base']),
      mockModule('rbac', ['auth', 'user']),
      mockModule('donations', ['base']),
      mockModule('activities', ['base']),
      mockModule('audit', ['base'])
    ];

    const result = resolveDependencies(modules);
    expect(result).toHaveLength(7);
  });

  test('returns empty array for empty input', () => {
    const result = resolveDependencies([]);
    expect(result).toEqual([]);
  });
});

describe('Module Registry', () => {
  test('moduleRegistry is a Map', () => {
    expect(moduleRegistry).toBeInstanceOf(Map);
  });

  test('moduleLoaderState has expected shape', () => {
    expect(moduleLoaderState).toHaveProperty('initialized');
    expect(moduleLoaderState).toHaveProperty('loading');
    expect(moduleLoaderState).toHaveProperty('modules');
    expect(moduleLoaderState).toHaveProperty('menus');
    expect(moduleLoaderState).toHaveProperty('permissions');
    expect(moduleLoaderState).toHaveProperty('routes');
  });
});
