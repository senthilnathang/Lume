/**
 * Module Wiring Configuration
 *
 * Central configuration for which modules to load and their initialization order.
 * This file makes it easy to toggle modules on/off and manage dependencies.
 */

import type { ModuleDefinition } from './define-module.js';

/**
 * Module loading configuration
 */
export interface ModuleConfig {
  /** Enable/disable module loading */
  enabled: boolean;
  /** Load example modules for demonstration */
  loadExamples: boolean;
  /** Automatically run module migrations on startup */
  autoMigrate: boolean;
  /** Log detailed module loading information */
  verboseLogging: boolean;
}

/**
 * Get module configuration from environment
 */
export function getModuleConfig(): ModuleConfig {
  return {
    enabled: process.env.MODULES_ENABLED !== 'false',
    loadExamples: process.env.LOAD_EXAMPLE_MODULES === 'true',
    autoMigrate: process.env.AUTO_MIGRATE_MODULES === 'true',
    verboseLogging: process.env.VERBOSE_MODULE_LOGGING === 'true',
  };
}

/**
 * Load all example modules (CRM, E-Commerce, Project Management)
 * These are for demonstration and can be disabled in production
 */
export async function loadExampleModules(): Promise<ModuleDefinition[]> {
  const modules: ModuleDefinition[] = [];

  try {
    const { CRMModule } = await import('@examples/crm-module.example.js');
    modules.push(CRMModule);
  } catch (error) {
    console.warn('[Module Wiring] Failed to load CRM module:', error.message);
  }

  try {
    const { ECommerceModule } = await import('@examples/ecommerce-module.example.js');
    modules.push(ECommerceModule);
  } catch (error) {
    console.warn('[Module Wiring] Failed to load E-Commerce module:', error.message);
  }

  try {
    const { ProjectManagementModule } = await import('@examples/project-management-module.example.js');
    modules.push(ProjectManagementModule);
  } catch (error) {
    console.warn('[Module Wiring] Failed to load Project Management module:', error.message);
  }

  return modules;
}

/**
 * Load production modules (custom modules)
 * These would typically come from installed packages or a plugins directory
 */
export async function loadProductionModules(): Promise<ModuleDefinition[]> {
  const modules: ModuleDefinition[] = [];

  // TODO: Implement production module discovery
  // - Load from npm packages
  // - Load from local plugins directory
  // - Load from database registry

  return modules;
}

/**
 * Resolve module dependencies in topological order
 * Ensures modules are loaded in the correct order based on dependencies
 */
export function resolveModuleOrder(modules: ModuleDefinition[]): ModuleDefinition[] {
  const resolved: ModuleDefinition[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(moduleName: string): void {
    if (visited.has(moduleName)) {
      return;
    }

    if (visiting.has(moduleName)) {
      throw new Error(`Circular dependency detected: ${moduleName}`);
    }

    visiting.add(moduleName);

    const module = modules.find((m) => m.name === moduleName);
    if (!module) {
      throw new Error(`Module not found: ${moduleName}`);
    }

    // Visit dependencies first
    if (module.depends) {
      for (const dep of module.depends) {
        visit(dep);
      }
    }

    visiting.delete(moduleName);
    visited.add(moduleName);
    resolved.push(module);
  }

  for (const module of modules) {
    visit(module.name);
  }

  return resolved;
}

/**
 * Validate module compatibility
 */
export function validateModuleCompatibility(modules: ModuleDefinition[]): string[] {
  const errors: string[] = [];
  const moduleNames = new Set(modules.map((m) => m.name));
  const frameworkVersion = '2.0.0';

  for (const module of modules) {
    // Check framework version compatibility
    if (module.depends?.includes('base') && !moduleNames.has('base')) {
      errors.push(`Module ${module.name} requires 'base' module`);
    }

    // Check that all dependencies exist
    if (module.depends) {
      for (const dep of module.depends) {
        if (!moduleNames.has(dep)) {
          errors.push(`Module ${module.name} depends on missing module: ${dep}`);
        }
      }
    }

    // Validate module has required properties
    if (!module.name) {
      errors.push('Module missing required property: name');
    }
    if (!module.version) {
      errors.push(`Module ${module.name} missing required property: version`);
    }
    if (!module.entities && !module.workflows && !module.permissions) {
      errors.push(`Module ${module.name} has no entities, workflows, or permissions`);
    }
  }

  return errors;
}

/**
 * Create a module loading plan with diagnostics
 */
export interface ModuleLoadingPlan {
  modules: ModuleDefinition[];
  loadOrder: string[];
  errors: string[];
  warnings: string[];
}

export function planModuleLoading(
  exampleModules: ModuleDefinition[],
  productionModules: ModuleDefinition[],
): ModuleLoadingPlan {
  const allModules = [...productionModules, ...exampleModules];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate compatibility
  errors.push(...validateModuleCompatibility(allModules));

  // Resolve load order
  let loadOrder: string[] = [];
  try {
    const ordered = resolveModuleOrder(allModules);
    loadOrder = ordered.map((m) => m.name);
  } catch (error) {
    errors.push(error.message);
  }

  // Warn if examples are being loaded in production
  if (exampleModules.length > 0 && process.env.NODE_ENV === 'production') {
    warnings.push('Example modules are loaded in production environment');
  }

  return {
    modules: allModules,
    loadOrder,
    errors,
    warnings,
  };
}

/**
 * Log module loading plan for debugging
 */
export function logModuleLoadingPlan(plan: ModuleLoadingPlan, verbose: boolean = false): void {
  console.log('[Module Wiring] ========================================');
  console.log('[Module Wiring] Module Loading Plan');
  console.log('[Module Wiring] ========================================');

  if (plan.errors.length > 0) {
    console.error('[Module Wiring] ERRORS:');
    plan.errors.forEach((e) => console.error(`  ✗ ${e}`));
  }

  if (plan.warnings.length > 0) {
    console.warn('[Module Wiring] WARNINGS:');
    plan.warnings.forEach((w) => console.warn(`  ⚠ ${w}`));
  }

  console.log(`[Module Wiring] Total modules: ${plan.modules.length}`);
  console.log('[Module Wiring] Load order:');
  plan.loadOrder.forEach((name, idx) => {
    const module = plan.modules.find((m) => m.name === name);
    console.log(`  ${idx + 1}. ${name} (v${module?.version})`);
  });

  if (verbose) {
    console.log('[Module Wiring] Detailed module info:');
    plan.modules.forEach((module) => {
      console.log(`  ${module.name}:`);
      console.log(`    - Version: ${module.version}`);
      console.log(`    - Description: ${module.description || 'N/A'}`);
      console.log(`    - Dependencies: ${module.depends?.join(', ') || 'none'}`);
      console.log(`    - Entities: ${module.entities?.length || 0}`);
      console.log(`    - Workflows: ${module.workflows?.length || 0}`);
      console.log(`    - Permissions: ${module.permissions?.length || 0}`);
    });
  }

  console.log('[Module Wiring] ========================================');
}
