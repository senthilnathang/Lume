import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleLoaderService } from './module-loader.service.js';
import { MetadataRegistryService } from '../runtime/metadata-registry.service.js';
import type { ModuleDefinition } from './define-module.js';

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
      const modulesToLoad = this.getModulesToLoad();

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

  private getModulesToLoad(): ModuleDefinition[] {
    // Dynamically import example modules
    // In production, modules would be loaded from installed packages
    const modules: ModuleDefinition[] = [];

    // Load example modules if enabled
    const enableExamples = process.env.LOAD_EXAMPLE_MODULES !== 'false';

    if (enableExamples) {
      try {
        // Lazy import to avoid circular dependencies
        const { CRMModule } = require('@examples/crm-module.example.js');
        const { ECommerceModule } = require('@examples/ecommerce-module.example.js');
        const { ProjectManagementModule } = require('@examples/project-management-module.example.js');

        modules.push(CRMModule);
        modules.push(ECommerceModule);
        modules.push(ProjectManagementModule);
      } catch (error) {
        console.warn('[Framework] Could not load example modules:', error.message);
      }
    }

    return modules;
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
