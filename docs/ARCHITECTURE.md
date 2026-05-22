# Lume Framework v2.0 — Architecture

This document describes the system architecture of Lume Framework v2.0, a comprehensive modernization covering monorepo structure, build tooling, dependency upgrades, testing infrastructure, security hardening, and observability enhancements.

**Latest Version:** 2.0.0 (Release Date: 2026-04-28)  
**Patch Update:** 2.0.1 - Security hardening & bug fixes (2026-04-28)  
**Previous Version:** 1.0.0 → 2.0.0 (Migration Guide: [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md))

### Key Improvements in v2.0

- **Monorepo Architecture:** pnpm workspace + Turbo build orchestration
- **Tailwind 4 Migration:** CSS variables for theming, reduced config duplication
- **Modern Tooling:** Jest 30 backend, Vitest 4.1 frontend, Playwright 1.49 E2E
- **Security Hardened:** Helmet 7.1, Express Rate Limit 7.1, response caching, OWASP Top 10 scanning
- **Security Audit Module:** Comprehensive vulnerability scanning, OWASP compliance checking, API security assessment
- **Observability:** Request tracing, metrics collection, structured logging
- **Performance:** Response caching with Redis, query optimization, benchmarking
- **Testing:** Unit tests (577+), integration tests, performance benchmarks (97.3% pass rate)
- **Node.js 20.12.0+:** Modern JavaScript features, better performance
- **Documentation:** PERFORMANCE.md, OBSERVABILITY.md, updated TESTING.md, SECURITY_HARDENING_GUIDE.md

---

This document describes the system architecture of the Lume Framework, covering the technology decisions, data flow, module system, hybrid ORM strategy, visual page builder, and public website rendering.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Metadata-Driven Runtime Kernel](#metadata-driven-runtime-kernel)
4. [Backend Architecture](#backend-architecture)
5. [Hybrid ORM (Prisma + Drizzle)](#hybrid-orm-prisma--drizzle)
6. [Module System](#module-system)
7. [Authentication & Authorization](#authentication--authorization)
8. [Real-Time Layer](#real-time-layer)
9. [GraphQL API Layer](#graphql-api-layer)
10. [Frontend Architecture](#frontend-architecture)
11. [Editor Module & Visual Page Builder](#editor-module--visual-page-builder)
12. [Website Module & CMS](#website-module--cms)
13. [Public Website (Nuxt 3)](#public-website-nuxt-3)
14. [Request Lifecycle](#request-lifecycle)
15. [Database Schema](#database-schema)
16. [Planned Architecture](#planned-architecture)

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
│                      NESTJS SERVER                               │
│                      (Node.js 20.12+ TypeScript)               │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  MIDDLEWARE PIPELINE                        │  │
│  │  Helmet → CORS → Rate Limit → Logger → Auth               │  │
│  │  → IP Access → Request Parser → Route Handler             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    MODULE SYSTEM (24 modules)              │  │
│  │  ┌──────┐ ┌────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │  │
│  │  │ Base │ │Security│ │Sec Audit │ │ Editor   │ │Website │ │  │
│  │  └──┬───┘ └──┬─────┘ └────┬─────┘ └────┬─────┘ └──┬─────┘ │  │
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
│  │  MariaDB 10.11+  │    │  MySQL 8.0+ /     │                   │
│  │  (Primary, OSS)  │    │  PostgreSQL 14+   │                   │
│  └──────────────────┘    └───────────────────┘                   │
│                                                                  │
│  ┌──────────────────┐    ┌───────────────────┐                   │
│  │   Redis          │    │  File System      │                   │
│  │   (Planned)      │    │  (./uploads)      │                   │
│  └──────────────────┘    └───────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Metadata-Driven Runtime Kernel

The Lume v2.0 runtime is built on a metadata-driven kernel that allows every entity, workflow, view, and policy to be defined declaratively at runtime. This enables powerful extensibility without code changes.

### Kernel Architecture (5 Layers)

```
┌────────────────────────────────────────────────────┐
│ Layer 4: AI + Plugins                              │
│ AIAdapterService · PluginRegistry · Sandbox        │
├────────────────────────────────────────────────────┤
│ Layer 3: Data + UI                                 │
│ DataGridEngine · ViewEngine · QueryBuilder         │
├────────────────────────────────────────────────────┤
│ Layer 2: Platform Capabilities                     │
│ ModuleEngine · WorkflowEngine · PermissionEngine   │
├────────────────────────────────────────────────────┤
│ Layer 1: Foundation                                │
│ EntityEngine · VersioningSystem                    │
├────────────────────────────────────────────────────┤
│ Layer 0: Runtime Kernel (ALL layers register here) │
│ MetadataRegistry · ExecutionPipeline · EventBus    │
└────────────────────────────────────────────────────┘
```

### Declarative APIs

Lume provides five core declarative APIs for defining framework entities:

```typescript
// Define an entity with fields, computed properties, and hooks
export const LeadEntity = defineEntity('Lead', {
  name: 'Lead',
  label: 'Sales Lead',
  fields: {
    firstName: { type: 'string', label: 'First Name', required: true },
    lastName: { type: 'string', label: 'Last Name' },
    email: { type: 'email', label: 'Email', isIndexed: true },
    status: { type: 'select', options: ['new', 'contacted', 'qualified', 'closed'] },
  },
  computed: {
    fullName: { formula: '{{firstName}} {{lastName}}' },
    leadScore: { 
      formula: 'IF(status=="qualified", 100, IF(status=="contacted", 50, 0))',
      type: 'number'
    },
  },
  hooks: {
    beforeCreate: async (data, ctx) => {
      data.status = 'new';
      return data;
    },
    afterCreate: async (record, ctx) => {
      await emit('lead.created', { lead: record });
    },
  },
  permissions: {
    read: [{ roles: ['admin', 'sales'] }],
    write: [{ roles: ['admin', 'sales'], conditions: ['owner == $userId'] }],
  },
});

// Define a module with entities, workflows, and views
export const CRMModule = defineModule({
  name: 'crm',
  version: '1.0.0',
  depends: ['base'],
  entities: [LeadEntity, ContactEntity, OpportunityEntity],
  workflows: [LeadScoringWorkflow, AutoAssignmentWorkflow],
  permissions: ['crm.leads.read', 'crm.leads.write', 'crm.contacts.read'],
  hooks: {
    onInstall: async (db) => { /* migrations */ },
  },
});

// Define a workflow with conditional logic and multiple step types
export const LeadScoringWorkflow = defineWorkflow({
  name: 'lead_scoring',
  entity: 'Lead',
  trigger: { type: 'record.updated', field: 'status' },
  steps: [
    {
      type: 'condition',
      if: { field: 'status', operator: '==', value: 'qualified' },
      then: [
        { type: 'set_field', field: 'leadScore', value: 100 },
        { type: 'ai', prompt: 'Suggest next action for qualified lead', outputField: 'nextAction' },
        { type: 'send_notification', to: 'assigned_user', template: 'lead_qualified' },
      ],
    },
  ],
});

// Define an ABAC policy
export const LeadOwnerPolicy = definePolicy({
  name: 'lead_owner_access',
  entity: 'Lead',
  actions: ['read', 'update', 'delete'],
  conditions: [{ field: 'owner', operator: '==', value: '$userId' }],
  roles: ['sales'], // policy applies to sales role
});

// Define a view
export const LeadKanbanView = defineView({
  name: 'leads_kanban',
  entity: 'Lead',
  type: 'kanban',
  label: 'Leads Board',
  config: {
    groupByField: 'status',
    cardTitle: '{{firstName}} {{lastName}}',
    cardDescription: '{{email}}',
  },
});
```

### MetadataRegistry

The MetadataRegistry is a central store for all definitions:

```typescript
interface MetadataRegistry {
  // Entity management
  registerEntity(def: EntityDefinition): void
  extend(entityName: string, ext: Partial<EntityDefinition>): void
  getEntity(name: string): EntityDefinition | undefined
  listEntities(): EntityDefinition[]
  resolveEntity(name: string): ResolvedEntityDefinition // merges base + extensions

  // Module management
  registerModule(def: ModuleDefinition): void
  getModule(name: string): ModuleDefinition | undefined
  listModules(): ModuleDefinition[]

  // Workflow management
  registerWorkflow(def: WorkflowDefinition): void
  getWorkflow(name: string): WorkflowDefinition | undefined
  listWorkflows(entityName?: string): WorkflowDefinition[]

  // Permission management
  registerPolicy(def: PolicyDefinition): void
  getPolicy(name: string): PolicyDefinition | undefined
  listPolicies(entityName?: string): PolicyDefinition[]

  // View management
  registerView(def: ViewDefinition): void
  getView(name: string): ViewDefinition | undefined
  listViewsForEntity(entityName: string): ViewDefinition[]
}
```

### ExecutionPipeline

The ExecutionPipeline is a middleware chain for entity operations:

```typescript
type PipelineMiddleware = (ctx: ExecutionContext, next: () => Promise<any>) => Promise<any>

interface ExecutionContext {
  operation: 'create' | 'read' | 'update' | 'delete'
  entity: string
  data?: any
  user: User
  timestamp: Date
}

class ExecutionPipelineService {
  use(middleware: PipelineMiddleware): void  // Register a middleware
  execute(ctx: ExecutionContext): Promise<any> // Execute through all middleware
}
```

### EventBus

All framework events flow through a typed event bus:

```typescript
type LumeEvent<T> = {
  type: string
  data: T
  timestamp: Date
  userId: number
}

class EventBusService {
  emit<T>(event: LumeEvent<T>): void
  on<T>(eventType: string, handler: (e: LumeEvent<T>) => Promise<void>): void
  once<T>(eventType: string, handler: (e: LumeEvent<T>) => Promise<void>): void
  off(eventType: string, handler: Function): void
}
```

**Built-in Events:**
- `entity.created` — After record creation
- `entity.updated` — After record update
- `entity.deleted` — After record deletion
- `workflow.started` — Workflow execution started
- `workflow.completed` — Workflow execution completed
- `workflow.failed` — Workflow execution failed
- `policy.evaluated` — Permission check completed

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
│  NestJS Controllers (auto-generated CRUD + custom) │
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
│  MariaDB 10.11+ (default) — MySQL / PostgreSQL too │
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

### Module Schemas (Drizzle — 18 modules, 96 tables)

Each module declares its Drizzle tables in `backend/src/modules/<name>/models/schema.js`.
The `node src/scripts/setupDrizzle.js` script reads every schema file and
creates the corresponding tables via idempotent `CREATE TABLE IF NOT EXISTS`.
This step is **required** after `prisma db push` — Prisma only knows
about its own 11 core tables, so without `setupDrizzle.js` the module
tables don't exist and the app crashes at runtime with `ER_NO_SUCH_TABLE`.

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
| website | website_pages, website_menus, website_menu_items, website_media, website_page_revisions, website_forms, website_form_submissions, website_theme_templates, website_popups, website_settings, website_custom_fonts, website_custom_icons, website_redirects, website_categories, website_tags, website_page_categories, website_page_tags |

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
    │   │   ├── Register NestJS controllers/routes
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
├── *.controller.ts          # NestJS controller (routes & handlers)
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
apps/
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

The editor module provides a TipTap-based WYSIWYG editor and a visual page builder with **54 widget block types** across 9 categories.

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

### Widget Block Types (54)

| Category | Blocks |
|----------|--------|
| **Text** | Heading, Paragraph, Bullet List, Numbered List, Quote, Code Block, Blockquote |
| **Layout** | Section, Columns, Spacer, Divider |
| **Content** | Advanced Heading, Dual Heading, Info Box, FAQ, Team Member, Testimonial, Posts Grid, Icon List, Callout, Counter, Star Rating, Tabs, Accordion |
| **Media** | Image, Video, Image Gallery, Audio, Lottie, Before/After |
| **Interactive** | Button, Marketing Button, Countdown, Content Toggle, Modal Popup, Progress Bar, Slides, Progress Tracker, Floating Buttons, Flip Box, Hotspot, Carousel, Off-Canvas, TOC, Animated Headline |
| **Commercial** | Price Table, Price List |
| **Utility** | Table, HTML, Google Map, Contact Form, Business Hours, Code Highlight, Breadcrumbs, Nav Menu, Search Form |
| **Social** | Social Share |
| **Dynamic** | Dynamic Tag (inline), Loop Grid, Loop Carousel, Global Widget, Chart |

### Block Attribute System

Every block shares 8 **common attributes** (via `shared/commonAttributes.ts`): `blockId`, `cssClass`, `customCss`, `entranceAnimation`, `animationDelay`, `animationDuration`, `responsiveOverrides` (Desktop/Tablet/Mobile overrides), and `displayConditions` (rule-based visibility).

Block-specific settings use **21 attribute types** in `registry.ts`: text, textarea, number, slider, color, select, checkbox, switch, repeater, media, icon, gradient, typography, border, shadow, link-builder, font, code-editor, and more.

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
├── models/schema.js              # editor_templates, editor_snippets, editor_presets tables
├── services/editor.service.js
├── api/index.js                  # /api/editor/templates, /api/editor/snippets, /api/editor/presets
└── static/
    ├── composables/              # useEditorHistory.ts, useEditorShortcuts.ts
    ├── components/               # PageBuilder, BlockPalette, BlockSettings, EditorToolbar,
    │                             # RichEditor, CompactEditor, SlashCommandList, NavigatorPanel,
    │                             # LayoutPicker, PresetPicker, BlockContextMenu, ShortcutsHelpModal,
    │                             # IconPicker, DisplayConditionBuilder, QueryBuilder,
    │                             # AiGeneratorModal, NoteIndicator, NotesPanel
    ├── components/blocks/        # 54 NodeView components (*BlockView.vue)
    ├── extensions/               # 54 TipTap extensions + shared/commonAttributes.ts
    ├── widgets/
    │   ├── BlockRenderer.vue     # Recursive renderer for public site (54 blocks, lazy-loaded)
    │   ├── SettingsRenderer.vue  # Block settings panel (21 attr types + conditional display)
    │   ├── registry.ts           # Widget registry (WidgetDef per block, categories, defaults)
    │   ├── widget-styles.css     # Block presentation styles
    │   ├── motion-fx.css         # Motion FX animations (parallax, rotate, sticky)
    │   ├── animation-styles.css  # CSS keyframe animations (7 entrance types)
    │   └── renders/              # 54 render components (*Render.vue)
    └── views/
        ├── templates.vue         # Template management
        └── widget-manager.vue    # Enable/disable widgets per installation
```

### Rendering Pipeline

```
TipTap JSON (stored in DB)
    │
    ├─── Admin Editor ───► PageBuilder + EditableBlockRenderer
    │                       (drag-and-drop, inline editing, block settings)
    │
    └─── Public Site  ───► PageRenderer → BlockRenderer (54 blocks, lazy-loaded)
                            + motion-fx.css (parallax, rotate, sticky effects)
                            + animation-styles.css (entrance animations)
                            + useMotionFx() / useInteractions() / useSticky()
```

---

## Website Module & CMS

The website module provides a full CMS for managing public website pages, navigation menus, media, and site settings.

### Features

- **Page Management** — Create, edit, publish pages with the visual page builder
- **Content Scheduling** — Set `publishAt` / `expireAt` timestamps; pages auto-publish/expire
- **Page Access Control** — Visibility: public, private, password-protected, members-only
- **Page Locking** — Concurrent-edit prevention with 30-min auto-release and live poll
- **Hierarchical Menus** — Drag-and-drop tree menu management with nesting (WordPress/Drupal-style)
- **Media Library** — Image and file upload management
- **SEO** — Meta titles, descriptions, Open Graph, XML sitemap, robots.txt, Schema.org JSON-LD
- **SEO Analysis** — Live per-page score (title length, keyword density, H1 count, content length, image alt)
- **Design Tokens** — CSS variable system for colors, typography, spacing; `/api/website/public/styles.css`
- **Theme Builder** — Visual header/footer/sidebar templates with PageBuilder + live preview iframe
- **Taxonomy** — Hierarchical categories + flat tags with archive pages
- **Redirects** — URL redirect management (301/302)
- **Popup Builder** — 5 trigger types (time, scroll, exit intent, click, page load)
- **Form Builder** — Custom forms with submission management
- **Revision History** — Page version history with one-click revert
- **Site Settings** — Site name, logo, contact info, social links, design tokens, analytics ID, robots.txt

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

### Database Tables (14)

| Table | Purpose |
|-------|---------|
| `website_pages` | Page content (TipTap JSON), SEO metadata, publish state, scheduling, visibility, locking |
| `website_menus` | Menu containers (name, location: header/footer/sidebar) |
| `website_menu_items` | Menu items with parentId for hierarchy, sequence for order |
| `website_media` | Uploaded images and files with metadata |
| `website_page_revisions` | Version history snapshots per page |
| `website_forms` | Custom form definitions (field config JSON) |
| `website_form_submissions` | Form submission data |
| `website_theme_templates` | Header/footer/sidebar templates (TipTap JSON) |
| `website_popups` | Popup definitions with trigger type + content |
| `website_settings` | Site-wide settings (key-value JSON) |
| `website_categories` | Hierarchical page categories (parentId + sequence) |
| `website_tags` | Flat tag taxonomy |
| `website_page_categories` | Page ↔ category pivot |
| `website_page_tags` | Page ↔ tag pivot |

### Key `website_pages` Columns

| Column | Type | Purpose |
|--------|------|---------|
| `title`, `slug`, `content`, `content_html` | | Page identity and content |
| `is_published`, `published_at` | | Publish state |
| `publish_at`, `expire_at` | `timestamp` | Content scheduling |
| `visibility` | `varchar(20)` | public / private / password / members |
| `password_hash` | `varchar(255)` | Bcrypt hash for password-protected pages |
| `locked_by`, `locked_at` | `int`, `timestamp` | Concurrent edit lock |
| `meta_title`, `meta_description`, `og_image` | | SEO metadata |

### API Endpoints (60+)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/website/pages` | List / create pages |
| GET/PUT/DELETE | `/api/website/pages/:id` | Get / update / delete page |
| POST | `/api/website/pages/:id/publish` | Publish page |
| POST | `/api/website/pages/:id/lock` | Acquire edit lock |
| POST | `/api/website/pages/:id/unlock` | Release edit lock |
| GET/PUT | `/api/website/pages/:id/categories` | Page categories |
| GET/PUT | `/api/website/pages/:id/tags` | Page tags |
| GET | `/api/website/public/pages/:slug` | Public: page by slug (auto-schedules) |
| POST | `/api/website/public/pages/:slug/verify-password` | Verify page password |
| GET | `/api/website/public/pages/:slug/breadcrumbs` | Page breadcrumb chain |
| GET/PUT | `/api/website/menus/:id/reorder` | Reorder menu items |
| GET/POST/PUT/DELETE | `/api/website/categories` | Category CRUD |
| PUT | `/api/website/categories/reorder` | Bulk reorder categories |
| GET | `/api/website/public/categories` | Public category list |
| GET | `/api/website/public/categories/:slug/pages` | Category archive |
| GET/POST/PUT/DELETE | `/api/website/tags` | Tag CRUD |
| GET | `/api/website/public/tags/:slug/pages` | Tag archive |
| GET | `/api/website/public/sitemap.xml` | XML sitemap (Nuxt proxy at `/sitemap.xml`) |
| GET | `/api/website/public/robots.txt` | robots.txt (Nuxt proxy at `/robots.txt`) |
| GET | `/api/website/public/styles.css` | CSS design tokens (`:root` vars) |
| GET/PUT | `/api/website/public/theme/:type` | Active theme template (supports `?preview_id`) |

---

## Public Website (Nuxt 3)

The public-facing website is a Nuxt 3 SSR application (`apps/riagri-website/`) that consumes the website module's public API.

### Page Routing

```
URL Request
    │
    ├── /                     → pages/index.vue (Home)
    ├── /products             → pages/products.vue
    ├── /services             → pages/services.vue
    ├── /about                → pages/about.vue
    ├── /contact              → pages/contact.vue
    ├── /category/[slug]      → pages/category/[slug].vue (category archive)
    ├── /tag/[slug]           → pages/tag/[slug].vue (tag archive)
    ├── /sitemap.xml          → proxied to backend sitemap endpoint (Nitro)
    ├── /robots.txt           → proxied to backend robots.txt endpoint (Nitro)
    └── /anything-else        → pages/[...slug].vue (dynamic CMS pages)
```

### Content Rendering

```
pages/[...slug].vue
    │
    ▼
Fetch page: GET /api/website/public/pages/{slug}
    │        Auto-applies scheduling (publishAt/expireAt)
    │        Returns requiresPassword if visibility=password
    │
    ├── requiresPassword? → Password gate UI → verify-password endpoint
    │
    ▼
PageRenderer → BlockRenderer (recursive, 54 blocks, lazy-loaded)
    │
    ├── Motion FX init: useMotionFx() + useInteractions() + useSticky()
    │
    ├── Schema.org JSON-LD injection via useHead():
    │   ├── WebPage (every page)
    │   ├── Article (pageType=post)
    │   ├── FAQPage (pages with faqBlock)
    │   ├── Organization (homepage)
    │   └── BreadcrumbList (all pages)
    │
    └── Preview mode: ?preview_template + ?preview_id → preview banner
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
| `useMotionFx()` | Parallax, rotate, tilt, zoom scroll effects via `data-motion-fx` attrs |
| `useInteractions()` | Hover/click interaction states on blocks |
| `useSticky()` | Sticky block positioning via `data-sticky-position` attrs |
| `useEditMode()` | Admin inline page editing: dirty tracking, undo stack, autosave, lock |

### Live Edit Mode (Admin)

When an admin user visits a public page while logged in, `useEditMode()` activates:

```
Admin visits /about (public site)
    │
    ▼
useEditMode detects auth cookie → fetch page JSON
    │
    ▼
BlockRenderer wraps each block in EditableBlock overlay
    ├── Block toolbar: Edit / Move / Duplicate / Delete
    ├── WidgetSettingsPanel ← widgetRegistry attrs for that block type
    ├── Undo/redo stack (20 operations)
    ├── Autosave (debounced 3s after last change)
    └── beforeunload guard if unsaved changes
```

---

## Request Lifecycle

Complete flow for an authenticated API request:

```
1. HTTP Request arrives at NestJS
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
   │  ├── Input validation (class-validator DTOs)
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
| Website | Drizzle | 17 | website_pages, website_menus, website_menu_items, website_media, website_page_revisions, website_forms, website_form_submissions, website_theme_templates, website_popups, website_settings, website_custom_fonts, website_custom_icons, website_redirects, website_categories, website_tags, website_page_categories, website_page_tags |
| **Total** | | **~67** | |

---

## GraphQL API Layer

The GraphQL API layer provides a unified, type-safe interface to all four Grid abstractions (DataGrid, PolicyGrid, FlowGrid, AgentGrid) with production-grade features: multi-tenant isolation, field-level RBAC masking, real-time subscriptions via WebSocket, AI-native natural language querying, and comprehensive observability.

**Endpoint:** `POST /api/v2/graphql` (HTTP + WebSocket)  
**Status:** Production-ready (v1.0.0, implemented May 2026)  
**Total Implementation:** 9 phases, 130+ files, 6,000+ LOC

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     GraphQL API Clients                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Browser      │  │ Mobile App   │  │ External API     │  │
│  │ (Apollo)     │  │ (Apollo)     │  │ Consumer         │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼────────────────┼────────────────────┼─────────────┘
          │                │                    │
          └────────────────┼────────────────────┘
                           ▼
          ┌─────────────────────────────────┐
          │   Apollo Server v4 + NestJS     │
          │   POST /api/v2/graphql (HTTP)   │
          │   WS /api/v2/graphql (WebSocket)│
          └────────┬──────────────┬─────────┘
                   │              │
        ┌──────────┘              └──────────┐
        ▼                                    ▼
   ┌────────────────────┐          ┌────────────────────┐
   │   4 Grid Modules   │          │  Security Plugins  │
   │  (resolvers)       │          │  (guards/auth)     │
   │                    │          │                    │
   │ • DataGrid         │          │ • GqlJwtGuard      │
   │ • PolicyGrid       │          │ • GqlRbacGuard     │
   │ • FlowGrid         │          │ • Field Masking    │
   │ • AgentGrid        │          │ • Multi-tenant     │
   └────────┬───────────┘          └────────────────────┘
            │
   ┌────────┴──────────────────────────────────┐
   │        Business Logic Services             │
   │  (EntityService, RbacService,              │
   │   AutomationService, AIAdapterService)    │
   └────────┬──────────────────────────────────┘
            │
   ┌────────┴──────────────────────────────────┐
   │    Hybrid ORM (Prisma + Drizzle)          │
   │  + DataLoader (N+1 prevention)            │
   └────────┬──────────────────────────────────┘
            │
   ┌────────┴──────────────────────────────────┐
   │      MariaDB (primary) / MySQL / PG       │
   │  (111 tables: 15 Prisma + 96 Drizzle)     │
   └──────────────────────────────────────────┘
```

### 4 Grid Abstractions

| Grid | Purpose | Key Types | Query Type |
|------|---------|-----------|-----------|
| **DataGrid** | Entity/Record CRUD with field masking | Entity, EntityField, EntityRecord, EntityView | CRUD (pagination, filters, soft delete) |
| **PolicyGrid** | RBAC/ABAC governance | Role, Permission, FieldPermission, RecordRule | Read-only for permissions, write for role/field assignments |
| **FlowGrid** | Workflow automation + real-time events | Workflow, Flow, BusinessRule, FlowEvent | CRUD + @Subscription for real-time updates |
| **AgentGrid** | AI-native NL→GraphQL querying | AgentQueryResult, SchemaContext | Mutation (askQuery) + Query (schemaContext) |

### Security Model

**Authentication:** JWT tokens via `Authorization: Bearer {token}` header (HTTP) or `{ connection_params: { authorization: jwt } }` (WebSocket)

**Authorization:**
- Resolver-level: `@UseGuards(GqlJwtGuard, GqlRbacGuard)` + `@Permissions()`
- Field-level: Post-fetch masking via `EntityFieldPermission.canRead/canWrite`
- Row-level: `RecordRule` domain filters applied to queries

**Multi-Tenant Isolation:**
- JWT claim: `companyId` (extracted as context)
- Header fallback: `x-org-id` header
- DataLoader batching: Scoped per company_id to prevent cross-tenant batches
- Mutations: Reject if companyId missing with `ForbiddenException('Company ID required')`

### Real-Time Subscriptions

**Protocol:** graphql-ws (WebSocket transport)

**Example: Workflow Execution Events**
```graphql
subscription {
  flowExecuted {
    id
    flowName
    status           # 'completed' | 'failed' | 'running'
    recordId
    executionTimeMs
    errorMessage
    timestamp
  }
}
```

**Multi-tenant filtering (P2-1):** `WebSocketManager.canSubscriberReceive()` enforces strict tenant isolation on every broadcast.

```js
// At subscribe time, capture the auth context:
wsManager.subscribe(entity, userId, {
  companyId: req.user.companyId,
  roles: req.user.roles,           // ['super_admin'] bypasses tenant filter
  filter: { status: 'active' },    // optional record-level filter
});

// At broadcast time, canSubscriberReceive() is called for every (sub, record):
//   1. super_admin (or legacy 'admin'): allowed unconditionally
//   2. else: subscription.companyId must match record.company_id /
//      companyId / tenant_id / tenantId (any of those keys)
//   3. record with no tenant + subscriber with no tenant: allowed (global)
//   4. any other mismatch (incl. subscriber-with-tenant ↔ record-without):
//      denied. Defensive default — better to drop than leak.
```

Implementation: `backend/src/core/realtime/websocket-manager.js` (`canSubscriberReceive`).  
Test coverage: `backend/tests/unit/websocket-permission.test.js` — 14 cases pinning the policy, including the explicit "mismatched tenant → denied" data-leak guard.

### Performance & Observability

**DataLoader Batching:** Per-request registry with 5 specialized batch loaders (userById, roleById, entityById, entityFieldsByEntityId, workflowById) prevents N+1 queries. Typical entity + fields query: 2 DB hits (not 11).

**Query Complexity Limits:** 
- Production: Max complexity 100 (rejects expensive nested queries)
- Development: Max complexity 1000 (permissive for testing)
- Field cost estimation via `graphql-query-complexity`

**Observability Plugins:**
- **TracingPlugin:** OpenTelemetry spans per operation + field with tenant/user context
- **ComplexityPlugin:** Pre-execution query complexity scoring
- **LoggingPlugin:** Structured JSON logging of operations, durations, errors

**Metrics Exposed:**
- Operation name, type (query/mutation/subscription), duration_ms
- User ID, company ID, complexity score
- Error count, HTTP status, resolver count

#### Runtime Performance Settings (.env, config-only)

Four env knobs control the request-path overhead; all can be flipped without code changes.

| Setting | Default | Effect |
|---------|---------|--------|
| `DB_LOGGING` | `false` | When `true`, Prisma logs every SQL statement — high disk + serialization cost. Keep off unless diagnosing a specific slow query. |
| `LOG_LEVEL` | `info` | `debug`/`trace` emit serialization on every log call; `info` is the perf-safe floor. |
| `OTEL_TRACES_SAMPLER_ARG` | `0.1` (was `1.0`) | Sampling ratio 0.0–1.0. `1.0` carries trace-export overhead on every request; `0.1` (10%) preserves statistical sample at ~90% lower cost. Raise to `1.0` only for active trace debugging. |
| `METRICS_ENABLED` | `true` | Prometheus `/metrics` endpoint; low overhead, keep on. |

**Database indexing:** Unlike PostgreSQL, MariaDB/MySQL automatically creates an index on every `FOREIGN KEY` declaration — there's no equivalent of the "partial index on nullable FK" hygiene step that FastVue's PostgreSQL setup requires. Verify via `SELECT * FROM information_schema.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_NAME IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS …)` — for the current Lume schema this query returns zero rows.

**Wired in `src/index.js` (no env tuning needed):**
- `app.use(compression({ threshold: 1024 }))` — gzips responses larger than 1 KB. Measured on `/api/modules`: 15 KB → 3 KB over the wire (~80% saving).
- `Cache-Control: public, max-age=5` on `/health` — health monitors typically poll every 10–30s; the 5s window cuts uptime/metric serialization without delaying failure detection. `/api/modules` is deliberately left as `no-cache` because module install/uninstall must be immediately visible.
- JWT login response returns both `data.token` (canonical) and `data.accessToken` (deprecation alias for v2.x SDK compatibility; removed in v3).

**Boot-time guard:**
- `src/core/db/check-table-parity.js` runs after Drizzle init. Scrapes table names from every `src/modules/*/models/schema.js` via regex (no Drizzle import — cheap pre-flight) and compares against `INFORMATION_SCHEMA.TABLES`. Logs one grouped warning listing missing tables instead of dozens of opaque `ER_NO_SUCH_TABLE` errors at request time. `LUME_STRICT_TABLE_PARITY=true` promotes warning to startup failure for CI/prod.

### Process Supervision

| Mode | Tooling | Notes |
|------|---------|-------|
| Dev (default) | `tsx watch` (~2s cold restart) | `npm run dev` |
| Dev (legacy) | nodemon | `npm run dev:nodemon` |
| Production | pm2 cluster | `ecosystem.config.cjs` at repo root: all-CPU cluster, 2 GB heap per worker, `--enable-source-maps`, `max_memory_restart: 1500M`, `max_restarts: 10`, `min_uptime: 15s`. Zero-downtime reloads via `pm2 reload`. |

Production env defaults baked into the ecosystem config: `DB_LOGGING=false`, `LOG_LEVEL=info`, `OTEL_TRACES_SAMPLER_ARG=0.1`, `LUME_STRICT_TABLE_PARITY=true`. Override per-host via shell env or `pm2 --env staging`.

### API Surface — OpenAPI / Swagger (P2-2)

The full HTTP API is described as OpenAPI 3.0. Two endpoints:

- `GET /api/openapi.json` — raw spec (consumed by codegen + client SDKs); served with `Cache-Control: public, max-age=60`.
- `GET /api/docs/` — Swagger UI, interactive request explorer.

**Visibility:** mounted automatically in any non-production environment; in production, only when `OPENAPI_ENABLED=true`. The default-off in production keeps the public surface minimal — host docs on `docs.lume.dev` instead.

**Spec composition** (`backend/src/core/openapi/openapi-spec.js`):

1. **Hand-curated baseline** for platform routes — `/health`, `/api/modules`, `/api/users/login` — and reusable component schemas (`User`, `LoginRequest`, `LoginResponse`, `ApiSuccess`, `ApiError`, `HealthResponse`).
2. **`swagger-jsdoc` merge layer** scrapes `@swagger` JSDoc comments from `src/modules/*/api/*.js` and `src/modules/*/*.routes.js`. Module authors document their own routes locally; the spec assembles them automatically at runtime.

**Schema notes baked into the spec:**

- The `LoginResponse.data` schema documents both `token` (deprecated) and `accessToken` (canonical from v3.0). This locks the P1-3 deprecation alias into the SDK contract.
- `bearerAuth` security scheme is JWT; the Swagger UI "Authorize" button accepts the token from the login response and persists across page reloads.
- Tag taxonomy: `Platform`, `Auth`, then one tag per major module (`Activities`, `Team`, `Website`, etc.).

**Smoke-test coverage** (`tests/integration/setup-smoke.test.js` → OpenAPI surface):

- `/api/openapi.json` returns valid OpenAPI 3.0 with non-empty paths.
- All three platform paths are present in the spec.
- `Cache-Control: public, max-age=60` is set.
- `/api/docs/` serves Swagger UI HTML.
- `LoginResponse.data` schema includes both `token` and `accessToken`.

### AI-Native Querying (AgentGrid)

**NL→GraphQL Translation:**
1. User submits: `"Show all open workflows for my team"`
2. SchemaContextService builds LLM prompt from entity metadata (respects `EntityDefinition.aiMetadata.sensitiveFields` to exclude PII)
3. NlToGraphqlService calls `AIAdapterService.complete()` with temperature=0.1 (deterministic)
4. Generated query executed with RBAC masking + field permissions
5. Response: `{ answer, graphqlQuery, records, confidence (0-1), executionTimeMs }`

Generated queries are cacheable and reusable by clients.

### Detailed Architecture

See [GRAPHQL_ARCHITECTURE.md](GRAPHQL_ARCHITECTURE.md) for:
- 9 implementation phases (Foundation → Integration Tests)
- All 4 Grid type definitions, inputs, resolvers
- DataLoader batch loaders with N+1 prevention strategy
- JWT/RBAC guard implementation for GraphQL context
- Subscription multi-tenant filtering
- Error handling with GraphQL extension codes
- Federation-ready design (Node interface + @Directive)
- Integration test patterns
- Next steps for service wiring

---

## Planned Architecture

### Redis Caching Layer

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   NestJS     │────►│    Redis     │────►│   MySQL/PG   │
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
6. **Progressive Enhancement** — Start with MariaDB + local storage; add Redis, S3, swap to MySQL or PostgreSQL as needed
7. **Visual Content Editing** — TipTap-based page builder with 30+ reusable widget blocks
8. **SSR Public Site** — Nuxt 3 for SEO-optimized public pages, separate from admin SPA

---

## Entity Builder Migration Architecture

### Overview

The **Entity Builder System** represents a fundamental architectural shift from static database schema to dynamic, user-configurable entities. This allows end-users to create custom data structures without code changes.

### Core Entity Builder Tables

```
entities (id, name, label, description, moduleId, createdBy, createdAt, updatedAt, deletedAt)
  │
  ├─ entity_fields (id, entityId, name, label, type, required, unique, sequence)
  │   ├─ Types: text, number, email, url, date, select, lookup, formula, etc.
  │   └─ Features: required, unique, defaultValue, helpText, selectOptions
  │
  ├─ entity_views (id, entityId, name, type, isDefault, config, createdAt, updatedAt)
  │   ├─ Types: list, kanban, calendar, map, gallery, etc.
  │   └─ Config: filters, sorts, grouping, column visibility, etc.
  │
  └─ entity_records (id, entityId, data, createdBy, createdAt, updatedAt, deletedAt)
      └─ data: JSON object with field values
```

### Entity Record Data Storage

```json
{
  "entity_records": {
    "id": 1,
    "entityId": 5,
    "data": {
      "name": "John Doe",
      "email": "john@example.com",
      "status": "active",
      "tags": ["vip", "verified"],
      "linkedEntity": { "id": 10, "label": "Organization" },
      "metadata": { "source": "api", "importId": "12345" }
    },
    "createdBy": 1,
    "createdAt": "2026-04-22T10:00:00Z"
  }
}
```

### Migration Architecture (Phase 2-4)

#### Phase 1: Infrastructure (COMPLETE)
- CI/CD pipeline with GitHub Actions
- Docker containerization (9 services)
- Monitoring with Prometheus + Grafana
- Automated backups with encryption

#### Phase 2: Staging Migration (PREPARED)
```
Legacy Tables (49+) 
    ↓ [Auto-discovery via INFORMATION_SCHEMA]
Entity Definitions (1 per legacy table)
    ↓ [Column mapping]
Entity Fields (mapping legacy columns to field types)
    ↓ [Data transfer]
Entity Records (legacy rows → Entity Builder records)
    ↓ [9-point validation]
✓ Data integrity verified
    ↓ [30 UAT tests + 4-level load testing]
✓ Ready for Phase 3
```

**Timeline**: 3-4 hours execution + 2-3 days testing (Week of Apr 29)

#### Phase 3: Security & A/B Testing (PREPARED)
```
Security Validation
├─ RBAC testing (role-based access control)
├─ Company data isolation
├─ Audit logging verification
├─ Penetration testing (OWASP ZAP, SQLMap)
└─ TLS/HTTPS configuration

Extended Load Testing
├─ Sustained 500 RPS for 8+ hours
├─ Memory leak detection
├─ Database connection stability
└─ Performance metrics collection

A/B Testing (Parallel Deployment)
├─ 10% → 25% → 50% → 75% → 100% traffic shift
├─ Comparison metrics collected
├─ Both systems running simultaneously
└─ Business team UAT validation

Integration Testing
├─ All 23 modules with Entity Builder
├─ Background job processing (BullMQ)
├─ Webhook and external integrations
└─ Multi-entity relationships
```

**Timeline**: 5-7 days (Week of May 5)

#### Phase 4: Production Go-Live (PREPARED)
```
Cutover Window: May 11, 02:00-06:00 UTC (4 hours)

02:00 UTC: Maintenance mode enabled
02:05 UTC: Migration script executes
03:00 UTC: Data validation & verification
03:30 UTC: Maintenance page removed, system online
05:00 UTC: Users notified
06:00 UTC: Cutover complete

Post-Cutover:
├─ 24/7 monitoring (first 48 hours)
├─ Quick rollback capability ready
├─ Error rate tracking
└─ User support team active
```

**Rollback Capability**: < 60 seconds recovery time

### Migration Data Flow

```
┌─────────────────────────────────────────────────────┐
│ LEGACY SYSTEM (Staging Clone)                       │
│ ├─ activities (1000 rows)                           │
│ ├─ donations (500 rows)                             │
│ ├─ team_members (200 rows)                          │
│ └─ ... (49+ tables)                                 │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼ [migrate-to-entity-builder.js]
                 │ Auto-discover tables
                 │ Map column types
                 │ Create Entity records
                 │
┌────────────────▼────────────────────────────────────┐
│ ENTITY BUILDER (Staging)                            │
│ ├─ Entity: activities                               │
│ │  ├─ Fields: title, description, status, date...  │
│ │  └─ Records: 1000 rows transferred                │
│ ├─ Entity: donations                                │
│ │  ├─ Fields: donor_id, amount, date...             │
│ │  └─ Records: 500 rows transferred                 │
│ └─ ... (49+ entities)                               │
│                                                     │
│ ✓ validate-migration.js confirms:                   │
│   ├─ Entity count = legacy table count              │
│   ├─ Record count preserved                         │
│   ├─ Field types valid                              │
│   ├─ No orphaned relationships                      │
│   └─ Data integrity verified                        │
└─────────────────────────────────────────────────────┘
                 │
                 ▼ [A/B Testing]
                 │ Run both systems
                 │ Compare behavior
                 │ 100% traffic shift
                 │
┌────────────────▼────────────────────────────────────┐
│ PRODUCTION (Live)                                   │
│ ├─ Full Entity Builder system                       │
│ ├─ 49+ entities live                                │
│ └─ All features enabled                             │
└─────────────────────────────────────────────────────┘
```

### Entity Field Type Mapping

| Legacy Type | Entity Field Type | Notes |
|------------|------------------|-------|
| VARCHAR(255) | text | Standard text input |
| INT | number | Integer field |
| DECIMAL(10,2) | number | Decimal with precision |
| DATETIME | date | Date/time picker |
| BOOLEAN | select | Binary choice |
| TEXT | textarea | Long text field |
| JSON | json | Unstructured data |
| INT (FK) | lookup | Relationship to another entity |

### Validation & Testing (Phase 2)

**9-Point Validation Suite**:
1. Entity count matches legacy table count
2. Record count preserved from each table
3. All field types valid and mapped correctly
4. No orphaned relationships
5. Audit trail complete and accurate
6. Company scoping intact (multi-tenancy)
7. Soft deletes preserved (deleted_at)
8. Field permissions valid
9. Data integrity check passed

**30 UAT Test Cases**:
- Entity Management (4 tests)
- Record Operations (4 tests)
- Filtering & Sorting (3 tests)
- Relationships (2 tests)
- Views (2 tests)
- Data Integrity (3 tests)
- Security & Access (3 tests)
- Performance (3 tests)
- Error Handling (2 tests)
- Data Export (2 tests)

**Load Testing** (4 levels):
- Level 1: 50 RPS for 1 minute
- Level 2: 100 RPS for 5 minutes
- Level 3: 250 RPS for 15 minutes
- Level 4: 500 RPS for 15+ minutes (stress test)

### Success Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Migration Duration | < 1 hour | TBD | Phase 2 |
| Data Loss | 0 records | TBD | Phase 2 |
| UAT Pass Rate | 30/30 (100%) | TBD | Phase 2 |
| P95 Latency | < 500ms | TBD | Phase 2 |
| Error Rate | < 1% | TBD | Phase 2 |
| Rollback Time | < 60 seconds | TBD | Phase 2 |
| Security Issues | 0 critical | TBD | Phase 3 |
| Performance P99 | < 1000ms @ 500 RPS | TBD | Phase 3 |

### Migration Documentation

- **Quick Start**: `PHASE_2_QUICK_START.md` (320 lines)
- **Detailed Guide**: `PHASE_2_STAGING_EXECUTION.md` (461 lines)
- **Master Checklist**: `PHASE_2_MASTER_CHECKLIST.md` (477 lines)
- **Complete Overview**: `MIGRATION_JOURNEY.md` (486 lines)
- **Phase 3 Guide**: `PHASE_3_QUICK_START.md` (508 lines)

### Automation Scripts

- `scripts/staging-migration-setup.sh` — Environment preparation
- `scripts/staging-migration-execute.sh` — Migration + validation
- `scripts/staging-uat-tests.sh` — 30 automated test cases
- `scripts/staging-rollback-test.sh` — Rollback verification
