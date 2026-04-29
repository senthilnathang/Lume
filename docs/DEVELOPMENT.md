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
| Node.js | 20.12+ | LTS recommended |
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
VITE_PUBLIC_SITE_URL=http://localhost:3001
```

---

## Running the Application

You need three servers running for full development:

| Server | Directory | Command | Port | Purpose |
|--------|-----------|---------|------|---------|
| Backend | `backend/` | `npm run dev` | 3000 | NestJS API |
| Admin Panel | `frontend/apps/web-lume/` | `npm run dev` | 5173 | Vue 3 SPA |
| Public Site | `frontend/apps/riagri-website/` | `npm run dev` | 3001 | Nuxt 3 SSR |

**Login credentials**: `admin@lume.dev` / `admin123`

The admin panel's Vite dev server proxies `/api` requests to `http://localhost:3000`.

---

## Creating a New Module (Metadata-Driven Approach)

### Using defineModule and defineEntity

The modern way to create modules in Lume v2.0+ is using declarative APIs. Here's a complete example:

### 1. Define Entities

**File: `backend/src/modules/contacts/entities/contact.entity.ts`**

```typescript
import { defineEntity } from '@core/entity/define-entity.js'

export const ContactEntity = defineEntity('Contact', {
  name: 'Contact',
  label: 'Contact',
  description: 'A contact person associated with a company',
  icon: 'users',
  fields: {
    firstName: {
      type: 'string',
      label: 'First Name',
      required: true,
      isIndexed: true,
    },
    lastName: {
      type: 'string',
      label: 'Last Name',
      required: true,
      isIndexed: true,
    },
    email: {
      type: 'email',
      label: 'Email',
      required: true,
      isIndexed: true,
      unique: true,
    },
    phone: {
      type: 'phone',
      label: 'Phone Number',
    },
    companyId: {
      type: 'lookup',
      label: 'Company',
      references: 'Company',
      required: true,
    },
    title: {
      type: 'string',
      label: 'Job Title',
    },
    status: {
      type: 'select',
      label: 'Status',
      options: ['active', 'inactive', 'archived'],
      defaultValue: 'active',
    },
    tags: {
      type: 'multiselect',
      label: 'Tags',
      options: ['key_decision_maker', 'technical', 'financial'],
    },
    notes: {
      type: 'text',
      label: 'Notes',
    },
    createdAt: {
      type: 'datetime',
      label: 'Created',
      readOnly: true,
    },
    updatedAt: {
      type: 'datetime',
      label: 'Updated',
      readOnly: true,
    },
  },
  computed: {
    fullName: {
      formula: '{{firstName}} {{lastName}}',
      type: 'string',
    },
  },
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['companyId', 'status'] },
  ],
  hooks: {
    beforeCreate: async (data, ctx) => {
      // Validate email format
      if (!data.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        throw new Error('Invalid email format')
      }
      return data
    },
    afterCreate: async (record, ctx) => {
      // Log contact creation
      console.log(`Contact created: ${record.fullName}`)
    },
    beforeUpdate: async (id, data, ctx) => {
      // Prevent email change after creation
      if (data.email) {
        const existing = await getContact(id)
        if (existing.email !== data.email) {
          throw new Error('Email cannot be changed')
        }
      }
      return data
    },
  },
  permissions: {
    read: [
      { roles: ['admin', 'sales_manager', 'sales'] },
    ],
    write: [
      { roles: ['admin', 'sales_manager'] },
      {
        roles: ['sales'],
        conditions: [{ field: 'companyId', operator: '==', value: '$userCompanyId' }],
      },
    ],
    delete: [{ roles: ['admin', 'sales_manager'] }],
  },
  aiMetadata: {
    description: 'A contact person at a company with name, email, phone, job title, and status',
    sensitiveFields: ['email', 'phone'],
    summarizeWith: 'Return contact name, company, title, and status',
  },
})
```

### 2. Define Workflows

**File: `backend/src/modules/contacts/workflows/notification.workflow.ts`**

```typescript
import { defineWorkflow } from '@core/workflow/define-workflow.js'

export const ContactNotificationWorkflow = defineWorkflow({
  name: 'contact_notification',
  version: '1.0.0',
  entity: 'Contact',
  trigger: { type: 'record.created' },
  steps: [
    {
      type: 'send_notification',
      to: 'admin',
      template: 'contact_created',
    },
    {
      type: 'set_field',
      field: 'status',
      value: 'active',
    },
  ],
  onError: 'continue',
  timeout: 30000,
})
```

### 3. Define Module

**File: `backend/src/modules/contacts/contacts.module.definition.ts`**

```typescript
import { defineModule } from '@core/module/define-module.js'
import { ContactEntity } from './entities/contact.entity.js'
import { ContactNotificationWorkflow } from './workflows/notification.workflow.js'

export const ContactsModule = defineModule({
  name: 'contacts',
  version: '1.0.0',
  description: 'Contact management module for CRM',
  depends: ['base'],
  
  entities: [ContactEntity],
  
  workflows: [ContactNotificationWorkflow],
  
  permissions: [
    'contacts.contacts.read',
    'contacts.contacts.write',
    'contacts.contacts.delete',
  ],
  
  hooks: {
    async onInstall(db) {
      // Run any migrations or setup
      console.log('Installing Contacts module')
    },
    async onLoad() {
      // Module is loaded and ready
      console.log('Contacts module loaded')
    },
    async onUninstall(db) {
      // Cleanup
      console.log('Uninstalling Contacts module')
    },
  },
  
  frontend: {
    views: [
      { path: 'contacts', component: 'ContactsListView' },
      { path: 'contacts/:id', component: 'ContactDetailView' },
    ],
  },
})
```

### 4. Register Module in Bootstrap

In your server's bootstrap code:

```typescript
import { ModuleLoaderService } from '@core/module/module-loader.service.js'
import { ContactsModule } from '@modules/contacts/contacts.module.definition.js'

// During app initialization:
const moduleLoader = app.get(ModuleLoaderService)
await moduleLoader.loadModule(ContactsModule)
```

### Legacy: Directory Structure (for non-metadata modules)

If migrating legacy code, the directory structure is:

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

### Available Widget Blocks (54)

| Category | Blocks |
|----------|--------|
| Text | Heading, Paragraph, Bullet List, Numbered List, Quote, Code Block, Blockquote, Code Highlight |
| Layout | Section, Columns, Spacer, Divider |
| Content | Advanced Heading, Dual Heading, Info Box, FAQ, Team Member, Testimonial, Posts Grid, Icon List, Callout, Accordion, TOC, Before/After |
| Media | Image, Video, Image Gallery, Audio, Lottie |
| Interactive | Button, Marketing Button, Countdown, Content Toggle, Modal Popup, Progress Bar, Carousel, Flip Box, Animated Headline, Hotspot, Off-Canvas, Tabs, Slides, Progress Tracker, Star Rating, Counter, Chart |
| Navigation | Nav Menu, Breadcrumbs, Search Form, Floating Buttons |
| Loop | Loop Grid, Loop Carousel, Global Widget |
| Utility | Table, HTML, Google Map, Contact Form, Business Hours, Dynamic Tag |
| Social | Social Share |

Each block consists of three files:
- **Extension** (`static/extensions/XyzBlock.ts`) — TipTap Node definition with attrs
- **NodeView** (`static/components/blocks/XyzBlockView.vue`) — editor canvas component
- **Render** (`static/widgets/renders/XyzRender.vue`) — public site render component

All blocks automatically receive 8 **common attributes** via `shared/commonAttributes.ts`:
`blockId`, `cssClass`, `customCss`, `entranceAnimation`, `animationDelay`, `animationDuration`, `responsiveOverrides`, `displayConditions`.

### Block Attribute Types (21)

Block settings are schema-driven via `static/widgets/registry.ts`:

| Type | UI Control |
|------|-----------|
| `text` | Text input |
| `textarea` | Multi-line textarea |
| `number` | Number spinner |
| `boolean` | Toggle switch |
| `select` | Dropdown select |
| `color` | Color picker |
| `image` | Image URL + picker |
| `url` | URL input |
| `slider` | Range slider |
| `repeater` | Dynamic list of sub-fields |
| `html` | Rich text textarea |
| `icon` | Icon picker popover |
| `link-builder` | URL + title + target + nofollow |
| `gradient` | Linear/radial gradient builder |
| `typography` | Font family + size + weight + style + line-height |
| `border` | Width + style + color + radius per-corner |
| `shadow` | Box-shadow x/y/blur/spread/color/inset |
| `font` | Google Fonts picker |
| `code-editor` | Monospace textarea with fullscreen toggle |
| `datetime` | Date and time picker |
| `media` | Media library picker |

Fields support conditional display via `dependsOn: { key, value }` to show/hide based on another field's value.

### Adding a New Block Type

1. Create the TipTap extension in `modules/editor/static/extensions/XyzBlock.ts`
2. Export it from `modules/editor/static/extensions/index.ts`
3. Create the NodeView in `modules/editor/static/components/blocks/XyzBlockView.vue`
4. Create the render component in `modules/editor/static/widgets/renders/XyzRender.vue`
5. Export the render from `modules/editor/static/widgets/renders/index.ts`
6. Add the block to `BlockPalette.vue` (category + icon entry)
7. Register the render in `BlockRenderer.vue` (`renderMap` object)
8. Add the widget definition to `registry.ts` (attrs schema + `WidgetDef`)

---

## Advanced CMS Features

The Website module provides a full-featured CMS built on top of the Page Builder.

### Content Scheduling

Pages support future publishing and auto-expiry via `publishAt` / `expireAt` timestamps:

```json
{ "publishAt": "2025-06-01T00:00:00Z", "expireAt": "2025-12-31T23:59:59Z" }
```

`PageService.checkAndApplyScheduling(page)` is called on every public page load. If `publishAt <= now` and status is `draft`, the page is auto-published. If `expireAt <= now` and status is `published`, the page reverts to `draft`.

### Taxonomy (Categories & Tags)

Pages can be assigned to hierarchical categories and flat tags:

- **Categories**: Tree structure via `parentId` + `sequence`. Admin view: `static/views/categories.vue`
- **Tags**: Flat list. Admin view: `static/views/tags.vue`
- **Pivot tables**: `website_page_categories`, `website_page_tags`
- **Public endpoints**: `GET /api/website/public/categories/:slug/pages`, `GET /api/website/public/tags/:slug/pages`
- **Archive pages**: `frontend/apps/riagri-website/pages/category/[slug].vue`, `tag/[slug].vue`

### Page Access Control

Pages support four visibility modes controlled by the `visibility` field:

| Visibility | Behaviour |
|------------|-----------|
| `public` | Anyone can view (default) |
| `private` | Admin-only, returns 403 for unauthenticated users |
| `password` | Requires password via `POST /api/website/public/pages/:slug/verify-password` |
| `members` | Requires valid JWT in Authorization header |

### Page Locking (Concurrent Edit Prevention)

When a user opens the page editor, the backend acquires a lock (`lockedBy`, `lockedAt`).
- Lock auto-releases after 30 minutes of inactivity
- Other editors see a read-only warning banner and poll every 30 seconds
- Routes: `POST /api/website/pages/:id/lock` and `POST /api/website/pages/:id/unlock`

### SEO Tools

- **XML Sitemap**: `GET /api/website/public/sitemap.xml` — auto-generated from all published pages
- **robots.txt**: `GET /api/website/public/robots.txt` — editable in Settings > SEO tab
- **Schema.org JSON-LD**: Auto-injected in Nuxt pages (WebPage, Article, FAQPage, Organization, BreadcrumbList)
- **SEO Analysis Panel**: Live client-side SEO score in the page editor sidebar (title length, keyword density, H1, image alts, etc.)

### Design Tokens & CSS Variables

Global design tokens (colors, typography, spacing) are stored in `website_settings` and served as CSS:

```
GET /api/website/public/styles.css
→ :root { --color-primary: #...; --font-heading: '...'; --lume-h1-size: 3rem; }
```

Admin UI: **Settings > Design Tokens** tab uses `DesignTokensEditor.vue`.

### Theme Builder Live Preview

The Theme Builder (`static/views/theme-builder.vue`) supports a live preview mode:
- Edit header/footer/sidebar templates in the left PageBuilder panel
- Right iframe shows the public site with `?preview_id=:id` to bypass saved content
- Backend: `GET /api/website/public/theme/:type?preview_id=:id`

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
