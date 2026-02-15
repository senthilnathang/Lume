# Lume Framework — Architecture

This document describes the system architecture of the Lume Framework, covering the technology decisions, data flow, module system, hybrid ORM strategy, and planned enhancements.

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
9. [Request Lifecycle](#request-lifecycle)
10. [Database Schema](#database-schema)
11. [Planned Architecture (Redis, PostgreSQL, Nuxt.js)](#planned-architecture)

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENTS                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Browser  │  │ Mobile   │  │ API      │             │
│  │ (Vue 3)  │  │ App      │  │ Consumer │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       │              │              │                    │
└───────┼──────────────┼──────────────┼────────────────────┘
        │              │              │
        ▼              ▼              ▼
┌─────────────────────────────────────────────────────────┐
│                   LOAD BALANCER / PROXY                  │
│                  (Nginx / Vite Dev Proxy)                │
├─────────────────────┬───────────────────────────────────┤
│  Static Assets      │  API Requests (/api/*)            │
│  (Vue SPA)          │  WebSocket (/ws)                  │
└─────────────────────┴───────────────┬───────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────┐
│                   EXPRESS.JS SERVER                      │
│                   (Node.js 18+ ESM)                     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │              MIDDLEWARE PIPELINE                  │    │
│  │  Helmet → CORS → Rate Limit → Logger → Auth     │    │
│  │  → IP Access → Request Parser → Route Handler   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │              MODULE SYSTEM                       │    │
│  │  ┌─────┐ ┌──────┐ ┌──────┐ ┌────────┐          │    │
│  │  │Base │ │Auth  │ │RBAC  │ │Security│  ...      │    │
│  │  └──┬──┘ └──┬───┘ └──┬───┘ └───┬────┘          │    │
│  │     │       │        │         │                 │    │
│  │     ▼       ▼        ▼         ▼                 │    │
│  │  ┌─────────────────────────────────────┐         │    │
│  │  │  ORM ADAPTER LAYER                  │         │    │
│  │  │  BaseAdapter → PrismaAdapter        │         │    │
│  │  │              → DrizzleAdapter       │         │    │
│  │  └─────────┬──────────┬────────────────┘         │    │
│  └────────────┼──────────┼──────────────────────────┘    │
│               │          │                               │
│  ┌────────────▼──┐  ┌───▼────────────┐                  │
│  │  Prisma ORM   │  │  Drizzle ORM   │                  │
│  │  (Core Tables)│  │  (Module Tables)│                  │
│  └──────┬────────┘  └──────┬─────────┘                  │
│         │                  │                             │
│  ┌──────▼──────────────────▼─────────┐                  │
│  │           WebSocket Server        │                  │
│  │           (ws on /ws path)        │                  │
│  └───────────────────────────────────┘                  │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                        │
│                                                         │
│  ┌──────────────────┐    ┌───────────────────┐          │
│  │   MySQL 8.0+     │    │  PostgreSQL 14+   │          │
│  │   (Primary)      │    │  (Supported)      │          │
│  └──────────────────┘    └───────────────────┘          │
│                                                         │
│  ┌──────────────────┐    ┌───────────────────┐          │
│  │   Redis          │    │  File System      │          │
│  │   (Planned)      │    │  (./uploads)      │          │
│  └──────────────────┘    └───────────────────┘          │
└─────────────────────────────────────────────────────────┘
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
├── modules/                    # 21 pluggable modules (see Module System)
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

### Data Flow

```
Request → Route → Service.search({ where: domain, order, limit, offset })
                         │
                         ▼
                  Adapter._parseDomain(where)
                         │
                         ▼
              ┌──────────┴──────────┐
              │                     │
        PrismaAdapter         DrizzleAdapter
        prisma.model.         db.select()
        findMany({              .from(table)
          where: {...},         .where(and(...))
          orderBy: {...}        .orderBy(...)
        })                      .limit(...)
              │                     │
              └──────────┬──────────┘
                         ▼
                      Database
```

---

## Module System

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
│       ├── Create adapters
│       ├── Create services
│       ├── Mount API routes
│       └── Return { models, services }
│
├── models/
│   ├── schema.js            # Drizzle table definitions
│   └── index.js             # Export all schemas
│
├── services/
│   └── index.js             # Business logic classes
│
├── api/
│   └── index.js             # Express router factory
│
└── static/                  # Frontend code (served via Vite alias)
    ├── views/               # Vue SFC components
    ├── api/                 # TypeScript API clients
    └── components/          # Module-specific components
```

### Install/Uninstall

```
POST /api/modules/:name/install
  1. Validate module exists
  2. Check all dependencies are installed
  3. Call installHook() if defined
  4. Upsert installed_modules record (state: 'installed')
  5. Mark module as initialized

POST /api/modules/:name/uninstall
  1. Prevent uninstalling 'base' module
  2. Check no other installed modules depend on this one
  3. Call uninstallHook() if defined
  4. Update installed_modules record (state: 'uninstalled')
  5. Mark module as uninitialized
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
| Framework | Vue 3 (Composition API) | Reactive UI |
| Language | TypeScript | Type safety |
| Build | Vite | Fast HMR + bundling |
| UI Library | Ant Design Vue 4.x | Component library |
| Styling | Tailwind CSS 3.x | Utility-first CSS |
| Icons | lucide-vue-next | Icon library |
| Charts | ECharts (vue-echarts) | Data visualization |
| State | Pinia | Reactive stores |
| Routing | Vue Router 4 | SPA navigation |
| HTTP | Axios | API client |

### Route Resolution

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

### Core Tables (Prisma — 18 models)

| Model | Purpose |
|-------|---------|
| User | User accounts with role FK |
| Role | System roles (6 default) |
| Permission | Granular permissions (100+) |
| RolePermission | Role-permission mapping |
| Group | User groups |
| Menu | Sidebar menu items |
| Setting | Key-value configuration |
| InstalledModule | Module installation state |
| AuditLog | Change tracking with diffs |
| RecordRule | Row-level access rules |
| Sequence | Auto-increment sequences |
| activities | Event management |
| donations, donors, campaigns | Financial tracking |
| team_members | Team directory |
| documents | File storage |
| media_library | Media files |
| messages | Contact forms |

### Module Tables (Drizzle — 30+ tables)

Each module defines its own Drizzle schemas. Tables are synced at runtime.

| Module | Tables |
|--------|--------|
| base_security | api_keys, sessions, ip_access, two_factor, security_logs |
| base_automation | workflows, flows, business_rules, approval_chains, scheduled_actions, validation_rules, assignment_rules, rollup_fields |
| base_customization | custom_fields, custom_views, form_layouts, list_configs, dashboard_widgets |
| base_features_data | feature_flags, data_imports, data_exports, backups |
| advanced_features | webhooks, webhook_logs, notifications, notification_channels, tags, taggings, comments, attachments |
| rbac | rbac_roles, rbac_permissions, rbac_access_rules |

---

## Planned Architecture

### Redis Caching Layer

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Express    │────►│    Redis     │────►│   MySQL/PG   │
│   Server     │     │   Cache      │     │   Database   │
└──────────────┘     └──────────────┘     └──────────────┘

Cache strategy:
  - Permission lookups: TTL 300s (user permissions)
  - Role permissions: TTL 600s
  - Settings: TTL 3600s
  - Menu structure: TTL 3600s
  - Module registry: TTL until invalidation

Invalidation:
  - Role change → invalidate all users with that role
  - Permission change → invalidate role cache
  - Setting change → invalidate setting key
  - Pattern-based deletion for bulk operations
```

### PostgreSQL Support

Lume is designed for MySQL but supports PostgreSQL through:

- **Prisma**: Change `provider = "mysql"` to `"postgresql"` in `schema.prisma`
- **Drizzle**: Change `mysql2` driver to `pg` driver in `drizzle.js`
- **Adapter layer**: No changes needed — adapters abstract ORM differences
- **Migration tooling**: `prisma migrate` + `drizzle-kit push` for both databases

### Nuxt.js SSR Frontend (Planned)

```
Current:  Vue 3 SPA (Vite) → Client-side rendering
Planned:  Nuxt 3 option    → Server-side rendering + API routes

Benefits:
  - SEO for public-facing pages
  - Faster initial page load
  - Server-side API calls (no CORS)
  - File-based routing
  - Auto-imports

Architecture:
  /opt/Lume/frontend/apps/
  ├── web-lume/          # Current Vue SPA (admin panel)
  └── nuxt-lume/         # Planned Nuxt app (public site + SSR admin)
```

### Multi-Tenancy (Planned)

```
Strategy: Schema-per-tenant (shared database, tenant_id column)

  - Add tenant_id to all Prisma models
  - Add tenant_id to all Drizzle schemas
  - Extend BaseAdapter to auto-filter by tenant_id
  - JWT payload includes tenantId
  - Middleware sets tenant context per request
  - Admin panel supports tenant switching
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

Config via env:
  STORAGE_DRIVER=s3
  S3_BUCKET=lume-uploads
  S3_REGION=us-east-1
```

---

## Design Principles

1. **Convention over Configuration** — Modules follow standard structure; CRUD is auto-generated
2. **Separation of Concerns** — Layers communicate through defined interfaces (adapter pattern)
3. **Database Agnostic** — Hybrid ORM allows mixing Prisma and Drizzle per use case
4. **Module Isolation** — Each module owns its models, services, routes, and frontend code
5. **Security by Default** — Auth, CORS, rate limiting, Helmet enabled out of the box
6. **Progressive Enhancement** — Start with MySQL + local storage; add Redis, S3, PostgreSQL as needed
