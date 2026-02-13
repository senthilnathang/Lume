import type { Sequelize } from 'sequelize';
import type { Router } from 'h3';

/**
 * Module manifest — describes a Lume server module.
 * Each module directory must export a __manifest__.ts with this shape.
 */
export interface ModuleManifest {
  /** Unique module identifier (snake_case) */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Module version */
  version: string;
  /** Short description */
  description: string;
  /** Module category for grouping */
  category: 'core' | 'hrms' | 'business' | 'platform' | 'custom';
  /** Module author */
  author?: string;
  /** Dependencies — other module names that must be loaded first */
  depends: string[];
  /** Whether this module is auto-installed */
  autoInstall?: boolean;
  /** Whether this is a core system module (cannot be uninstalled) */
  isCore?: boolean;
  /** Module icon (Lucide icon name) */
  icon?: string;
  /** Module color (hex) */
  color?: string;
  /** License */
  license?: string;
}

/**
 * Module definition — the full module object including lifecycle hooks.
 * Returned by each module's index.ts.
 */
export interface ModuleDefinition {
  manifest: ModuleManifest;

  /** Initialize Sequelize models for this module */
  initModels?: (sequelize: Sequelize) => void;

  /** Set up model associations (called after ALL modules init their models) */
  setupAssociations?: () => void;

  /** Register API routes */
  registerRoutes?: () => void;

  /** Seed initial data (called during db:seed) */
  seedData?: (sequelize: Sequelize) => Promise<void>;

  /** Run on module install */
  onInstall?: () => Promise<void>;

  /** Run on module uninstall */
  onUninstall?: () => Promise<void>;

  /** Run on module upgrade */
  onUpgrade?: (fromVersion: string, toVersion: string) => Promise<void>;
}

/**
 * Loaded module state — tracks runtime info about a loaded module.
 */
export interface LoadedModule {
  definition: ModuleDefinition;
  loadedAt: Date;
  status: 'loaded' | 'error' | 'disabled';
  error?: string;
}
