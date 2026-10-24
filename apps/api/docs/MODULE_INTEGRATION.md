# Module Integration & Wiring Guide

Complete guide for integrating and wiring up modules in the Lume framework.

## Overview

Modules encapsulate related entities, workflows, policies, and views into deployable units. The framework provides automatic dependency resolution, validation, and lifecycle management.

## Module Loading Architecture

```
Application Bootstrap
    ↓
ModuleInitializerService
    ↓
ModuleWiring Configuration
    ├─ Load Example Modules (dev/demo)
    ├─ Load Production Modules (installed packages)
    └─ Load Custom Modules (installed plugins)
    ↓
ModuleLoaderService
    ├─ Validate Dependencies
    ├─ Resolve Load Order (topological sort)
    ├─ Register to MetadataRegistry
    └─ Initialize Module Lifecycle
    ↓
Framework Ready
    ├─ Entities available for CRUD
    ├─ Workflows ready for execution
    ├─ Policies enforced on access
    └─ Views available for rendering
```

## Quick Start

### 1. Enable Module Loading in app.module.ts

```typescript
import { Module } from '@nestjs/common';
import { ModuleInitializerService } from '@core/module/module-initializer.service.js';

@Module({
  providers: [ModuleInitializerService],
})
export class AppModule implements OnModuleInit {
  constructor(private moduleInitializer: ModuleInitializerService) {}

  async onModuleInit(): Promise<void> {
    // Modules are loaded automatically
    await this.moduleInitializer.onModuleInit();
  }
}
```

### 2. Configure Module Loading

Set environment variables to control module loading:

```bash
# Load example modules (for dev/demo)
LOAD_EXAMPLE_MODULES=true

# Auto-run migrations on module install
AUTO_MIGRATE_MODULES=true

# Enable verbose logging
VERBOSE_MODULE_LOGGING=true
```

### 3. Verify Modules Loaded

Check logs at startup:

```
[Framework] Initializing modules...
[Framework] Loading module: crm v2.0.0
[Framework] ✓ Module loaded: crm
[Framework] Loading module: ecommerce v2.0.0
[Framework] ✓ Module loaded: ecommerce
[Framework] Loading module: project-management v2.0.0
[Framework] ✓ Module loaded: project-management
[Framework] ========================================
[Framework] Loaded 3 module(s)
[Framework] Registered 8 entity(ies)
[Framework] Registered 9 workflow(s)
[Framework] Registered 12 policy(ies)
[Framework] ========================================
```

## Module Wiring Details

### Module Configuration

Use `src/core/module/module-wiring.ts` to control module loading:

```typescript
import { getModuleConfig, loadExampleModules, loadProductionModules, planModuleLoading, logModuleLoadingPlan } from '@core/module/module-wiring.js';

const config = getModuleConfig();
const exampleMods = config.loadExamples ? await loadExampleModules() : [];
const prodMods = await loadProductionModules();
const plan = planModuleLoading(exampleMods, prodMods);

if (config.verboseLogging) {
  logModuleLoadingPlan(plan, true);
}
```

### Module Loading Order

Modules are loaded in dependency order using topological sorting:

```
1. base (no dependencies)
2. crm (depends: base)
3. ecommerce (depends: base)
4. project-management (depends: base)
```

### Dependency Resolution

Modules declare dependencies:

```typescript
const CRMModule = defineModule({
  name: 'crm',
  depends: ['base'], // Load 'base' first
  // ...
});
```

The loader verifies:
- All dependencies exist
- No circular dependencies
- Load order respects dependency graph

## Extending Modules

### 1. Create Custom Module

```typescript
// src/modules/custom/custom.module.ts
import { defineModule } from '@core/module/define-module.js';

export const CustomModule = defineModule({
  name: 'custom',
  version: '1.0.0',
  depends: ['crm'], // Extend CRM
  entities: [/* your entities */],
  workflows: [/* your workflows */],
  permissions: [/* your permissions */],
});
```

### 2. Wire Module for Loading

Update `module-wiring.ts`:

```typescript
export async function loadProductionModules(): Promise<ModuleDefinition[]> {
  const modules: ModuleDefinition[] = [];

  const { CustomModule } = await import('@modules/custom/custom.module.js');
  modules.push(CustomModule);

  return modules;
}
```

### 3. Load at Runtime

```typescript
const customModule = await import('@modules/custom/custom.module.js');
await moduleLoader.loadModule(customModule.CustomModule);
```

## Module Lifecycle

### 1. Installation

```bash
# Via API
POST /admin/modules/custom/install
{
  "manifestPath": "/path/to/manifest.json"
}

# Programmatically
await moduleLoader.installModule(customModule);
```

Events triggered:
- Module validation
- Dependency check
- Migration execution (if any)
- Entity registration
- Workflow registration
- Policy registration

### 2. Loading

Modules are loaded in dependency order:

```typescript
await moduleLoader.loadModule(CustomModule);
```

Executed:
1. Register entities to MetadataRegistry
2. Register workflows to WorkflowRegistry
3. Register policies to PolicyRegistry
4. Execute onLoad hooks

### 3. Usage

Once loaded, module components are available:

```typescript
// Access entities
const customEntity = metadataRegistry.getEntity('CustomEntity');
await recordService.create('CustomEntity', data);

// Execute workflows
await workflowExecutor.execute('custom-workflow', trigger, context);

// Evaluate policies
const allowed = policyEvaluator.evaluate(policy, context);
```

### 4. Uninstallation

```bash
# Via API
DELETE /admin/modules/custom

# Programmatically
await moduleLoader.uninstallModule('custom');
```

Events triggered:
- onUninstall hooks
- Migration cleanup
- Entity deregistration
- Workflow removal
- Policy removal

## Module Testing

### Unit Tests

Test module definitions in isolation:

```typescript
import { CRMModule } from '@examples/crm-module.example.js';

describe('CRM Module', () => {
  it('should have Lead entity', () => {
    expect(CRMModule.entities).toContainEqual(
      expect.objectContaining({ name: 'Lead' })
    );
  });

  it('should have required workflows', () => {
    expect(CRMModule.workflows.map(w => w.name)).toContain('lead-assignment');
  });
});
```

### Integration Tests

Test module loading and interaction:

```typescript
import { ModuleLoaderService } from '@core/module/module-loader.service.js';
import { CRMModule } from '@examples/crm-module.example.js';

describe('Module Integration', () => {
  it('should load CRM module successfully', async () => {
    await moduleLoader.loadModule(CRMModule);
    
    const entity = metadataRegistry.getEntity('Lead');
    expect(entity).toBeDefined();
  });

  it('should register CRM workflows', async () => {
    await moduleLoader.loadModule(CRMModule);
    
    const workflow = metadataRegistry.getWorkflow('lead-assignment');
    expect(workflow).toBeDefined();
  });
});
```

Run integration tests:

```bash
NODE_OPTIONS='--experimental-vm-modules' npm test -- test/integration/module-integration.test.ts
```

## Production Considerations

### 1. Module Discovery

In production, load modules from installed packages:

```typescript
export async function loadProductionModules(): Promise<ModuleDefinition[]> {
  const modules: ModuleDefinition[] = [];
  
  // Scan node_modules for @lume modules
  const packages = scanNodeModules('@lume');
  
  for (const pkg of packages) {
    const module = await import(pkg.mainEntry);
    modules.push(module.default);
  }
  
  return modules;
}
```

### 2. Performance Optimization

Lazy-load modules on demand:

```typescript
const moduleCache = new Map<string, ModuleDefinition>();

async function getModule(name: string): Promise<ModuleDefinition> {
  if (!moduleCache.has(name)) {
    const module = await import(`@modules/${name}`);
    moduleCache.set(name, module.default);
  }
  return moduleCache.get(name);
}
```

### 3. Error Handling

Handle module loading failures gracefully:

```typescript
try {
  await moduleLoader.loadModule(CRMModule);
} catch (error) {
  logger.error(`Failed to load CRM module: ${error.message}`);
  // Continue with partial module load
  // Or fallback to minimal modules
}
```

### 4. Validation

Validate all modules before loading:

```typescript
const plan = planModuleLoading(modules, []);

if (plan.errors.length > 0) {
  console.error('Module validation failed:');
  plan.errors.forEach(e => console.error(`  - ${e}`));
  process.exit(1);
}
```

## Troubleshooting

### Module Not Loading

**Check module dependencies:**

```typescript
const plan = planModuleLoading([module], []);
console.log(plan.errors); // Shows missing dependencies
```

**Verify module definition:**

```typescript
const module = await import('@modules/mymodule');
console.log(module.MyModule.depends); // Should list all dependencies
console.log(module.MyModule.entities); // Should list entities
```

### Circular Dependencies

**Error:** `Circular dependency detected: module-a → module-b → module-a`

**Solution:** Restructure modules to break cycle:

```
module-a (base)
    ↓
module-b (depends: a)
    ↓
module-c (depends: a, b)
```

### Entity Name Conflicts

**Error:** Multiple modules define same entity name

**Solution:** Use namespaced entity names:

```typescript
// Instead of:
defineEntity('Order', { /* ... */ })

// Use:
defineEntity('EcomOrder', { /* ... */ })
defineEntity('PMOrder', { /* ... */ })
```

### Missing Migrations

**Error:** Module loaded but database not updated

**Solution:** Enable auto-migrations:

```bash
AUTO_MIGRATE_MODULES=true npm start
```

Or run manually:

```bash
npx ts-node migrations/run-migrations.ts
```

## Advanced: Custom Module Hooks

Modules can define lifecycle hooks:

```typescript
const MyModule = defineModule({
  name: 'mymodule',
  hooks: {
    onInstall: async (db) => {
      // Run migrations, seed data
      await db.execute('CREATE TABLE my_table (...)');
    },
    onLoad: async () => {
      // Initialize, warm caches
      console.log('MyModule loaded');
    },
    onUninstall: async (db) => {
      // Cleanup, remove data
      await db.execute('DROP TABLE my_table');
    },
    onUpgrade: async (fromVersion) => {
      // Handle version transitions
      console.log(`Upgrading from ${fromVersion}`);
    },
  },
});
```

## Resources

- [Module Definition Guide](../examples/README.md)
- [Example Modules](../examples/)
- [Integration Tests](../test/integration/module-integration.test.ts)
- [Module Wiring Configuration](../src/core/module/module-wiring.ts)
- [Module Loader Service](../src/core/module/module-loader.service.ts)
