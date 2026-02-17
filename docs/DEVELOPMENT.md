# Lume Framework — Development Guide

This guide covers day-to-day development workflows, coding conventions, and how to extend the framework.

---

## Table of Contents

1. [Development Setup](#development-setup)
2. [Running the Application](#running-the-application)
3. [Creating a New Module](#creating-a-new-module)
4. [Adding Frontend Views](#adding-frontend-views)
5. [Working with the Page Builder](#working-with-the-page-builder)
6. [Database Operations](#database-operations)
7. [API Development](#api-development)
8. [Testing](#testing)
9. [Coding Conventions](#coding-conventions)
10. [Troubleshooting](#troubleshooting)

---

## Development Setup

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ | LTS recommended |
| MySQL | 8.0+ | Primary database |
| pnpm | 8+ | Package manager (monorepo) |
| Git | 2.30+ | Version control |

### Initial Setup

```bash
# Clone and enter project
git clone <repo-url> && cd lume

# Backend
cd backend
npm install
npx prisma generate
npx prisma db push
npm run db:init

# Frontend (admin panel)
cd ../frontend/apps/web-lume
npm install

# Frontend (public site)
cd ../riagri-website
npm install
```

### Environment Files

**Backend** (`backend/.env`):

```env
DATABASE_URL="mysql://gawdesy:gawdesy@localhost:3306/lume"
JWT_SECRET="your-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
PORT=3000
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"
```

**Admin Frontend** (`frontend/apps/web-lume/.env`):

```env
VITE_API_URL=/api
VITE_PUBLIC_SITE_URL=http://localhost:3007
```

---

## Running the Application

You need three servers running for full development:

| Server | Directory | Command | Port | Purpose |
|--------|-----------|---------|------|---------|
| Backend | `backend/` | `npm run dev` | 3000 | Express API |
| Admin Panel | `frontend/apps/web-lume/` | `npm run dev` | 5173 | Vue 3 SPA |
| Public Site | `frontend/apps/riagri-website/` | `npm run dev` | 3007 | Nuxt 3 SSR |

**Login credentials**: `admin@lume.dev` / `admin123`

The admin panel's Vite dev server proxies `/api` requests to `http://localhost:3000`.

---

## Creating a New Module

### 1. Create the Directory Structure

```bash
mkdir -p backend/src/modules/my_module/{models,services,static/{views,api,components}}
```

### 2. Create the Manifest (`__manifest__.js`)

```javascript
export default {
  name: 'My Module',
  technicalName: 'my_module',
  version: '1.0.0',
  summary: 'Short description',
  description: '# My Module\n\nDetailed description here.',
  author: 'Your Name',
  category: 'Data',
  application: true,
  installable: true,
  autoInstall: false,
  depends: ['base'],
  models: ['models/schema.js'],
  api: ['my_module.routes.js'],
  services: ['services/my_module.service.js'],
  frontend: {
    views: ['views/index.vue'],
    menus: [
      {
        name: 'My Module',
        path: '/my-module',
        icon: 'lucide:box',
        sequence: 30,
        children: [
          { name: 'Items', path: '/my-module/items', icon: 'lucide:list', sequence: 1 },
        ]
      }
    ]
  },
  permissions: [
    'my_module.item.read',
    'my_module.item.create',
    'my_module.item.edit',
    'my_module.item.delete',
  ]
};
```

### 3. Create the Drizzle Schema (`models/schema.js`)

```javascript
import { mysqlTable, int, varchar, text, boolean, timestamp } from 'drizzle-orm/mysql-core';

export const myItems = mysqlTable('my_items', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  deletedAt: timestamp('deleted_at'),
});
```

### 4. Create the Service (`services/my_module.service.js`)

```javascript
import { BaseService } from '../../../core/services/base.service.js';

export class MyModuleService extends BaseService {
  constructor(adapter) {
    super(adapter);
  }

  // Add custom methods beyond CRUD
  async findActive() {
    return this.search({
      where: [['is_active', '=', true]],
      order: [['name', 'asc']],
    });
  }
}
```

### 5. Create Routes (`my_module.routes.js`)

```javascript
import { createCrudRouter } from '../../core/router/crud-router.js';

export default function createRoutes(service) {
  const router = createCrudRouter(service, {
    moduleName: 'my_module',
    resourceName: 'item',
  });

  // Add custom routes
  router.get('/active', async (req, res) => {
    const items = await service.findActive();
    res.json({ success: true, data: items });
  });

  return router;
}
```

### 6. Create the Init File (`__init__.js`)

```javascript
import { DrizzleAdapter } from '../../core/db/adapters/drizzle-adapter.js';
import { MyModuleService } from './services/my_module.service.js';
import { myItems } from './models/schema.js';
import createRoutes from './my_module.routes.js';

export async function initialize({ app, drizzle }) {
  const adapter = new DrizzleAdapter(drizzle, myItems, { softDelete: true });
  const service = new MyModuleService(adapter);
  const router = createRoutes(service);

  app.use('/api/my-module', router);

  return { models: { myItems }, services: { myModuleService: service } };
}
```

### 7. Install the Module

Navigate to **Settings > Modules** in the admin panel and click **Install** on your module, or restart the server if `autoInstall: true`.

---

## Adding Frontend Views

All module-specific views live in `backend/src/modules/{name}/static/views/`.

### Create a View (`static/views/index.vue`)

```vue
<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <component :is="BoxIcon" class="w-6 h-6 text-gray-600" />
        <h1 class="text-xl font-semibold">My Items</h1>
      </div>
      <a-button type="primary" @click="showCreate = true">
        <template #icon><component :is="PlusIcon" class="w-4 h-4" /></template>
        Add Item
      </a-button>
    </div>

    <a-table :columns="columns" :dataSource="items" :loading="loading" rowKey="id" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Box as BoxIcon, Plus as PlusIcon } from 'lucide-vue-next'
import { getItems } from '../api/index'

const items = ref([])
const loading = ref(false)
const showCreate = ref(false)

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Status', dataIndex: 'isActive', key: 'isActive' },
]

onMounted(async () => {
  loading.value = true
  try {
    items.value = await getItems()
  } finally {
    loading.value = false
  }
})
</script>
```

### Create the API Client (`static/api/index.ts`)

```typescript
import { get, post, put, del } from '@/api/request'

export const getItems = (params?: any) => get('/my-module', { params })
export const getItem = (id: number) => get(`/my-module/${id}`)
export const createItem = (data: any) => post('/my-module', data)
export const updateItem = (id: number, data: any) => put(`/my-module/${id}`, data)
export const deleteItem = (id: number) => del(`/my-module/${id}`)
```

### Register as Custom View

In `frontend/apps/web-lume/src/router/index.ts`, add to the `customViews` map:

```typescript
const customViews: Record<string, () => Promise<any>> = {
  // ... existing views
  'my-module/items': () => import('@modules/my_module/static/views/index.vue'),
}
```

---

## Working with the Page Builder

### Creating Pages

1. Navigate to **Website > Pages** in the admin panel
2. Click **New Page** — this opens the visual page builder
3. Use the **Widget Palette** (left panel) to drag blocks onto the canvas
4. Click any block to edit its content or configure settings (right panel)
5. Toggle between **Visual** and **Text** (raw JSON) modes
6. Set page metadata (slug, SEO, publish status) in the right sidebar
7. Click **Save** to persist, **Preview** to see the live preview

### Content Format

All page content is stored as TipTap JSON:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "sectionBlock",
      "attrs": { "backgroundColor": "#ffffff" },
      "content": [
        { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "Title" }] },
        { "type": "paragraph", "content": [{ "type": "text", "text": "Body text" }] }
      ]
    }
  ]
}
```

### Available Widget Blocks (30+)

| Category | Blocks |
|----------|--------|
| Text | Heading, Paragraph, Bullet List, Numbered List, Quote, Code Block |
| Layout | Section, Columns, Spacer, Divider |
| Content | Advanced Heading, Dual Heading, Info Box, FAQ, Team Member, Testimonial, Posts Grid, Icon List, Callout |
| Media | Image, Video, Image Gallery |
| Interactive | Button, Marketing Button, Countdown, Content Toggle, Modal Popup, Progress Bar |
| Commercial | Price Table, Price List |
| Utility | Table, HTML, Google Map, Contact Form, Business Hours |
| Social | Social Share |

### Adding a New Block Type

1. Create the TipTap extension in `modules/editor/static/extensions/`
2. Create the NodeView component in `modules/editor/static/components/blocks/`
3. Create the render component in `modules/editor/static/widgets/renders/`
4. Register the extension in `PageBuilder.vue`
5. Add the block to `BlockPalette.vue`
6. Add settings config to `BlockSettings.vue`
7. Add the render component mapping in `BlockRenderer.vue`

---

## Database Operations

### Adding Columns (Drizzle Module)

1. Edit the schema file (`modules/{name}/models/schema.js`)
2. Add the new column definition
3. The column will be synced on next server restart (Drizzle auto-sync)

### Adding Columns (Prisma Core)

1. Add the column directly to the database via SQL:
   ```sql
   ALTER TABLE table_name ADD COLUMN new_column VARCHAR(255);
   ```
2. Run introspection to update the Prisma schema:
   ```bash
   cd backend && npx prisma db pull
   ```
3. Regenerate the client:
   ```bash
   npx prisma generate
   ```

### Domain Filtering

Use the `[field, operator, value]` tuple syntax in service queries:

```javascript
const results = await service.search({
  where: [
    ['status', '=', 'active'],
    ['created_at', '>=', '2024-01-01'],
    ['name', 'like', '%search%'],
  ],
  order: [['created_at', 'desc']],
  limit: 20,
  offset: 0,
});
```

---

## API Development

### Response Format

All API responses follow a consistent format:

```javascript
// Success
{ "success": true, "data": { ... }, "message": "Success" }

// Error
{ "success": false, "message": "Error description", "errors": [...] }

// Paginated list
{ "success": true, "data": [...], "total": 100, "page": 1, "limit": 20 }
```

### Auto-Generated CRUD

Use `createCrudRouter` for standard CRUD endpoints:

```javascript
import { createCrudRouter } from '../../core/router/crud-router.js';

const router = createCrudRouter(service, {
  moduleName: 'my_module',
  resourceName: 'item',
});

// Generates: GET /, GET /:id, POST /, PUT /:id, DELETE /:id,
//            GET /fields, POST /bulk, DELETE /bulk
```

### Adding Authorization

```javascript
import { authenticate, authorize } from '../../core/middleware/auth.js';

router.get('/', authenticate, authorize('my_module', 'item.read'), async (req, res) => {
  // Only users with 'my_module.item.read' permission can access
});
```

---

## Testing

### Running Tests

```bash
cd backend

# All tests
npm test

# Specific test file
NODE_OPTIONS='--experimental-vm-modules' npx jest tests/unit/module-loader.test.js

# With coverage
npm run test:coverage

# Watch mode
NODE_OPTIONS='--experimental-vm-modules' npx jest --watch
```

### Writing Tests

Tests use Jest with ESM. Place test files in `backend/tests/unit/`.

```javascript
import { jest } from '@jest/globals';

describe('MyService', () => {
  let service;

  beforeEach(() => {
    const mockAdapter = {
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 1 }),
    };
    service = new MyService(mockAdapter);
  });

  test('should return empty array when no items', async () => {
    const result = await service.search({});
    expect(result).toEqual([]);
  });
});
```

### Test Configuration

Jest config is in `backend/jest.config.cjs`:

```javascript
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.{js,mjs,cjs}'],
  transform: {},           // ESM — no transforms
  verbose: true,
  testTimeout: 30000,
};
```

ESM requires the `NODE_OPTIONS='--experimental-vm-modules'` flag.

---

## Coding Conventions

### Backend (ES Modules)

- All `.js` files are ES modules (`import`/`export`, never `require`)
- Manifest files use `export default {}`
- Service classes extend `BaseService`
- Adapters extend `BaseAdapter`
- Use `responseUtil.success()` / `responseUtil.error()` for API responses

### Frontend (Vue 3 + TypeScript)

- Use Composition API with `<script setup>`
- Icons from `lucide-vue-next` (not @ant-design/icons-vue)
- Ant Design Vue components are globally registered (`a-table`, `a-card`, etc.)
- Module views live in `backend/src/modules/{name}/static/views/`
- API clients import from `@/api/request` (get, post, put, del)
- Axios interceptor unwraps responses — don't re-check `result.success`

### File Naming

- Backend: `kebab-case.js` for files, `PascalCase` for classes
- Frontend: `kebab-case.vue` for views, `PascalCase.vue` for components
- Schemas: `schema.js` (Drizzle), `schema.prisma` (Prisma)

---

## Troubleshooting

### `EADDRINUSE: address already in use :::3000`

```bash
lsof -i :3000     # Find the process
kill -9 <PID>     # Kill it
```

### `require is not defined` / ESM Errors

The backend uses `"type": "module"`. Use `import`/`export`, not `require`.

### Jest Tests Failing with Import Errors

Ensure you run with ESM support:

```bash
NODE_OPTIONS='--experimental-vm-modules' npx jest
```

### Module Views Not Loading

1. Check `tailwind.config.js` includes module paths:
   ```js
   content: ['../../../backend/src/modules/**/static/**/*.{vue,js,ts,jsx,tsx}']
   ```
2. Verify the `@modules` alias in `vite.config.ts`
3. Ensure the view is registered in `customViews` in `router/index.ts`

### Prisma Client Out of Sync

```bash
cd backend
npx prisma db pull      # Re-introspect from DB
npx prisma generate     # Regenerate client
```

### Password Hashing Issues

Prisma middleware auto-hashes passwords on create/update. Never manually hash in seed scripts or API handlers — just pass the plain text password and the middleware handles it.
