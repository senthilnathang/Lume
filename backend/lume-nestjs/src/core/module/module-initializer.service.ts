import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleLoaderService } from './module-loader.service.js';
import { MetadataRegistryService } from '../runtime/metadata-registry.service.js';
import type { ModuleDefinition } from './define-module.js';
import { getModuleConfig, loadExampleModules } from './module-wiring.js';

/**
 * Initializes framework modules at application startup
 * Loads core modules and example modules based on configuration
 */
@Injectable()
export class ModuleInitializerService implements OnModuleInit {
  constructor(
    private readonly moduleLoader: ModuleLoaderService,
    private readonly metadataRegistry: MetadataRegistryService,
  ) {}

  async onModuleInit(): Promise<void> {
    console.log('[Framework] Initializing modules...');

    try {
      // Load core example modules
      const modulesToLoad = await this.getModulesToLoad();

      for (const moduleDef of modulesToLoad) {
        await this.loadModule(moduleDef);
      }

      console.log('[Framework] Module initialization complete');
      this.logModuleStats();
    } catch (error) {
      console.error('[Framework] Module initialization failed:', error);
      // Continue with partial module load rather than crashing
    }
  }

  private async getModulesToLoad(): Promise<ModuleDefinition[]> {
    const config = getModuleConfig();
    if (!config.enabled || !config.loadExamples) return [];
    return loadExampleModules();
  }

  private async loadModule(moduleDef: ModuleDefinition): Promise<void> {
    console.log(`[Framework] Loading module: ${moduleDef.name} v${moduleDef.version}`);

    try {
      await this.moduleLoader.loadModule(moduleDef);
      console.log(`[Framework] ✓ Module loaded: ${moduleDef.name}`);
    } catch (error) {
      console.error(`[Framework] ✗ Failed to load module ${moduleDef.name}:`, error.message);
      throw error;
    }
  }

  private logModuleStats(): void {
    const entities = this.metadataRegistry.listEntities();
    const workflows = this.metadataRegistry.listWorkflows();
    const policies = this.metadataRegistry.listPolicies();
    const modules = this.metadataRegistry.listModules();

    console.log('[Framework] ========================================');
    console.log(`[Framework] Loaded ${modules.length} module(s)`);
    console.log(`[Framework] Registered ${entities.length} entity(ies)`);
    console.log(`[Framework] Registered ${workflows.length} workflow(s)`);
    console.log(`[Framework] Registered ${policies.length} policy(ies)`);
    console.log('[Framework] ========================================');
  }
}
