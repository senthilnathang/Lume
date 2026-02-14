/**
 * Gawdesy Module System
 * Dynamic module loader and registry
 */

import { readdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Module registry to store all loaded modules
const moduleRegistry = new Map();

// Module loader state
const moduleLoaderState = {
  initialized: false,
  loading: false,
  coreModule: null,
  modules: [],
  menus: [],
  permissions: [],
  routes: []
};

/**
 * Load a single module
 */
const loadModule = async (modulePath, moduleName) => {
  try {
    const manifestPath = join(modulePath, '__manifest__.js');
    const cjsManifestPath = join(modulePath, '__manifest__.cjs');
    
    if (!existsSync(manifestPath) && !existsSync(cjsManifestPath)) {
      console.warn(`⚠️  Module ${moduleName}: No manifest found, skipping`);
      return null;
    }
    
    let manifest;
    if (existsSync(manifestPath)) {
      const manifestModule = await import(manifestPath);
      manifest = manifestModule.default || manifestModule;
    } else {
      const cjsModule = await import(cjsManifestPath);
      manifest = cjsModule.default || cjsModule;
    }
    
    // Load module initialization
    let initFn = null;
    const initPath = join(modulePath, '__init__.js');
    if (existsSync(initPath)) {
      const initModule = await import(initPath);
      initFn = initModule.default || initModule.init;
    }
    
    // Load models
    let models = {};
    const modelsPath = join(modulePath, 'models', 'index.js');
    if (existsSync(modelsPath)) {
      const modelsModule = await import(modelsPath);
      models = modelsModule.default || modelsModule;
    }
    
    // Load API routes - store factory function
    let apiFactory = null;
    const apiPath = join(modulePath, 'api', 'index.js');
    if (existsSync(apiPath)) {
      const apiModule = await import(apiPath);
      apiFactory = apiModule.default || apiModule;
    }
    
    // Load services
    let services = {};
    const servicesPath = join(modulePath, 'services', 'index.js');
    if (existsSync(servicesPath)) {
      const servicesModule = await import(servicesPath);
      services = servicesModule.default || servicesModule;
    }
    
    // Load demo data
    let demoData = null;
    const dataPath = join(modulePath, 'data', 'demo.json');
    if (existsSync(dataPath)) {
      try {
        const dataContent = readFileSync(dataPath, 'utf-8');
        demoData = JSON.parse(dataContent);
      } catch (e) {
        demoData = null;
      }
    }
    
    const module = {
      name: moduleName,
      path: modulePath,
      manifest,
      init: initFn,
      models,
      api: apiFactory,
      services,
      demoData,
      loaded: true,
      initialized: false
    };
    
    moduleRegistry.set(moduleName, module);
    
    console.log(`✅ Module loaded: ${manifest.name || moduleName} (v${manifest.version || '1.0.0'})`);
    
    return module;
  } catch (error) {
    console.error(`❌ Error loading module ${moduleName}:`, error.message);
    return null;
  }
};

/**
 * Resolve module dependencies in correct order (topological sort)
 * Ensures base module loads first, all other modules depend on base by default
 */
const resolveDependencies = (modules) => {
  const resolved = [];
  const visiting = new Set();
  const visited = new Set();
  
  const visit = (module, path = []) => {
    if (visiting.has(module.name)) {
      console.warn(`⚠️  Circular dependency detected: ${path.join(' -> ')} -> ${module.name}`);
      return;
    }
    
    if (visited.has(module.name)) {
      return;
    }
    
    visiting.add(module.name);
    
    // Get dependencies - default to ['base'] if not specified and not base itself
    let deps = module.manifest?.depends || [];
    
    // Convert legacy 'core' to 'base'
    deps = deps.map(dep => dep === 'core' ? 'base' : dep);
    
    // All modules except base depend on base
    if (module.name !== 'base' && !deps.includes('base')) {
      deps.unshift('base');
    }
    
    // Visit dependencies first
    for (const dep of deps) {
      const depModule = modules.find(m => m.name === dep || m.manifest?.technicalName === dep);
      if (depModule) {
        visit(depModule, [...path, module.name]);
      } else if (dep !== 'base') {
        console.warn(`⚠️  Module ${module.name} depends on ${dep} which is not found`);
      }
    }
    
    visiting.delete(module.name);
    visited.add(module.name);
    resolved.push(module);
  };
  
  // First pass: load base module first
  const baseModule = modules.find(m => m.name === 'base');
  if (baseModule) {
    visit(baseModule);
  }
  
  // Second pass: load all other modules
  modules.forEach(m => {
    if (!visited.has(m.name)) {
      visit(m);
    }
  });
  
  return resolved;
};

/**
 * Load all modules from a directory
 */
const loadAllModules = async (modulesDir) => {
  if (!existsSync(modulesDir)) {
    console.log(`📁 Modules directory not found: ${modulesDir}`);
    return [];
  }
  
  const entries = readdirSync(modulesDir, { withFileTypes: true });
  const modulePaths = entries
    .filter(entry => entry.isDirectory())
    .map(entry => ({
      path: join(modulesDir, entry.name),
      name: entry.name
    }))
    .filter(({ path }) => existsSync(join(path, '__manifest__.js')) || existsSync(join(path, '__manifest__.cjs')));
  
  console.log(`📦 Found ${modulePaths.length} modules to load`);
  
  const loadedModules = [];
  
  for (const { path, name } of modulePaths) {
    const module = await loadModule(path, name);
    if (module) {
      loadedModules.push(module);
    }
  }
  
  return loadedModules;
};

/**
 * Initialize a module (run lifecycle hooks)
 */
const initializeModule = async (module, context = {}) => {
  try {
    // Run pre-init hook if exists
    if (module.manifest?.preInit) {
      const hookPath = join(module.path, module.manifest.preInit);
      if (existsSync(hookPath)) {
        const hook = await import(hookPath);
        if (hook.preInit) {
          await hook.preInit(context);
        }
      }
    }
    
    // Run module init function
    if (module.init) {
      await module.init(context);
    }
    
    // Run post-init hook if exists
    if (module.manifest?.postInit) {
      const hookPath = join(module.path, module.manifest.postInit);
      if (existsSync(hookPath)) {
        const hook = await import(hookPath);
        if (hook.postInit) {
          await hook.postInit(context);
        }
      }
    }
    
    module.initialized = true;
    console.log(`✅ Module initialized: ${module.manifest.name || module.name}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error initializing module ${module.name}:`, error.message);
    return false;
  }
};

/**
 * Run a module's install hook (if defined in manifest)
 */
const runInstallHook = async (module, context = {}) => {
  const hookFile = module.manifest?.installHook;
  if (!hookFile) return true;

  try {
    const hookPath = join(module.path, hookFile);
    if (existsSync(hookPath)) {
      const hook = await import(hookPath);
      const fn = hook.default || hook.install || hook.onInstall;
      if (typeof fn === 'function') {
        await fn(context);
        console.log(`✅ Install hook executed for ${module.name}`);
      }
    }
    return true;
  } catch (error) {
    console.error(`❌ Install hook failed for ${module.name}:`, error.message);
    return false;
  }
};

/**
 * Run a module's uninstall hook (if defined in manifest)
 */
const runUninstallHook = async (module, context = {}) => {
  const hookFile = module.manifest?.uninstallHook;
  if (!hookFile) return true;

  try {
    const hookPath = join(module.path, hookFile);
    if (existsSync(hookPath)) {
      const hook = await import(hookPath);
      const fn = hook.default || hook.uninstall || hook.onUninstall;
      if (typeof fn === 'function') {
        await fn(context);
        console.log(`✅ Uninstall hook executed for ${module.name}`);
      }
    }
    return true;
  } catch (error) {
    console.error(`❌ Uninstall hook failed for ${module.name}:`, error.message);
    return false;
  }
};

/**
 * Get module by name
 */
const getModule = (name) => {
  return moduleRegistry.get(name);
};

/**
 * Get all loaded modules
 */
const getAllModules = () => {
  return Array.from(moduleRegistry.values());
};

/**
 * Get all menus from modules
 * Returns flat array with module name enriched
 * Merges children when multiple modules declare the same parent path
 */
const getAllMenus = () => {
  const menuMap = new Map();

  for (const module of moduleRegistry.values()) {
    const menus = module.manifest?.menus || module.manifest?.frontend?.menus || [];
    for (const menu of menus) {
      const path = menu.path;
      if (menuMap.has(path)) {
        // Merge children from both menu declarations
        const existing = menuMap.get(path);
        const existingChildren = existing.children || [];
        const newChildren = menu.children || [];
        const childPaths = new Set(existingChildren.map(c => c.path));
        for (const child of newChildren) {
          if (!childPaths.has(child.path)) {
            existingChildren.push(child);
          }
        }
        existing.children = existingChildren.sort((a, b) => (a.sequence || 99) - (b.sequence || 99));
      } else {
        menuMap.set(path, {
          ...menu,
          name: menu.name || menu.title,
          module: module.name
        });
      }
    }
  }

  return Array.from(menuMap.values()).sort((a, b) => (a.sequence || 99) - (b.sequence || 99));
};

/**
 * Get all permissions from modules
 */
const getAllPermissions = () => {
  const permissions = [];
  
  for (const module of moduleRegistry.values()) {
    if (module.manifest?.permissions) {
      permissions.push({
        module: module.name,
        permissions: module.manifest.permissions
      });
    }
  }
  
  return permissions;
};

/**
 * Get all routes from modules
 */
const getAllRoutes = () => {
  const routes = [];
  
  for (const module of moduleRegistry.values()) {
    if (module.manifest?.frontend?.routes) {
      routes.push({
        module: module.name,
        routes: module.manifest.frontend.routes
      });
    }
  }
  
  return routes;
};

/**
 * Initialize the module system
 */
const initializeModuleSystem = async (modulesDir, context = {}) => {
  if (moduleLoaderState.initialized) {
    console.log('Module system already initialized');
    return moduleRegistry;
  }
  
  if (moduleLoaderState.loading) {
    console.log('Module system is currently loading...');
    return null;
  }
  
  moduleLoaderState.loading = true;
  
  try {
    console.log('🚀 Initializing Gawdesy Module System...');
    
    // Load all modules
    const modules = await loadAllModules(modulesDir);
    
    if (modules.length === 0) {
      console.log('📦 No modules found to load');
      moduleLoaderState.initialized = true;
      moduleLoaderState.loading = false;
      return moduleRegistry;
    }
    
    // Resolve dependencies
    const sortedModules = resolveDependencies(modules);
    moduleLoaderState.modules = sortedModules;
    
    console.log(`📋 Module load order: ${sortedModules.map(m => m.name).join(' -> ')}`);
    
    // Initialize modules in order
    for (const module of sortedModules) {
      await initializeModule(module, context);
      
      // Register API routes if app context is provided
      if (context.app && module.api) {
        try {
          registerModuleRoutes(context.app, module);
        } catch (err) {
          console.error(`❌ Error registering routes for ${module.name}:`, err.message);
        }
      }
    }
    
    // Build menus, permissions, and routes
    moduleLoaderState.menus = getAllMenus();
    moduleLoaderState.permissions = getAllPermissions();
    moduleLoaderState.routes = getAllRoutes();
    
    moduleLoaderState.initialized = true;
    moduleLoaderState.loading = false;
    
    console.log(`✅ Module system initialized with ${moduleRegistry.size} modules`);
    console.log(`📋 Registered ${moduleLoaderState.menus.length} menu groups`);
    console.log(`🔐 Registered ${moduleLoaderState.permissions.reduce((acc, m) => acc + m.permissions.length, 0)} permissions`);
    
    return moduleRegistry;
  } catch (error) {
    moduleLoaderState.loading = false;
    console.error('❌ Error initializing module system:', error.message);
    throw error;
  }
};

/**
 * Register API routes for a module
 */
const registerModuleRoutes = (app, module) => {
  if (!module.api) {
    return;
  }
  
  let router = module.api;
  
  // If api is a function (factory), call it with models and services
  // But first check if it's an Express router (not a factory)
  if (typeof router === 'function') {
    // Check if it's an Express router by looking for 'stack' property
    if (!router.stack) {
      // It's a factory function, try to create the router
      try {
        router = router(module.models, module.services);
      } catch (err) {
        console.error(`❌ Error creating router for ${module.name}:`, err.message);
        return;
      }
    }
  }
  
  // Only register if we have a valid express router
  if (router && typeof router === 'object' && router.stack) {
    const basePath = `/api/${module.name}`;
    app.use(basePath, router);
    console.log(`📍 Routes registered: ${basePath}/*`);
  } else if (!router) {
    console.log(`⚠️  No valid router for ${module.name} (api returned null/undefined)`);
  } else {
    console.log(`⚠️  Invalid router for ${module.name}:`, typeof router);
  }
};

/**
 * Seed demo data for a module
 */
const seedModuleDemoData = async (module, database) => {
  if (module.demoData && module.manifest?.demo) {
    try {
      console.log(`🌱 Seeding demo data for ${module.name}...`);
      
      // Demo data seeding logic would go here
      // Each module can define its own seeding logic
      
      console.log(`✅ Demo data seeded for ${module.name}`);
    } catch (error) {
      console.error(`❌ Error seeding demo data for ${module.name}:`, error.message);
    }
  }
};

export {
  initializeModuleSystem,
  loadAllModules,
  loadModule,
  initializeModule,
  resolveDependencies,
  getModule,
  getAllModules,
  getAllMenus,
  getAllPermissions,
  getAllRoutes,
  registerModuleRoutes,
  seedModuleDemoData,
  runInstallHook,
  runUninstallHook,
  moduleRegistry,
  moduleLoaderState
};

export default {
  initializeModuleSystem,
  loadAllModules,
  getModule,
  getAllModules,
  getAllMenus,
  getAllPermissions,
  runInstallHook,
  runUninstallHook
};
