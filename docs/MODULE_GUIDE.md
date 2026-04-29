# Lume Framework — Module Development Guide

**Version:** 2.0.0  
**Updated:** 2026-04-28

This guide explains how to create, configure, and manage modules in the Lume Framework modular architecture.

---

## Table of Contents

1. [Module Overview](#module-overview)
2. [Module Structure](#module-structure)
3. [Creating a Module](#creating-a-module)
4. [Module Manifest](#module-manifest)
5. [Services & Adapters](#services--adapters)
6. [API Routes](#api-routes)
7. [Frontend Integration](#frontend-integration)
8. [Module Permissions](#module-permissions)
9. [Lifecycle Hooks](#lifecycle-hooks)
10. [Module Dependencies](#module-dependencies)
11. [Testing Modules](#testing-modules)

---

## Module Overview

A **module** is a self-contained, pluggable unit of functionality. Each module:
- Has its own database tables (via Drizzle schemas)
- Registers API routes
- Defines permissions and menu items
- Can depend on other modules
- Can be enabled/disabled dynamically

### Current Modules (24)

**Core Modules:**
- `base` - User/role/permission management
- `security` - Authentication & authorization
- `security-audit` - OWASP scanning, vulnerability detection

**Feature Modules:**
- `website` - CMS (pages, menus, media, forms)
- `editor` - TipTap visual page builder
- `media` - Media library management
- `audit` - Audit logging
- `documents` - Document management
- `team` - Team collaboration
- `messages` - Internal messaging
- `donations` - Donation processing
- `activities` - Activity tracking
- ... (14+ more)

---

## Module Structure

```
backend/src/modules/{name}/
├── manifest.js              # Module metadata & configuration
├── __init__.js              # Module initialization
├── models/
│   └── schema.js            # Drizzle table definitions
├── services/
│   ├── {name}.service.js    # Main service
│   └── ...
├── routes.js                # API route definitions
├── middleware/
│   └── ...                  # Module-specific middleware
├── static/                  # Frontend code for module
│   ├── views/              # Vue components
│   ├── api/                # Frontend API clients
│   └── components/         # Reusable components
├── tests/
│   └── ...                 # Module tests
└── README.md               # Module documentation
```

---

## Creating a Module

### Step 1: Create Directory Structure

```bash
mkdir -p backend/src/modules/mymodule/{models,services,routes,static/views,static/api,tests}
```

### Step 2: Create Manifest

**File: `backend/src/modules/mymodule/manifest.js`**

```javascript
export default {
  // Module metadata
  name: 'mymodule',
  displayName: 'My Module',
  description: 'My custom module',
  version: '1.0.0',
  author: 'Your Name',
  license: 'MIT',
  enabled: true,

  // Dependencies on other modules
  dependencies: ['base'], // base is always required

  // Database adapter type
  ormType: 'drizzle',

  // Registered permissions
  permissions: [
    {
      name: 'mymodule.view',
      description: 'View module data',
      category: 'My Module'
    },
    {
      name: 'mymodule.create',
      description: 'Create new records',
      category: 'My Module'
    },
    {
      name: 'mymodule.edit',
      description: 'Edit records',
      category: 'My Module'
    },
    {
      name: 'mymodule.delete',
      description: 'Delete records',
      category: 'My Module'
    }
  ],

  // Admin menu items
  menuItems: [
    {
      name: 'My Module',
      path: '/mymodule',
      icon: 'star',
      category: 'Custom'
    },
    {
      name: 'Settings',
      path: '/mymodule/settings',
      icon: 'settings',
      category: 'Custom',
      parent: '/mymodule' // Creates submenu
    }
  ]
};
```

### Step 3: Define Database Schema

**File: `backend/src/modules/mymodule/models/schema.js`**

```javascript
import { table, varchar, text, int, timestamp, boolean } from '../../../core/db/dialect.js';
import { baseColumns, withSoftDelete } from '../../../core/db/drizzle-helpers.js';

export const mymoduleItems = table('mymodule_items', {
  ...baseColumns(),
  ...withSoftDelete(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('active'),
  priority: int('priority').default(0),
  isPublished: boolean('is_published').default(false),
  publishedAt: timestamp('published_at'),
  createdBy: int('created_by').notNull(),
  updatedBy: int('updated_by')
});
```

### Step 4: Create Service Layer

**File: `backend/src/modules/mymodule/services/mymodule.service.js`**

```javascript
import { BaseService } from '../../../core/services/base.service.js';

export class MyModuleService extends BaseService {
  constructor(drizzle, prisma) {
    super(drizzle, prisma, 'mymodule_items');
    this.drizzle = drizzle;
    this.prisma = prisma;
  }

  async getPublished(filters = {}) {
    return await this.list({
      ...filters,
      isPublished: true
    });
  }

  async publish(id, userId) {
    return await this.update(id, {
      isPublished: true,
      publishedAt: new Date(),
      updatedBy: userId
    });
  }

  async getByStatus(status, options = {}) {
    return await this.list({
      status,
      ...options
    });
  }
}
```

### Step 5: Create API Routes

**File: `backend/src/modules/mymodule/routes.js`**

```javascript
import { Router } from 'express';
import { authorize } from '../../../core/middleware/auth.js';
import { MyModuleService } from './services/mymodule.service.js';
import { createCrudRouter } from '../../../core/router/crud-router.js';

export function createMyModuleRoutes(drizzle, prisma) {
  const router = Router();
  const service = new MyModuleService(drizzle, prisma);

  // Auto-generate standard CRUD routes
  const crudRouter = createCrudRouter(service, 'mymodule');
  router.use('/', crudRouter);

  // Custom routes
  router.get('/published', authorize('mymodule.view'), async (req, res) => {
    try {
      const items = await service.getPublished();
      res.json({
        success: true,
        data: items
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  });

  router.post('/:id/publish', authorize('mymodule.edit'), async (req, res) => {
    try {
      const item = await service.publish(req.params.id, req.user.id);
      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  });

  return router;
}
```

### Step 6: Create Initialization

**File: `backend/src/modules/mymodule/__init__.js`**

```javascript
import manifest from './manifest.js';
import { MyModuleService } from './services/mymodule.service.js';
import { createMyModuleRoutes } from './routes.js';
import { mymoduleItems } from './models/schema.js';

export async function initializeMyModuleModule(app, drizzle, prisma) {
  console.log('🔧 Initializing My Module...');

  try {
    // Create service instance
    const service = new MyModuleService(drizzle, prisma);

    // Register routes
    const routes = createMyModuleRoutes(drizzle, prisma);
    app.use('/api/mymodule', routes);

    // Export service for other modules
    global.MyModuleService = MyModuleService;

    console.log('✅ My Module initialized');
    return {
      service,
      schema: mymoduleItems
    };
  } catch (error) {
    console.error('❌ Failed to initialize My Module:', error);
    throw error;
  }
}

export { MyModuleService };
export default manifest;
```

### Step 7: Create Frontend Views

**File: `backend/src/modules/mymodule/static/views/index.vue`**

```vue
<template>
  <div class="mymodule-list">
    <div class="header">
      <h1>My Module</h1>
      <button @click="openCreateDialog" class="btn-primary">
        Create Item
      </button>
    </div>

    <div class="filters">
      <input
        v-model="search"
        type="text"
        placeholder="Search..."
        @input="loadItems"
      />
      <select v-model="filterStatus" @change="loadItems">
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>

    <table v-if="items.length" class="table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Status</th>
          <th>Priority</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td>{{ item.title }}</td>
          <td>{{ item.status }}</td>
          <td>{{ item.priority }}</td>
          <td>
            <button @click="editItem(item)">Edit</button>
            <button @click="deleteItem(item.id)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-else class="empty">
      No items found
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getApi } from '@/api/request';

const items = ref([]);
const search = ref('');
const filterStatus = ref('');

const loadItems = async () => {
  try {
    const response = await getApi().get('/mymodule', {
      params: {
        search: search.value,
        status: filterStatus.value
      }
    });
    items.value = response.data.items;
  } catch (error) {
    console.error('Failed to load items:', error);
  }
};

const editItem = (item: any) => {
  // Handle edit
};

const deleteItem = async (id: number) => {
  if (!confirm('Are you sure?')) return;
  try {
    await getApi().delete(`/mymodule/${id}`);
    await loadItems();
  } catch (error) {
    console.error('Failed to delete item:', error);
  }
};

const openCreateDialog = () => {
  // Open dialog
};

onMounted(() => {
  loadItems();
});
</script>

<style scoped>
.mymodule-list {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 10px;
  border: 1px solid #ddd;
  text-align: left;
}

.table th {
  background-color: #f5f5f5;
}

.empty {
  text-align: center;
  padding: 40px;
  color: #999;
}
</style>
```

---

## Module Manifest

The manifest defines module metadata and configuration:

```javascript
{
  // Unique identifier
  name: 'mymodule',

  // Display name in UI
  displayName: 'My Module',

  // Description
  description: 'What this module does',

  // Semantic versioning
  version: '1.0.0',

  // Author information
  author: 'Your Name',
  license: 'MIT',

  // Module state
  enabled: true,

  // List of required modules
  dependencies: ['base'],

  // Database ORM type ('drizzle' or 'prisma')
  ormType: 'drizzle',

  // Registered permissions
  permissions: [
    {
      name: 'module.action',
      description: 'What users can do',
      category: 'Category Name'
    }
  ],

  // Admin menu items
  menuItems: [
    {
      name: 'Display Name',
      path: '/module',
      icon: 'icon-name',
      category: 'Category',
      parent: '/parent' // Optional parent path
    }
  ]
}
```

---

## Services & Adapters

Modules use the adapter pattern for ORM abstraction:

```javascript
// BaseService - Generic CRUD
const service = new BaseService(drizzle, prisma, 'table_name');

// List records
const records = await service.list(filters, options);

// Get one record
const record = await service.get(id);

// Create record
const created = await service.create(data);

// Update record
const updated = await service.update(id, changes);

// Delete record
await service.delete(id); // Soft delete
await service.delete(id, { hardDelete: true }); // Hard delete
```

---

## API Routes

### Standard CRUD Routes

Auto-generated via `createCrudRouter`:

```
GET    /api/mymodule              # List all
GET    /api/mymodule/:id          # Get one
POST   /api/mymodule              # Create
PUT    /api/mymodule/:id          # Update
DELETE /api/mymodule/:id          # Delete
GET    /api/mymodule/fields       # Get schema fields
POST   /api/mymodule/bulk         # Bulk create
DELETE /api/mymodule/bulk         # Bulk delete
```

### Authorization

```javascript
router.get('/', authorize('mymodule.view'), handler);
router.post('/', authorize('mymodule.create'), handler);
router.put('/:id', authorize('mymodule.edit'), handler);
router.delete('/:id', authorize('mymodule.delete'), handler);
```

---

## Frontend Integration

### Module Views

All module frontend code lives in `static/` directory:

```
backend/src/modules/mymodule/static/
├── views/
│   ├── index.vue           # List view
│   ├── detail.vue          # Detail view
│   └── form.vue            # Form component
├── api/
│   └── index.ts            # API client
└── components/
    └── MyComponent.vue
```

### Using Module Components

```javascript
// Import from module
import MyForm from '@modules/mymodule/static/views/form.vue';

// Or use module API client
import { getItems } from '@modules/mymodule/static/api';
const items = await getItems();
```

---

## Module Permissions

Permissions control access to module features:

```javascript
// Check permission
authorize('mymodule.view')
authorize('mymodule.create')
authorize('mymodule.edit')
authorize('mymodule.delete')

// In service
if (!req.user.hasPermission('mymodule.edit')) {
  throw new ForbiddenException();
}
```

---

## Lifecycle Hooks

Modules execute hooks during initialization:

```javascript
// On module load
export async function onModuleLoad(app, drizzle, prisma) {
  console.log('Module loading...');
}

// On module initialize
export async function onModuleInitialize(app, drizzle, prisma) {
  console.log('Module initializing...');
}

// On module install
export async function onModuleInstall(app, drizzle, prisma) {
  console.log('Module installing...');
  // Create tables, seed data, etc.
}

// On module uninstall
export async function onModuleUninstall(app, drizzle, prisma) {
  console.log('Module uninstalling...');
  // Drop tables, cleanup, etc.
}
```

---

## Module Dependencies

Modules can depend on other modules:

```javascript
// In manifest.js
dependencies: ['base', 'security', 'media']

// Access dependency services
const mediaService = global.MediaService;
const baseService = global.BaseService;
```

The module loader handles:
- Loading modules in dependency order
- Resolving circular dependencies
- Validating all dependencies exist
- Initializing in correct sequence

---

## Testing Modules

```javascript
// backend/src/modules/mymodule/tests/mymodule.service.test.js
import { MyModuleService } from '../services/mymodule.service.js';

describe('MyModuleService', () => {
  let service;
  let mockDrizzle;
  let mockPrisma;

  beforeEach(() => {
    mockDrizzle = {};
    mockPrisma = {};
    service = new MyModuleService(mockDrizzle, mockPrisma);
  });

  it('should list all items', async () => {
    const items = await service.list();
    expect(Array.isArray(items)).toBe(true);
  });

  it('should create a new item', async () => {
    const item = await service.create({
      title: 'Test',
      description: 'Test description'
    });
    expect(item.id).toBeDefined();
  });
});
```

---

## Module Configuration

Environment variables for modules:

```bash
# Enable/disable module
MYMODULE_ENABLED=true

# Module-specific settings
MYMODULE_API_KEY=xxx
MYMODULE_TIMEOUT=5000
```

---

## Best Practices

1. **Separation of Concerns**
   - Keep business logic in services
   - Keep route handling in routes
   - Keep data models in schemas

2. **Error Handling**
   - Return proper HTTP status codes
   - Include error details in responses
   - Log errors for debugging

3. **Security**
   - Always use `authorize()` middleware
   - Validate user input
   - Use parameterized queries

4. **Performance**
   - Use pagination for lists
   - Index frequently queried fields
   - Cache expensive operations

5. **Testing**
   - Write unit tests for services
   - Write integration tests for routes
   - Aim for >80% code coverage

---

## Troubleshooting

### Module not loading
- Check manifest.js syntax
- Verify dependencies are installed
- Check console for error messages

### Routes not registered
- Verify routes.js exports function correctly
- Check module is enabled
- Verify authorization middleware

### Database errors
- Run `npx prisma migrate deploy`
- Check schema.js column names
- Verify table names are unique

---

## Examples

### Complete Example: Blog Module

See the built-in modules for examples:
- `website` - Full CMS implementation
- `editor` - TipTap integration
- `media` - File management
- `security-audit` - Security features

---

**Next Steps:**
1. Read [ARCHITECTURE.md](ARCHITECTURE.md) for system design
2. Review existing modules for patterns
3. Create your first module following this guide
4. Test thoroughly before production

---

**Version:** 2.0.0  
**Last Updated:** April 28, 2026  
**Lume Framework**
