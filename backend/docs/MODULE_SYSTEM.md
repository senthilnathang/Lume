# Lume Framework -- Module System

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Creating a New Module](#creating-a-new-module)
- [Module Dependencies and Load Order](#module-dependencies-and-load-order)
- [Install and Uninstall Hooks](#install-and-uninstall-hooks)
- [Module Lifecycle](#module-lifecycle)
- [Frontend Integration](#frontend-integration)
- [Menus and Permissions](#menus-and-permissions)

---

## Architecture Overview

Lume uses a modular architecture inspired by Odoo-style module systems. Each module is a self-contained unit with its own models, services, API routes, frontend views, and permissions.

```
Module System Flow
==================

  Startup
    |
    v
  __loader__.js discovers modules in src/modules/
    |
    v
  Loads __manifest__.js for each module
    |
    v
  Resolves dependencies (topological sort)
    |
    v
  Initializes modules in dependency order
    |            |
    v            v
  __init__.js   Registers API routes on Express app
    |
    v
  Syncs module state to installed_modules DB table
    |
    v
  Server ready
```

Key components:

- **`__loader__.js`** -- Module registry, discovery, dependency resolution, and lifecycle management.
- **`__manifest__.js`** -- Declarative module metadata (name, version, dependencies, permissions, menus).
- **`__init__.js`** -- Initialization function that wires up adapters, services, and routes.
- **Adapters** -- `PrismaAdapter` (for core Prisma models) or `DrizzleAdapter` (for module-defined Drizzle tables).
- **BaseService** -- Generic CRUD service that works with any adapter.
- **createCrudRouter** -- Auto-generates REST endpoints from an adapter.

---

## Creating a New Module

### Step 1: Create Directory Structure

```
backend/src/modules/my_module/
  __manifest__.js       # Module metadata (required)
  __init__.js           # Initialization function (required)
  models/
    schema.js           # Drizzle table definitions
    index.js            # Export all schemas
  services/
    index.js            # Service classes or factory
  api/
    index.js            # Express router factory
  data/
    demo.json           # Optional demo/seed data
  static/
    views/              # Vue frontend views
      my-view.vue
    api/
      index.ts          # Frontend API client
```

### Step 2: Write `__manifest__.js`

The manifest declares everything about the module:

```js
export default {
  // Display name (shown in UI)
  name: 'My Module',

  // Technical name (must match directory name)
  technicalName: 'my_module',

  // Semantic version
  version: '1.0.0',

  // Short summary (shown in module list)
  summary: 'Brief description of what this module does',

  // Full description (supports markdown)
  description: '# My Module\n\nDetailed description with markdown support.',

  // Author and contact
  author: 'Your Name',
  website: 'https://example.com',
  license: 'MIT',

  // Category for grouping in the module manager
  category: 'Business',  // System, Business, Communication, etc.

  // Whether this is a standalone application (shows in app switcher)
  application: true,

  // Whether the module can be installed/uninstalled via UI
  installable: true,

  // Whether to auto-install on system startup
  autoInstall: false,

  // Module dependencies (loaded before this module)
  // All modules implicitly depend on 'base'
  depends: ['base'],

  // File references (relative to module directory)
  models: ['models/index.js'],
  services: ['services/index.js'],
  api: ['api/index.js'],

  // Frontend configuration
  frontend: {
    routes: [],
    views: [
      'views/my-list.vue',
      'views/my-form.vue',
    ],
    menus: [
      {
        name: 'My Module',
        path: '/my-module',
        icon: 'lucide:box',
        sequence: 20,        // Lower = higher in sidebar
        children: [
          {
            name: 'Items',
            path: '/my-module/items',
            icon: 'lucide:list',
            sequence: 1,
            permission: 'my_module.items.read',
          },
        ],
      },
    ],
  },

  // Also accepted: top-level menus array
  // menus: [ ... ],

  // Permissions registered by this module
  permissions: [
    { name: 'my_module.items.read', description: 'View items', group: 'My Module' },
    { name: 'my_module.items.write', description: 'Create/edit items', group: 'My Module' },
    { name: 'my_module.items.delete', description: 'Delete items', group: 'My Module' },
    { name: 'my_module.items.manage', description: 'Full item control', group: 'My Module' },
  ],

  // Optional lifecycle hooks (file paths relative to module dir)
  installHook: 'hooks/install.js',    // Run on module install
  uninstallHook: 'hooks/uninstall.js', // Run on module uninstall
  preInit: null,                       // Run before __init__.js
  postInit: null,                      // Run after __init__.js

  // Settings schema (key-value pairs stored in settings table)
  settings: {
    my_setting: {
      type: 'string',
      default: 'hello',
      label: 'My Setting',
    },
  },
};
```

### Step 3: Write `models/schema.js`

Module tables use Drizzle ORM. Import column types from `drizzle-orm/mysql-core` and use the `baseColumns()` helper for standard `id`, `created_at`, and `updated_at` columns.

```js
import { mysqlTable, int, varchar, text, boolean, timestamp, json, mysqlEnum } from 'drizzle-orm/mysql-core';
import { baseColumns, withSoftDelete, withActive } from '../../../core/db/drizzle-helpers.js';

export const myItems = mysqlTable('my_module_items', {
  // Standard columns: id (auto-increment PK), created_at, updated_at
  ...baseColumns(),

  // Optional: soft delete support
  ...withSoftDelete(),

  // Optional: active flag
  ...withActive(),

  // Custom columns
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  category: mysqlEnum('category', ['typeA', 'typeB', 'typeC']).default('typeA'),
  amount: int('amount').default(0),
  metadata: json('metadata').$type().default({}),
  parentId: int('parent_id'),
  assignedTo: int('assigned_to'),
  publishedAt: timestamp('published_at'),
});
```

Available column helpers from `drizzle-helpers.js`:

| Helper           | Columns Added                             |
|------------------|-------------------------------------------|
| `baseColumns()`  | `id` (PK, auto-increment), `created_at`, `updated_at` |
| `withSoftDelete()` | `deleted_at` (nullable timestamp)       |
| `withActive()`   | `is_active` (boolean, default true)       |

Export all schemas from `models/index.js`:

```js
export { myItems } from './schema.js';
```

### Step 4: Write `services/index.js`

You can use BaseService directly or extend it:

```js
import { BaseService } from '../../../core/services/base.service.js';

// Option A: Simple factory using BaseService directly
export const createServices = (adapters) => {
  return {
    itemService: new BaseService(adapters.Item, { softDelete: true }),
  };
};

// Option B: Custom service class
export class MyModuleService {
  constructor(adapters) {
    this.itemService = new BaseService(adapters.Item, { softDelete: true });
  }

  async getActiveItems() {
    return this.itemService.search({
      domain: [['status', '=', 'active']],
      order: [['created_at', 'DESC']],
    });
  }

  async publishItem(id, userId) {
    return this.itemService.update(id, {
      status: 'published',
      publishedAt: new Date(),
    }, { userId });
  }
}

export default createServices;
```

### Step 5: Write `api/index.js`

The API file exports a factory function that receives adapters and services and returns an Express router:

```js
import { Router } from 'express';
import { authenticate, authorize } from '../../../core/middleware/auth.js';
import { createCrudRouter } from '../../../core/router/crud-router.js';

const createRoutes = (adapters, services) => {
  const router = Router();

  // Health check
  router.get('/health', (req, res) => {
    res.json({ success: true, status: 'healthy', module: 'my_module' });
  });

  // Auto CRUD for items (generates GET, POST, PUT, DELETE, etc.)
  router.use('/items', authenticate, createCrudRouter(adapters.Item, { softDelete: true }));

  // Custom endpoints
  router.post('/items/:id/publish', authenticate, authorize('my_module.items', 'write'), async (req, res) => {
    try {
      const result = await services.myModuleService.publishItem(
        req.params.id,
        req.user.id
      );
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  return router;
};

export default createRoutes;
```

### Step 6: Write `__init__.js`

The init function creates adapters, services, and registers routes:

```js
import { DrizzleAdapter } from '../../core/db/adapters/drizzle-adapter.js';
import { myItems } from './models/schema.js';
import { MyModuleService } from './services/index.js';
import createRoutes from './api/index.js';

const initializeMyModule = async (context) => {
  const { app } = context;

  console.log('Initializing My Module...');

  // 1. Create adapters for each table
  const adapters = {
    Item: new DrizzleAdapter(myItems),
  };

  // 2. Create services
  const services = {
    myModuleService: new MyModuleService(adapters),
  };

  // 3. Register API routes
  const routes = createRoutes(adapters, services);
  app.use('/api/my_module', routes);

  // 4. Store in context for other modules to access (optional)
  context.myModuleServices = services;

  console.log('My Module initialized');
  return { models: adapters, services };
};

export default initializeMyModule;
```

### Step 7: Add Frontend Views

Place Vue single-file components in `static/views/`:

```
backend/src/modules/my_module/static/views/
  my-list.vue
  my-form.vue
```

And create a frontend API client in `static/api/index.ts`:

```ts
import { get, post, put, del } from '@/api/request';

const BASE = '/api/my_module';

export const myModuleApi = {
  getItems: (params?: Record<string, any>) => get(`${BASE}/items`, { params }),
  getItem: (id: number) => get(`${BASE}/items/${id}`),
  createItem: (data: any) => post(`${BASE}/items`, data),
  updateItem: (id: number, data: any) => put(`${BASE}/items/${id}`, data),
  deleteItem: (id: number) => del(`${BASE}/items/${id}`),
};
```

---

## Module Dependencies and Load Order

Dependencies are declared in `__manifest__.js` via the `depends` array. The module loader performs a topological sort to determine initialization order.

Rules:

1. **All modules implicitly depend on `base`** -- even if not listed.
2. The `base` module is always loaded and initialized first.
3. If module A depends on module B, B is guaranteed to initialize before A.
4. Circular dependencies are detected and logged as warnings (the cycle is broken).
5. Legacy `'core'` dependency references are automatically mapped to `'base'`.

Example dependency chain:

```
base (no deps)
  |
  +-- base_automation (depends: ['base'])
  |
  +-- base_security (depends: ['base'])
  |
  +-- advanced_features (depends: ['base', 'base_automation', 'base_security'])
```

Load order: `base -> base_automation -> base_security -> advanced_features`

---

## Install and Uninstall Hooks

Modules can define hooks that run when they are installed or uninstalled via the API.

### Defining Hooks in the Manifest

```js
export default {
  // ...
  installHook: 'hooks/install.js',
  uninstallHook: 'hooks/uninstall.js',
};
```

### Hook File Format

```js
// hooks/install.js
export default async function onInstall(context) {
  // Seed initial data, create default records, etc.
  console.log('My module installed -- seeding defaults');
}

// hooks/uninstall.js
export default async function onUninstall(context) {
  // Clean up module-specific data if needed
  console.log('My module uninstalled -- cleaning up');
}
```

The hook file can export the function as `default`, `install`/`uninstall`, or `onInstall`/`onUninstall`.

---

## Module Lifecycle

Module state is persisted to the `installed_modules` database table (managed by Prisma).

### States

| State         | Description                                |
|---------------|--------------------------------------------|
| `installed`   | Module is active and its routes are live.  |
| `uninstalled` | Module code is loaded but routes are inactive. |

### State Transitions

```
                    POST /api/modules/:name/install
   uninstalled  ------------------------------------------>  installed
                <------------------------------------------
                    POST /api/modules/:name/uninstall
```

### On Server Startup

1. All module directories are discovered and their manifests loaded.
2. Modules are initialized in dependency order (all run `__init__.js`).
3. Each module is upserted into the `installed_modules` table.
4. The in-memory `initialized` flag is set from the persisted DB state.
5. Only menus and permissions from `installed` modules are returned by the API.

### Constraints

- The `base` module cannot be uninstalled.
- A module cannot be uninstalled if other installed modules depend on it.
- Dependencies must be installed before a module can be installed.

### Management API

| Endpoint                              | Method | Description              |
|---------------------------------------|--------|--------------------------|
| `/api/modules`                        | GET    | List all modules         |
| `/api/modules/:name`                  | GET    | Get module details       |
| `/api/modules/:name/install`          | POST   | Install a module         |
| `/api/modules/:name/uninstall`        | POST   | Uninstall a module       |
| `/api/modules/:name/upgrade`          | POST   | Upgrade a module version |

---

## Frontend Integration

### Custom Views Map

In the frontend router (`frontend/apps/web-lume/src/router/index.ts`), a `customViews` map associates route paths with module view components:

```ts
const customViews: Record<string, () => Promise<any>> = {
  'my-module': () => import('@modules/my_module/static/views/my-list.vue'),
  'my-module/items': () => import('@modules/my_module/static/views/my-list.vue'),
};
```

### Vite Alias

The `@modules` alias is configured in `vite.config.ts` to resolve to `backend/src/modules/`:

```ts
resolve: {
  alias: {
    '@modules': path.resolve(__dirname, '../../../backend/src/modules'),
  },
},
```

This allows frontend code to import module views and API clients:

```ts
import MyView from '@modules/my_module/static/views/my-list.vue';
import { myModuleApi } from '@modules/my_module/static/api/index';
```

### Static File Serving

The backend serves module static files at `/modules/{moduleName}/static/...`. The frontend Vite dev server proxies API requests to the backend.

---

## Menus and Permissions

### Menus

Menus are declared in the manifest and automatically aggregated by the module system. When multiple modules declare menus with the same `path`, their children are merged and sorted by `sequence`.

Menu structure:

```js
{
  name: 'Parent Menu',       // Display name
  path: '/parent',           // Route path
  icon: 'lucide:icon-name',  // Lucide icon identifier
  sequence: 10,              // Sort order (lower = first)
  children: [
    {
      name: 'Child Item',
      path: '/parent/child',
      icon: 'lucide:sub-icon',
      sequence: 1,
      permission: 'module.resource.action',  // Required permission to see this item
    },
  ],
}
```

The menus API (`GET /api/menus`) only returns menus from installed modules.

### Permissions

Permissions follow the naming convention `{module}.{resource}.{action}`:

```
base.users.read
base.users.write
base.users.manage
my_module.items.read
my_module.items.write
```

Permission objects in the manifest:

```js
permissions: [
  {
    name: 'my_module.items.read',
    description: 'View items',
    group: 'My Module',   // UI grouping label
  },
]
```

Permissions are seeded into the database during `db:init` and can be assigned to roles via the role management UI.
