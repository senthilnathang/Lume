import type { Sequelize } from 'sequelize';
import type { ModuleDefinition, LoadedModule } from './_types';

/**
 * Module Registry — discovers, loads, and manages Lume server modules.
 *
 * Load order:
 * 1. Discover all modules in server/modules/
 * 2. Resolve dependency order (topological sort)
 * 3. Call initModels() for each module
 * 4. Call setupAssociations() for each module
 * 5. Call registerRoutes() for each module
 */

const moduleRegistry = new Map<string, LoadedModule>();

/**
 * Get all loaded modules
 */
export function getLoadedModules(): Map<string, LoadedModule> {
  return moduleRegistry;
}

/**
 * Get a specific loaded module by name
 */
export function getModule(name: string): LoadedModule | undefined {
  return moduleRegistry.get(name);
}

/**
 * Check if a module is loaded
 */
export function isModuleLoaded(name: string): boolean {
  const mod = moduleRegistry.get(name);
  return mod?.status === 'loaded';
}

/**
 * Get module list as array (for API responses)
 */
export function getModuleList() {
  return Array.from(moduleRegistry.values()).map((mod) => ({
    name: mod.definition.manifest.name,
    displayName: mod.definition.manifest.displayName,
    version: mod.definition.manifest.version,
    description: mod.definition.manifest.description,
    category: mod.definition.manifest.category,
    depends: mod.definition.manifest.depends,
    isCore: mod.definition.manifest.isCore ?? false,
    autoInstall: mod.definition.manifest.autoInstall ?? false,
    icon: mod.definition.manifest.icon,
    color: mod.definition.manifest.color,
    status: mod.status,
    loadedAt: mod.loadedAt,
    error: mod.error,
  }));
}

/**
 * Topological sort — resolve module load order based on dependencies
 */
function resolveLoadOrder(modules: ModuleDefinition[]): ModuleDefinition[] {
  const moduleMap = new Map<string, ModuleDefinition>();
  modules.forEach((m) => moduleMap.set(m.manifest.name, m));

  const visited = new Set<string>();
  const resolved: ModuleDefinition[] = [];

  function visit(name: string, stack: Set<string>) {
    if (visited.has(name)) return;
    if (stack.has(name)) {
      console.warn(`[modules] Circular dependency detected: ${name}`);
      return;
    }

    const mod = moduleMap.get(name);
    if (!mod) return;

    stack.add(name);

    for (const dep of mod.manifest.depends) {
      visit(dep, stack);
    }

    stack.delete(name);
    visited.add(name);
    resolved.push(mod);
  }

  for (const mod of modules) {
    visit(mod.manifest.name, new Set());
  }

  return resolved;
}

/**
 * Register a module definition (called by each module's index.ts)
 */
export function registerModule(definition: ModuleDefinition) {
  moduleRegistry.set(definition.manifest.name, {
    definition,
    loadedAt: new Date(),
    status: 'loaded',
  });
}

/**
 * Initialize all modules — called from the database plugin after Sequelize is ready.
 *
 * @param sequelize - The Sequelize instance
 * @param moduleDefinitions - Array of module definitions to load
 */
export async function initializeModules(
  sequelize: Sequelize,
  moduleDefinitions: ModuleDefinition[],
) {
  console.log(`[modules] Initializing ${moduleDefinitions.length} modules...`);

  // 1. Resolve dependency order
  const ordered = resolveLoadOrder(moduleDefinitions);

  // 2. Register + init models
  for (const mod of ordered) {
    try {
      registerModule(mod);

      if (mod.initModels) {
        mod.initModels(sequelize);
      }

      console.log(`[modules] Loaded: ${mod.manifest.name} v${mod.manifest.version}`);
    } catch (error: any) {
      console.error(`[modules] Failed to load ${mod.manifest.name}:`, error.message);
      moduleRegistry.set(mod.manifest.name, {
        definition: mod,
        loadedAt: new Date(),
        status: 'error',
        error: error.message,
      });
    }
  }

  // 3. Setup associations (after all models are initialized)
  for (const mod of ordered) {
    try {
      if (mod.setupAssociations) {
        mod.setupAssociations();
      }
    } catch (error: any) {
      console.error(`[modules] Failed associations for ${mod.manifest.name}:`, error.message);
    }
  }

  // 4. Register routes
  for (const mod of ordered) {
    try {
      if (mod.registerRoutes) {
        mod.registerRoutes();
      }
    } catch (error: any) {
      console.error(`[modules] Failed routes for ${mod.manifest.name}:`, error.message);
    }
  }

  console.log(`[modules] ${moduleRegistry.size} modules initialized`);
}

/**
 * Seed data for all loaded modules
 */
export async function seedAllModules(sequelize: Sequelize) {
  for (const [name, mod] of moduleRegistry) {
    if (mod.status === 'loaded' && mod.definition.seedData) {
      try {
        console.log(`[modules] Seeding: ${name}`);
        await mod.definition.seedData(sequelize);
      } catch (error: any) {
        console.error(`[modules] Seed failed for ${name}:`, error.message);
      }
    }
  }
}
