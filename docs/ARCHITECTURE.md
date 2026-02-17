# Lume Framework — Architecture

This document describes the system architecture of the Lume Framework, covering the technology decisions, data flow, module system, hybrid ORM strategy, visual page builder, and public website rendering.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Hybrid ORM (Prisma + Drizzle)](#hybrid-orm-prisma--drizzle)
5. [Module System](#module-system)
6. [Authentication & Authorization](#authentication--authorization)
7. [Real-Time Layer](#real-time-layer)
8. [Frontend Architecture](#frontend-architecture)
9. [Editor Module & Visual Page Builder](#editor-module--visual-page-builder)
10. [Website Module & CMS](#website-module--cms)
11. [Public Website (Nuxt 3)](#public-website-nuxt-3)
12. [Request Lifecycle](#request-lifecycle)
13. [Database Schema](#database-schema)
14. [Planned Architecture](#planned-architecture)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                 │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Browser  │  │ Public Site  │  │ Mobile   │  │ API      │   │
│  │ (Vue 3)  │  │ (Nuxt 3)    │  │ App      │  │ Consumer │   │
│  └────┬─────┘  └──────┬───────┘  └────┬─────┘  └────┬─────┘   │
└───────┼────────────────┼───────────────┼─────────────┼──────────┘
        │                │               │             │
        ▼                ▼               ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LOAD BALANCER / PROXY                          │
│  ┌─────────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Vite Dev Proxy  │  │ Nuxt Server  │  │ Nginx (Prod)      │  │
│  │ :5173 → :3000   │  │ :3007 → :3000│  │ Static + Reverse  │  │
│  └─────────────────┘  └──────────────┘  └───────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXPRESS.JS SERVER                            │
│                      (Node.js 18+ ESM)                          │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  MIDDLEWARE PIPELINE                        │  │
│  │  Helmet → CORS → Rate Limit → Logger → Auth               │  │
│  │  → IP Access → Request Parser → Route Handler             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    MODULE SYSTEM (23 modules)              │  │
│  │  ┌──────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌─────────┐  │  │
│  │  │ Base │ │Security│ │ Editor │ │Website │ │Donations│  │  │
│  │  └──┬───┘ └──┬─────┘ └──┬─────┘ └──┬─────┘ └──┬──────┘  │  │
│  │     │        │          │          │          │           │  │
│  │     ▼        ▼          ▼          ▼          ▼           │  │
│  │  ┌────────────────────────────────────────────────────┐   │  │
│  │  │  ORM ADAPTER LAYER                                 │   │  │
│  │  │  BaseAdapter → PrismaAdapter (11 core models)      │   │  │
│  │  │              → DrizzleAdapter (14 module schemas)   │   │  │
│  │  └──────────┬──────────────┬───────────────────────────┘   │  │
│  └─────────────┼──────────────┼───────────────────────────────┘  │
│                │              │                                   │
│  ┌─────────────▼──┐  ┌───────▼────────────┐                     │
│  │  Prisma ORM    │  │  Drizzle ORM       │                     │
│  │  (Core Tables) │  │  (Module Tables)   │                     │
│  └──────┬─────────┘  └──────┬─────────────┘                     │
│         │                   │                                    │
│  ┌──────▼───────────────────▼──────────┐                         │
│  │          WebSocket Server           │                         │
│  │          (ws on /ws path)           │                         │
│  └─────────────────────────────────────┘                         │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                             │
│                                                                  │
│  ┌──────────────────┐    ┌───────────────────┐                   │
│  │   MySQL 8.0+     │    │  PostgreSQL 14+   │                   │
│  │   (Primary)      │    │  (Supported)      │                   │
│  └──────────────────┘    └───────────────────┘                   │
│                                                                  │
│  ┌──────────────────┐    ┌───────────────────┐                   │
│  │   Redis          │    │  File System      │                   │
│  │   (Planned)      │    │  (./uploads)      │                   │
│  └──────────────────┘    └───────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Backend Architecture

### Directory Layout

```
backend/src/
├── index.js                    # Server entry point
├── core/                       # Framework core (never modified per-project)
│   ├── db/
│   │   ├── prisma.js           # Prisma client + audit middleware
│   │   ├── drizzle.js          # Drizzle client initialization
│   │   ├── drizzle-helpers.js  # Query builder helpers
│   │   └── adapters/
│   │       ├── base-adapter.js     # Abstract adapter interface
│   │       ├── prisma-adapter.js   # Prisma implementation
│   │       └── drizzle-adapter.js  # Drizzle implementation
│   ├── middleware/
│   │   ├── auth.js             # JWT verification + audit context
│   │   ├── errorHandler.js     # Global error handler
│   │   ├── ipAccess.js         # IP whitelist/blacklist
│   │   └── requestLogger.js    # HTTP request logging
│   ├── modules/
│   │   └── __loader__.js       # Dynamic module discovery and loading
│   ├── router/
│   │   └── crud-router.js      # Auto CRUD endpoint generator
│   ├── services/               # 12 core services
│   │   ├── base.service.js         # Generic CRUD service
│   │   ├── email.service.js        # SMTP email with templates
│   │   ├── notification.service.js # In-app + email notifications
│   │   ├── totp.service.js         # 2FA TOTP generation/verification
│   │   ├── webhook.service.js      # Webhook dispatch + retry
│   │   ├── scheduler.service.js    # Cron job management
│   │   ├── rule-engine.service.js  # Business rule evaluation
│   │   ├── password-policy.service.js # Password validation
│   │   ├── record-rule.service.js  # Record-level access rules
│   │   ├── sequence.service.js     # Auto-increment sequences
│   │   ├── security.service.js     # Security features aggregate
│   │   └── websocket.service.js    # WebSocket server
│   ├── api/
│   │   └── search.js           # Global search endpoint
│   └── templates/              # Email HTML templates
├── modules/                    # 23 pluggable modules (see Module System)
├── shared/
│   ├── utils/index.js          # Password, JWT, date, string, file, response utils
│   └── constants/index.js      # HTTP codes, roles, messages, config constants
└── scripts/                    # DB init, seed, admin creation scripts
```

### Layered Architecture

```
┌────────────────────────────────────────────────────┐
│                   API LAYER                         │
│  Express Routes (auto-generated CRUD + custom)     │
├────────────────────────────────────────────────────┤
│                 SERVICE LAYER                       │
│  BaseService (generic CRUD) + domain services      │
├────────────────────────────────────────────────────┤
│                ADAPTER LAYER                        │
│  BaseAdapter interface → PrismaAdapter / Drizzle   │
├────────────────────────────────────────────────────┤
│                  ORM LAYER                          │
│  Prisma Client (core)  |  Drizzle ORM (modules)   │
├────────────────────────────────────────────────────┤
│               DATABASE LAYER                        │
│  MySQL 8.0+ / PostgreSQL 14+                       │
└────────────────────────────────────────────────────┘
```

Each layer only communicates with the layer directly below it. Services never access the ORM directly — they use adapters. Routes never access adapters directly — they use services.

---

## Hybrid ORM (Prisma + Drizzle)

Lume uses two ORMs for different purposes. This is a deliberate architectural choice:

### Why Two ORMs?

| Concern | Prisma | Drizzle |
|---------|--------|---------|
| **Best for** | Core stable tables (User, Role, Permission, AuditLog) | Dynamic module tables that change per-installation |
| **Schema management** | `schema.prisma` file → `prisma db push` | JavaScript schema definitions → runtime sync |
| **Type safety** | Full generated types | Schema-inferred types |
| **Migration** | Prisma Migrate | Drizzle Kit or runtime `sync()` |
| **Query style** | Object-oriented (`prisma.user.findMany()`) | SQL-like (`db.select().from(users)`) |

### Core Models (Prisma — 11 models)

| Model | Purpose |
|-------|---------|
| User | User accounts with role FK |
| Role | System roles (6 default) |
| Permission | Granular permissions (147+) |
| RolePermission | Role-permission mapping |
| Group | User groups |
| Menu | Sidebar menu items |
| Setting | Key-value configuration |
| InstalledModule | Module installation state |
| AuditLog | Change tracking with diffs |
| RecordRule | Row-level access rules |
| Sequence | Auto-increment sequences |

### Module Schemas (Drizzle — 14 modules)

| Module | Tables |
|--------|--------|
| activities | activities |
| advanced_features | webhooks, webhook_logs, notifications, notification_channels, tags, taggings, comments, attachments |
| base_automation | workflows, flows, business_rules, approval_chains, scheduled_actions, validation_rules, assignment_rules, rollup_fields |
| base_customization | custom_fields, custom_views, form_layouts, list_configs, dashboard_widgets |
| base_features_data | feature_flags, data_imports, data_exports, backups |
| base_rbac | rbac_access_rules |
| base_security | api_keys, sessions, ip_access, two_factor, security_logs |
| documents | documents |
| donations | donations, donors, campaigns |
| editor | editor_templates, editor_snippets |
| media | media_library |
| messages | messages |
| team | team_members |
| website | website_pages, website_menu_items, website_menus, website_settings |

### Adapter Pattern

Both ORMs are accessed through a unified `BaseAdapter` interface:

```
BaseAdapter (abstract)
├── findAll(options)       # Query with where/order/limit/offset
├── findById(id)           # Single record by primary key
├── findOne(where)         # First matching record
├── create(data)           # Insert
├── update(id, data)       # Update by ID
├── destroy(id)            # Delete by ID
├── bulkCreate(records)    # Batch insert
├── bulkDestroy(ids)       # Batch delete
├── count(where)           # Count matching records
└── getFields()            # Schema introspection

PrismaAdapter extends BaseAdapter
└── Wraps @prisma/client model methods
    └── Auto-converts snake_case DB fields to camelCase via _toCamelCase()

DrizzleAdapter extends BaseAdapter
└── Wraps drizzle-orm query builder
```

### Domain Filtering

Both adapters support a domain filtering syntax inspired by Odoo:

```javascript
// [field, operator, value] tuples
const domain = [
  ['status', '=', 'active'],
  ['created_at', '>=', '2024-01-01'],
  ['name', 'like', '%search%'],
];

// Supported operators: =, !=, >, >=, <, <=, like, not like, in, not in
```

---

## Module System

### All Modules (23)

| Module | Category | ORM | Description |
|--------|----------|-----|-------------|
| base | Core | Prisma | Roles, permissions, users, groups, settings, audit logs |
| auth | Core | Prisma | JWT authentication, sessions, refresh tokens |
| user | Core | Prisma | User management API |
| settings | Core | Prisma | Application settings management |
| audit | Core | Prisma | Audit log viewer |
| common | Core | — | Shared utilities |
| base_security | Security | Drizzle | API keys, 2FA, IP access, sessions, security logs |
| base_automation | Automation | Drizzle | Workflows, business rules, approvals, scheduled actions |
| base_customization | Customization | Drizzle | Custom fields, views, form layouts, dashboards |
| base_features_data | Features | Drizzle | Feature flags, data import/export, backups |
| base_rbac | RBAC | Drizzle | Advanced access rules |
| rbac | RBAC | Prisma | Role-based access control |
| advanced_features | Advanced | Drizzle | Webhooks, notifications, tags, comments, attachments |
| activities | Data | Drizzle | Event and activity management |
| donations | Data | Drizzle | Donations, donors, campaigns |
| documents | Data | Drizzle | Document/file management |
| media | Data | Drizzle | Media library (images, videos) |
| messages | Data | Drizzle | Contact messages |
| team | Data | Drizzle | Team member directory |
| editor | Content | Drizzle | TipTap-based visual page builder (30+ widget blocks) |
| website | Content | Drizzle | CMS: pages, menus, media, SEO, settings |
| lume | System | — | Framework settings and configuration |
| gawdesy | System | — | Legacy/project-specific module |

### Module Lifecycle

```
Server Start
    │
    ▼
__loader__.js scans /modules/ directories
    │
    ▼
Load __manifest__.js from each module
    │
    ▼
Resolve dependency order (topological sort)
    │
    ▼
For each module (in order):
    ├── Check installed_modules DB table
    ├── If auto_install or previously installed:
    │   ├── Call __init__.js initialize(context)
    │   │   ├── Create ORM adapters (Prisma or Drizzle)
    │   │   ├── Instantiate services
    │   │   ├── Register Express routes on app
    │   │   └── Return { models, services }
    │   ├── Register menus from manifest
    │   ├── Register permissions from manifest
    │   └── Mark as initialized
    └── If not installed: skip
    │
    ▼
Sync module states to installed_modules table
    │
    ▼
Server ready
```

### Module Structure

```
modules/{name}/
├── __manifest__.js          # Module metadata
│   ├── name                 # Display name
│   ├── technicalName        # Unique identifier
│   ├── version              # Semantic version
│   ├── depends              # Array of required modules
│   ├── autoInstall          # Auto-install on server start
│   ├── frontend.menus       # Sidebar menu entries
│   └── permissions          # Permission definitions
│
├── __init__.js              # Initialization function
│   └── initialize(context)  # Receives { app, prisma, drizzle }
│
├── models/
│   └── schema.js            # Drizzle table definitions
│
├── services/
│   └── *.service.js         # Business logic classes
│
├── *.routes.js              # Express router factory
│
└── static/                  # Frontend code (served via Vite @modules alias)
    ├── views/               # Vue SFC components
    ├── api/                 # TypeScript API clients
    └── components/          # Module-specific components
```

---

## Authentication & Authorization

### Auth Flow

```
Login Request (email + password)
    │
    ▼
POST /api/users/login
    │
    ├── Validate credentials (bcryptjs compare)
    ├── Check 2FA enabled?
    │   ├── Yes → Return { requires2FA: true, tempToken }
    │   │         Client calls POST /api/base_security/2fa/verify
    │   └── No  → Continue
    ├── Create session record (IP, user agent, device)
    ├── Generate JWT (userId, roleId, sessionId)
    ├── Generate refresh token
    └── Return { token, refreshToken, user }
```

### Authorization Layers

```
Request with Bearer token
    │
    ▼
[1] authenticate() middleware
    ├── Verify JWT signature
    ├── Decode payload (userId, roleId)
    ├── Attach req.user
    └── Set audit context (userId, IP, userAgent)
    │
    ▼
[2] authorize(module, action) middleware
    ├── Bypass if role is 'admin' or 'super_admin'
    ├── Check permission: '{module}.{action}'
    └── 403 if not authorized
    │
    ▼
[3] Record Rules (optional, per-model)
    ├── Filter query results based on user role
    └── Applied in BaseService.search()
    │
    ▼
[4] IP Access (global)
    ├── Check IP against whitelist/blacklist
    └── 403 if blocked
```

### Role Hierarchy

```
super_admin    ← Full system access, bypasses all checks
  └── admin    ← Administrative access, bypasses authorize()
    └── manager    ← Management-level permissions
      └── staff    ← Staff-level permissions
        └── user   ← Regular user permissions
          └── guest ← Minimal read-only access
```

---

## Real-Time Layer

```
┌─────────────┐          ┌──────────────────────┐
│   Browser   │◄────────►│  WebSocket Server    │
│  (Vue app)  │   ws://  │  (ws library)        │
│             │  wss://  │                      │
│  useWebSocket()        │  Path: /ws           │
│  composable │          │  Auth: JWT in query   │
└─────────────┘          │                      │
                         │  Features:           │
                         │  - Per-user channels  │
                         │  - Broadcast          │
                         │  - Heartbeat (30s)    │
                         │  - Auto-reconnect     │
                         └──────────────────────┘

Message Types:
  { type: 'connected', userId }         # Connection established
  { type: 'notification', data }        # New notification
  { type: 'refresh', model, action }    # Data changed (CRUD event)
```

---

## Frontend Architecture

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Admin Panel** | Vue 3 (Composition API) | Reactive UI |
| **Public Site** | Nuxt 3 (SSR) | SEO-optimized public pages |
| Language | TypeScript | Type safety |
| Build | Vite | Fast HMR + bundling |
| UI Library | Ant Design Vue 4.x | Admin component library |
| Styling | Tailwind CSS 3.x | Utility-first CSS |
| Icons | lucide-vue-next | Icon library |
| Charts | ECharts (vue-echarts) | Data visualization |
| State | Pinia | Reactive stores |
| Routing | Vue Router 4 | SPA navigation |
| HTTP | Axios | API client |

### Two Frontend Applications

```
frontend/apps/
├── web-lume/              # Vue 3 SPA — Admin panel
│   ├── src/
│   │   ├── api/           # Shared API client (request.ts)
│   │   ├── router/        # Vue Router + dynamic route registration
│   │   ├── stores/        # Pinia stores (auth, app, user)
│   │   ├── layouts/       # Admin layout with sidebar
│   │   └── views/         # Core admin views (login, dashboard)
│   └── vite.config.ts     # @modules alias, TipTap aliases, Vite proxy
│
└── riagri-website/        # Nuxt 3 SSR — Public-facing website
    ├── pages/             # File-based routing (index, products, services, about, contact, [...slug])
    ├── layouts/           # Default layout with dropdown menus
    ├── composables/       # useWebsiteData, usePageContent, useSiteSettings
    └── components/        # PageRenderer, BlockRenderer integration
```

### Route Resolution (Admin Panel)

```
User clicks sidebar menu item (/settings/rbac/roles)
    │
    ▼
Vue Router matches dynamic route pattern
    │
    ▼
loadModuleView(moduleName, routeName, fullPath)
    │
    ├── [1] Check customViews map (exact path match)
    │       Found? → Return lazy import for component
    │
    ├── [2] Check customViews (module/routeName combo)
    │       Found? → Return lazy import
    │
    ├── [3] Try backend static views fetch
    │       GET /modules/{module}/static/views/{routeName}.vue
    │
    └── [4] Fall back to generic ModuleView.vue
```

All routes now have custom views — zero fallbacks to generic ModuleView.vue.

### Module Frontend Organization

Module views live in the backend directory alongside their module, not in the frontend `src/`:

```
Vite alias: @modules → /opt/Lume/backend/src/modules/

Import path: @modules/activities/static/views/index.vue
Resolves to: /opt/Lume/backend/src/modules/activities/static/views/index.vue
```

This ensures module code (models, services, API, views) stays together as a cohesive unit.

### API Client Pattern

```
Axios instance (src/api/request.ts)
    │
    ├── Request interceptor: Attach Bearer token
    │
    ├── Response interceptor: Unwrap { success, data } → return data
    │   (resolved promise = success, rejected = error)
    │
    └── Error interceptor: Handle 401 → redirect to login

Module API client (e.g., @modules/activities/static/api/index.ts):
    import { get, post, put, del } from '@/api/request'
    export const getActivities = (params) => get('/activities', { params })
```

---

## Editor Module & Visual Page Builder

The editor module provides a TipTap-based WYSIWYG editor and a visual page builder with 30+ widget block types.

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    PAGE BUILDER (Admin)                        │
│  ┌────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │ Widget     │  │ Canvas          │  │ Block Settings   │  │
│  │ Palette    │  │ (TipTap Editor) │  │ Panel            │  │
│  │            │  │                 │  │                  │  │
│  │ Text       │  │ ┌─────────────┐│  │ Content tab      │  │
│  │ Layout     │  │ │SectionBlock ││  │ Style tab        │  │
│  │ Content    │  │ │ ColumnsBlock││  │                  │  │
│  │ Media      │  │ │  InfoBox    ││  │ Per-block config │  │
│  │ Interactive│  │ │  Button     ││  │                  │  │
│  │ Commercial │  │ └─────────────┘│  │                  │  │
│  │ Utility    │  │                 │  │                  │  │
│  │ Social     │  │ Visual / Text   │  │                  │  │
│  └────────────┘  └─────────────────┘  └──────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Widget Block Types (30+)

| Category | Blocks |
|----------|--------|
| **Text** | Heading, Paragraph, Bullet List, Numbered List, Quote, Code Block |
| **Layout** | Section, Columns, Spacer, Divider |
| **Content** | Advanced Heading, Dual Heading, Info Box, FAQ, Team Member, Testimonial, Posts Grid, Icon List, Callout |
| **Media** | Image, Video, Image Gallery |
| **Interactive** | Button, Marketing Button, Countdown, Content Toggle, Modal Popup, Progress Bar |
| **Commercial** | Price Table, Price List |
| **Utility** | Table, HTML, Google Map, Contact Form, Business Hours |
| **Social** | Social Share |

### Content Format (TipTap JSON)

All page content is stored as TipTap JSON — a tree of nodes that maps to blocks:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "sectionBlock",
      "attrs": { "backgroundColor": "#f8f9fa", "padding": "60px 0" },
      "content": [
        {
          "type": "dualHeading",
          "attrs": { "mainText": "Page Title", "level": 1 }
        },
        {
          "type": "paragraph",
          "content": [{ "type": "text", "text": "Description text" }]
        }
      ]
    }
  ]
}
```

### File Structure

```
modules/editor/
├── models/schema.js          # editor_templates, editor_snippets tables
├── services/editor.service.js
├── api/index.js              # /api/editor/templates, /api/editor/snippets
└── static/
    ├── components/           # PageBuilder, BlockPalette, BlockSettings, EditorToolbar,
    │                         # RichEditor, CompactEditor, SlashCommandList
    ├── components/blocks/    # 29 NodeView components (*BlockView.vue)
    ├── extensions/           # TipTap extensions for each block type
    ├── widgets/
    │   ├── BlockRenderer.vue         # Recursive renderer for public site
    │   ├── EditableBlockRenderer.vue # Editable renderer for admin
    │   ├── SettingsRenderer.vue      # Block settings panel
    │   ├── WidgetPickerModal.vue     # Widget insertion modal
    │   └── renders/                  # 29 render components (*Render.vue)
    └── views/templates.vue           # Template management view
```

### Rendering Pipeline

```
TipTap JSON (stored in DB)
    │
    ├─── Admin Editor ───► PageBuilder + EditableBlockRenderer
    │                       (drag-and-drop, inline editing, block settings)
    │
    └─── Public Site  ───► PageRenderer → BlockRenderer
                            (recursive render function, lazy-loaded components)
```

---

## Website Module & CMS

The website module provides a full CMS for managing public website pages, navigation menus, media, and site settings.

### Features

- **Page Management** — Create, edit, publish pages with the visual page builder
- **Hierarchical Menus** — Drag-and-drop tree menu management with nesting (WordPress/Drupal-style)
- **Media Library** — Image and file upload management
- **SEO** — Meta titles, descriptions, Open Graph, canonical URLs, noindex/nofollow
- **Site Settings** — Site name, logo, contact info, social links, footer content
- **Live Preview** — Iframe preview of pages during editing

### Menu Management Architecture

```
Admin UI (menus.vue)
    │
    ├── Left Panel: Menu list (create/select menus)
    │
    └── Right Panel: Draggable tree (vuedraggable)
        ├── MenuTreeNode.vue (recursive component)
        │   ├── Drag handle + label + type badge
        │   ├── Nested <draggable> for children
        │   └── Edit/delete buttons
        │
        ├── Add Item modal
        │   ├── Link type: Custom URL | Page (with page picker)
        │   ├── Label, URL, target, icon, CSS class, description
        │   └── Parent set by tree position
        │
        └── Save Order → flattenTree() → PUT /menus/:id/reorder
            → bulk update { id, parentId, sequence } for all items
```

### Database Tables

| Table | Purpose |
|-------|---------|
| `website_pages` | Page content (TipTap JSON), SEO metadata, publish state |
| `website_menus` | Menu containers (name, location: header/footer/sidebar) |
| `website_menu_items` | Menu items with parentId for hierarchy, sequence for order |
| `website_settings` | Site-wide settings (JSON key-value) |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/website/pages` | List all pages |
| GET | `/api/website/pages/:id` | Get page by ID |
| POST | `/api/website/pages` | Create page |
| PUT | `/api/website/pages/:id` | Update page |
| DELETE | `/api/website/pages/:id` | Delete page |
| GET | `/api/website/menus` | List menus |
| GET | `/api/website/menus/:id` | Get menu with nested items |
| POST | `/api/website/menus` | Create menu |
| PUT | `/api/website/menus/:id/reorder` | Bulk reorder menu items |
| GET | `/api/website/public/menus/:location` | Public: nested menu by location |
| GET | `/api/website/public/pages/:slug` | Public: page by slug |
| GET | `/api/website/public/settings` | Public: site settings |

---

## Public Website (Nuxt 3)

The public-facing website is a Nuxt 3 SSR application (`frontend/apps/riagri-website/`) that consumes the website module's public API.

### Page Routing

```
URL Request
    │
    ├── /                → pages/index.vue (Home)
    ├── /products        → pages/products.vue
    ├── /services        → pages/services.vue
    ├── /about           → pages/about.vue
    ├── /contact         → pages/contact.vue
    └── /anything-else   → pages/[...slug].vue (dynamic CMS pages)
```

### Content Rendering

All pages use TipTap JSON content rendered through the BlockRenderer:

```
Page Template (e.g., index.vue)
    │
    ▼
Fetch page from API: GET /api/website/public/pages/{slug}
    │
    ▼
Parse content JSON → detect TipTap format (type: "doc")
    │
    ▼
PageRenderer component
    │
    ▼
BlockRenderer (recursive)
    ├── sectionBlock → SectionRender.vue
    ├── columnsBlock → ColumnsRender.vue
    ├── infoBox      → InfoBoxRender.vue
    ├── testimonial  → TestimonialRender.vue
    ├── contactForm  → ContactFormRender.vue
    └── ... (30+ block types)
```

### Navigation

- **Desktop**: Dropdown menus on hover for items with children (nested menu support)
- **Mobile**: Accordion-style expand/collapse for sub-items
- Menu data fetched from `GET /api/website/public/menus/header`
- Supports nested `children` arrays for multi-level navigation

### Composables

| Composable | Purpose |
|------------|---------|
| `useWebsiteData()` | Fetch header/footer menus, site settings, contact info |
| `usePageContent(slug)` | Fetch page content by slug, returns page + SEO data |
| `useSiteSettings()` | Site-wide configuration (name, logo, social links) |

---

## Request Lifecycle

Complete flow for an authenticated API request:

```
1. HTTP Request arrives at Express
   │
2. Helmet (security headers)
   │
3. CORS check
   │
4. Rate limiter (100 req/15min general, 10 req/15min auth)
   │
5. Body parser (JSON, 10mb limit)
   │
6. Request logger (method, path, IP, user agent)
   │
7. IP Access middleware (whitelist/blacklist check)
   │
8. Auth middleware
   │  ├── Extract Bearer token from Authorization header
   │  ├── Verify JWT signature and expiry
   │  ├── Load user from database
   │  ├── Attach req.user = { id, email, role, ... }
   │  └── Set audit context for Prisma middleware
   │
9. Route handler (module API endpoint)
   │  ├── authorize(module, action) — permission check
   │  ├── Input validation (express-validator)
   │  ├── Service method call
   │  │   ├── Adapter method (findAll, create, update, etc.)
   │  │   ├── Prisma/Drizzle query execution
   │  │   └── Prisma audit middleware logs changes
   │  └── Response formatting (responseUtil.success/error)
   │
10. Error handler middleware (catches uncaught errors)
    ├── Prisma P2002 → 409 Conflict (unique constraint)
    ├── Prisma P2025 → 404 Not Found
    ├── JWT errors → 401 Unauthorized
    └── Generic → 500 Internal Server Error
```

---

## Database Schema

### Schema Summary

| Category | ORM | Table Count | Key Tables |
|----------|-----|-------------|------------|
| Core | Prisma | 11 | users, roles, permissions, role_permissions, groups, menus, settings, installed_modules, audit_logs, record_rules, sequences |
| Security | Drizzle | 5 | api_keys, sessions, ip_access, two_factor, security_logs |
| Automation | Drizzle | 8 | workflows, flows, business_rules, approval_chains, scheduled_actions, validation_rules, assignment_rules, rollup_fields |
| Customization | Drizzle | 5 | custom_fields, custom_views, form_layouts, list_configs, dashboard_widgets |
| Features | Drizzle | 4 | feature_flags, data_imports, data_exports, backups |
| RBAC | Drizzle | 1 | rbac_access_rules |
| Advanced | Drizzle | 8 | webhooks, webhook_logs, notifications, notification_channels, tags, taggings, comments, attachments |
| Data Modules | Drizzle | 6 | activities, donations, donors, campaigns, team_members, documents, media_library, messages |
| Editor | Drizzle | 2 | editor_templates, editor_snippets |
| Website | Drizzle | 4 | website_pages, website_menus, website_menu_items, website_settings |
| **Total** | | **~54** | |

---

## Planned Architecture

### Redis Caching Layer

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Express    │────►│    Redis     │────►│   MySQL/PG   │
│   Server     │     │   Cache      │     │   Database   │
└──────────────┘     └──────────────┘     └──────────────┘

Cache strategy:
  - Permission lookups: TTL 300s
  - Role permissions: TTL 600s
  - Settings: TTL 3600s
  - Menu structure: TTL 3600s
  - Module registry: TTL until invalidation
```

### Multi-Tenancy (Planned)

```
Strategy: Schema-per-tenant (shared database, tenant_id column)

  - Add tenant_id to all Prisma models
  - Add tenant_id to all Drizzle schemas
  - Extend BaseAdapter to auto-filter by tenant_id
  - JWT payload includes tenantId
  - Middleware sets tenant context per request
```

### Cloud Storage (Planned)

```
Current:  Local filesystem (./uploads)
Planned:  Storage adapter pattern

StorageAdapter (abstract)
├── LocalStorage    # Current: fs-based
├── S3Storage       # AWS S3 / MinIO
├── GCSStorage      # Google Cloud Storage
└── AzureStorage    # Azure Blob Storage
```

---

## Design Principles

1. **Convention over Configuration** — Modules follow standard structure; CRUD is auto-generated
2. **Separation of Concerns** — Layers communicate through defined interfaces (adapter pattern)
3. **Database Agnostic** — Hybrid ORM allows mixing Prisma and Drizzle per use case
4. **Module Isolation** — Each module owns its models, services, routes, and frontend code
5. **Security by Default** — Auth, CORS, rate limiting, Helmet enabled out of the box
6. **Progressive Enhancement** — Start with MySQL + local storage; add Redis, S3, PostgreSQL as needed
7. **Visual Content Editing** — TipTap-based page builder with 30+ reusable widget blocks
8. **SSR Public Site** — Nuxt 3 for SEO-optimized public pages, separate from admin SPA
