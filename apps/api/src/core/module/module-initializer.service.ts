import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleLoaderService } from './module-loader.service.js';
import { MetadataRegistryService } from '../runtime/metadata-registry.service.js';
import { getModuleConfig, loadExampleModules, loadProductionModules, planModuleLoading, logModuleLoadingPlan } from './module-wiring.js';

/**
 * Initializes framework modules at application startup
 * Loads explicitly configured runtime definitions and optional examples; errors abort startup.
 */
@Injectable()
export class ModuleInitializerService implements OnModuleInit {
  constructor(
    private readonly moduleLoader: ModuleLoaderService,
    private readonly metadataRegistry: MetadataRegistryService,
  ) {}

  async onModuleInit(): Promise<void> {
    const config = getModuleConfig();
    if (!config.enabled) return;
    if (config.autoMigrate) throw new Error('AUTO_MIGRATE_MODULES is unsupported; apply reviewed migrations before startup');
    const production = await loadProductionModules();
    const examples = config.loadExamples ? await loadExampleModules() : [];
    const plan = planModuleLoading(examples, production);
    if (plan.errors.length) throw new Error(`Module initialization failed: ${plan.errors.join('; ')}`);
    if (config.verboseLogging) logModuleLoadingPlan(plan, true);
    if (!plan.modules.length) return;
    await this.moduleLoader.loadAll(plan.modules);
    this.logModuleStats();
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
