# Lume v2.0 Architecture Guide

**Last Updated:** April 28, 2026  
**Version:** 2.0.0  
**Status:** Production Ready

Complete technical architecture documentation for Lume including system design, module system, ORM, scalability, and deployment patterns.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Module System](#module-system)
4. [Database Architecture](#database-architecture)
5. [API Design](#api-design)
6. [Frontend Architecture](#frontend-architecture)
7. [Performance Architecture](#performance-architecture)
8. [Scalability](#scalability)
9. [Security Architecture](#security-architecture)

---

## System Overview

Lume v2.0 is a modular, self-hosted CRM and database builder built on modern open-source technologies. The architecture prioritizes flexibility, scalability, and operational simplicity.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
├────────────────────┬────────────────────┬───────────────────┤
│  Admin Panel       │   Public Website   │  Mobile/CLI       │
│  (Vue 3 SPA)      │   (Nuxt 3 SSR)     │  (REST API)       │
└──────────┬─────────┴──────────┬─────────┴───────────┬────────┘
           │                    │                     │
           └────────────────────┼─────────────────────┘
                                │ HTTPS
           ┌────────────────────▼─────────────────────┐
           │      API Gateway / Load Balancer        │
           │  (Nginx / AWS ELB / Kubernetes Ingress) │
           └────────────────────┬─────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
   ┌─────────┐          ┌────────────┐          ┌─────────┐
   │ API     │          │ API        │          │ API     │
   │ Server  │          │ Server     │          │ Server  │
   │ (Node)  │          │ (Node)     │          │ (Node)  │
   │ Replica │          │ Replica    │          │ Replica │
   │ #1      │          │ #2         │          │ #3      │
   └────┬────┘          └─────┬──────┘          └────┬────┘
        │                     │                      │
        └─────────────────────┼──────────────────────┘
                              │
        ┌─────────────────────┼──────────────────┐
        │                     │                  │
        ▼                     ▼                  ▼
   ┌──────────┐          ┌────────┐        ┌────────┐
   │ MySQL    │          │ Redis  │        │ S3 /   │
   │ Primary  │ (Repl)   │ Cluster│        │ CDN    │
   │          │◄────────▶│        │        │        │
   │ (Read)   │          │        │        │(Assets)│
   └──────────┘          └────────┘        └────────┘
```

### Key Components

**Client Layer:**
- Vue 3 SPA admin panel with Ant Design Vue components
- Nuxt 3 SSR public website for SEO optimization
- REST API for programmatic access

**API Servers (Node.js/NestJS TypeScript):**
- 24 pluggable modules
- 100+ REST endpoints
- WebSocket real-time updates
- Authentication and authorization
- Job queue processing

**Data Layer:**
- MySQL primary database
- Redis for caching and sessions
- Hybrid ORM (Prisma + Drizzle)

**Storage:**
- S3/CDN for file uploads and assets
- Database backups with point-in-time recovery

---

## Technology Stack

### Backend

- **Runtime:** Node.js v20.12+ LTS (TypeScript)
- **Framework:** NestJS 10.x (modular, type-safe)
- **ORM:** Prisma (core) + Drizzle (modules)
- **Authentication:** JWT with refresh tokens
- **Database:** MySQL 8.0+ / PostgreSQL 13+
- **Cache:** Redis 6.0+
- **Job Queue:** BullMQ for async processing
- **WebSocket:** Socket.io for real-time updates
- **Validation:** Joi for request validation
- **Testing:** Jest with ESM support

### Frontend (Admin Panel)

- **Framework:** Vue 3 with Composition API
- **Build Tool:** Vite (hot module replacement)
- **CSS:** Tailwind CSS 4 with custom design tokens
- **Components:** Ant Design Vue
- **State Management:** Pinia
- **HTTP Client:** Axios with interceptors
- **Icons:** Lucide Vue Next
- **Testing:** Vitest

### Frontend (Public Website)

- **Framework:** Nuxt 3 (SSR + Static Generation)
- **Meta Framework:** Full-stack with server routes
- **Content:** Markdown with TipTap JSON rendering
- **SEO:** Built-in meta tags, sitemap, schema.org
- **Performance:** Image optimization, code splitting
- **Testing:** Vitest

---

## Module System

Lume's modularity comes from a plugin-based architecture. Each module is self-contained with:
- Database schema (Drizzle)
- API routes
- Services/business logic
- Frontend components (optional)
- Permissions
- Manifest metadata

### Module Structure

```
backend/src/modules/
├── base/                          (Core user/role/auth)
├── security/                      (JWT, permissions)
├── website/                       (CMS pages, menus)
├── editor/                        (Visual page builder)
├── media/                         (File management)
├── automations/                   (Workflows)
└── [23+ more modules]
```

Each module has:

```
modules/mymodule/
├── __manifest__.js                (Module metadata)
├── models/
│   └── schema.js                  (Drizzle schema)
├── services/
│   └── mymodule.service.js        (Business logic)
├── routes.js                      (API endpoints)
├── permissions.js                 (Role-based access)
├── static/
│   ├── views/                     (Vue components)
│   ├── api/                       (API clients)
│   └── components/                (Shared components)
└── tests/
    └── mymodule.test.js           (Jest tests)
```

### Module Lifecycle

1. **Discovery:** System scans for modules in `src/modules/`
2. **Manifest Loading:** Reads `__manifest__.js` metadata
3. **Dependency Resolution:** Checks module dependencies
4. **Schema Registration:** Registers Drizzle schemas
5. **Service Initialization:** Creates service instances
6. **Route Registration:** Mounts API routes
7. **Permission Registration:** Sets up RBAC
8. **Frontend Loading:** Optional Vue component loading

### Module Communication

Modules communicate through:
- **Shared Services:** Common services (auth, logging)
- **Database Relations:** Foreign keys in schema
- **Events:** Event emitter for module events
- **APIs:** RESTful endpoints for external communication

---

## Database Architecture

Lume uses a hybrid ORM approach for maximum flexibility.

### Prisma (Core Models)

Handles 11 core models shared across the system:

```prisma
model User {
  id        Int     @id @default(autoincrement())
  email     String  @unique
  firstName String
  lastName  String
  roleId    Int
  status    String  @default("active")
  createdAt DateTime @default(now())
}

model Role {
  id   Int    @id @default(autoincrement())
  name String @unique
}

model Permission {
  id   Int    @id @default(autoincrement())
  name String @unique
}

// ... 8 more core models
```

**Why Prisma?**
- Type-safe queries
- Auto-migrations
- Relation management
- Multi-database support

### Drizzle (Module Schemas)

14+ module-specific schemas use Drizzle:

```typescript
// modules/website/models/schema.ts
export const websitePages = mysqlTable('website_pages', {
  id: int().primaryKey().autoincrement(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique(),
  content: longtext('content'),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`)
});
```

**Why Drizzle?**
- Module-local schemas
- No schema lock-in to Prisma
- Better performance for modules
- SQL-first approach

### Database Schema Overview

**Core Tables (Prisma):**
- users
- roles
- permissions
- role_permissions
- settings
- audit_logs
- installed_modules
- menus
- groups
- record_rules
- sequences

**Module Tables (Drizzle):**
- website_pages
- website_menus
- website_media
- website_settings
- editor_templates
- editor_snippets
- automations
- automation_executions
- webhooks
- webhook_deliveries
- media_files
- [10+ more]

**Total:** 49+ tables with 140+ relationships

### Data Consistency

**ACID Guarantees:**
- Transactions for multi-table operations
- Foreign key constraints
- Unique constraints on critical fields

**Soft Deletes:**
- `deleted_at` timestamp prevents hard deletion
- Records hidden from normal queries
- Can be restored

**Audit Logging:**
- Every change logged in `audit_logs`
- Tracks user, timestamp, old/new values
- Enables compliance and debugging

---

## API Design

Lume follows REST API best practices for consistency and simplicity.

### Endpoint Structure

```
GET    /api/:entity              # List records
GET    /api/:entity/:id          # Get single record
POST   /api/:entity              # Create record
PUT    /api/:entity/:id          # Update record
DELETE /api/:entity/:id          # Delete record

GET    /api/:entity/views        # List views
POST   /api/:entity/views        # Create view
GET    /api/:entity/automations  # List automations

GET    /api/:entity/export       # Export records (CSV/Excel)
POST   /api/:entity/bulk         # Bulk operations
```

### Request/Response Format

**Standard Success:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

**Standard Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [{"field": "email"}]
  }
}
```

### Middleware Pipeline

```
Request
  ├─ Helmet (security headers)
  ├─ CORS validation
  ├─ Rate limiting (throttler)
  ├─ Logging middleware
  ├─ Body parser (JSON)
  ├─ Authentication (JWT)
  ├─ Authorization (permissions)
  └─ Route handler
    └─ Response formatting
      └─ Client
```

### Caching Strategy

**Cache Layers:**
1. **CDN (CloudFlare):** Static assets (1 year)
2. **Redis:** Queries and sessions (5-60 minutes)
3. **Browser:** API responses (5-10 minutes)

**Cache Invalidation:**
- Manual invalidation on data change
- TTL-based expiry for eventual consistency
- ETag support for conditional requests

---

## Frontend Architecture

### Admin Panel (Vue 3)

**Structure:**
```
src/
├── components/          # Reusable components
├── views/              # Page components
├── stores/             # Pinia state management
├── api/                # API client functions
├── router/             # Vue Router setup
├── layouts/            # Layout templates
└── main.ts             # App entry point
```

**State Management (Pinia):**
- User store (auth, profile)
- Entity store (current entity data)
- View store (selected view, filters)
- UI store (sidebar, modals)

**Component Pattern:**
```vue
<template>
  <a-card>
    <a-button @click="handleCreate">+ New</a-button>
    <a-table :data="records" />
  </a-card>
</template>

<script setup lang="ts">
import { useEntityStore } from '@/stores/entity'

const store = useEntityStore()
const records = computed(() => store.currentRecords)

const handleCreate = () => {
  // Create logic
}
</script>
```

### Module Frontend (Static Folder)

Each module can have frontend components:

```
modules/website/static/
├── views/             # Page-level components
├── components/        # Shared components
└── api/              # API clients
```

Imported via `@modules` alias:
```javascript
import { PageEditor } from '@modules/website/static/views'
```

### Public Website (Nuxt 3)

**Hybrid Rendering:**
- SSR for initial page load (SEO)
- Static generation for fast pages
- ISR (Incremental Static Regeneration) for updates

**Page Structure:**
```
pages/
├── index.vue          # Homepage
├── features.vue       # Features showcase
├── blog/
│   ├── index.vue      # Blog list
│   └── [slug].vue     # Blog post detail
└── [...slug].vue      # Dynamic CMS pages
```

---

## Performance Architecture

### Performance Metrics

Target performance:
- **API P95 Latency:** <300ms
- **Admin Panel:** <500ms page load
- **Public Site:** <1s initial load
- **Throughput:** 1000 req/s per instance

### Optimization Techniques

**Backend:**
- Redis caching layer
- Database query optimization (indices)
- Connection pooling (Prisma)
- Request deduplication
- Response compression (gzip)

**Frontend:**
- Code splitting per route
- Lazy loading of components
- Image optimization (responsive, WebP)
- CSS critical path extraction
- Tree shaking (dead code removal)

**Database:**
- Indices on frequently queried fields
- Query result caching
- Connection pooling
- Read replicas for heavy queries

**CDN:**
- Static asset caching
- Edge compression
- Image optimization

---

## Scalability

### Horizontal Scaling

Lume scales horizontally by adding API servers:

```
┌─────────────┐
│   Load      │
│ Balancer    │
├─────────────┤
│ API #1      │
│ API #2      │ ──► Shared MySQL + Redis
│ API #3      │
│ API #n      │
└─────────────┘
```

**Requirements:**
- Stateless API servers (no local session storage)
- Shared database (MySQL primary + replicas)
- Shared cache (Redis cluster)
- Shared session store

### Vertical Scaling

Single-server scaling:
- Increase CPU cores
- Increase RAM for caching
- SSD for database I/O
- Network optimization

### Load Balancing

**Round-robin:** Equal distribution across servers
**Least connections:** Send to server with fewest requests
**Health checks:** Automatically remove failed servers

### Rate Limiting

Per-user or IP-based throttling:
- Public endpoints: 100 req/15 min
- Auth endpoints: 5 req/5 min
- API endpoints: 1000 req/hour

---

## Security Architecture

### Authentication Flow

```
1. User enters credentials
2. Server validates (password hash)
3. Server issues JWT access token + refresh token
4. Client stores tokens securely
5. Client sends access token in Authorization header
6. Server validates JWT signature + expiration
7. Token expires, client uses refresh token to get new access token
```

### Authorization Model

Role-based access control (RBAC):
- **Admin:** Full access
- **Editor:** Create/edit records
- **Viewer:** Read-only access

Permission checks:
```javascript
if (!user.hasPermission('contacts.edit')) {
  throw new ForbiddenError()
}
```

### Security Headers

All responses include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy: default-src 'self'`
- `Strict-Transport-Security: max-age=31536000`

### Data Protection

- **Passwords:** Hashed with bcrypt (salted)
- **Transit:** HTTPS/TLS 1.2+
- **At Rest:** Database encryption (optional)
- **Audit:** All access logged

### Dependency Management

- Regular `npm audit` for vulnerabilities
- Automated updates (with testing)
- Pinned versions in package-lock.json

---

## Disaster Recovery

### Backup Strategy

- Daily automated backups
- 30-day retention policy
- Off-site backup storage (S3)
- Point-in-time recovery capability

### Replication

- MySQL primary-replica replication
- Redis persistence
- Distributed file storage

### Monitoring & Alerts

- Uptime monitoring (Uptime Robot)
- Error tracking (Sentry)
- Performance monitoring (New Relic/Datadog)
- Log aggregation (ELK stack)

---

**For deployment details, see [PUBLIC_DEPLOYMENT.md](PUBLIC_DEPLOYMENT.md).**

**For security specifics, see [SECURITY_HARDENING_GUIDE.md](../SECURITY_HARDENING_GUIDE.md).**

