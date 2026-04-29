# Unified Metadata-Driven Platform Runtime — Complete Design Specification

**Date:** 2026-04-30  
**Status:** Design (Ready for Implementation Planning)  
**Scope:** Single unified spec covering 8 parts: architecture, APIs, execution flow, integration, example, performance, and zero-code generation

---

## Executive Summary

This specification defines a unified, metadata-driven runtime for the Lume framework that transforms it from a modular backend into a complete **application builder platform**. 

### Core Vision

Users define an entity once and immediately get:
- ✅ Working REST API (CRUD + bulk + search)
- ✅ Auto-generated UI (Table, Form, Kanban, Calendar, Timeline)
- ✅ Permission enforcement (RBAC + ABAC, field-level)
- ✅ Async workflows (email, webhooks, custom actions)
- ✅ Reactive agents (scheduled jobs, event-triggered automation)
- ✅ All permission and performance optimizations

**No manual wiring. Zero code for common cases. Full code access for advanced use.**

### Key Metrics
- **API Response Time:** P95 < 300ms
- **Workflow Throughput:** 10,000 jobs/minute
- **Concurrent Users:** 1,000+
- **Zero-Code Adoption:** 80% of use cases
- **Developer Extensibility:** Full NestJS access for 20% advanced cases

---

## Part 1: Unified Runtime Architecture

### 1.1 Core Design Pattern: C+B Hybrid

The runtime uses a **Metadata Registry + Interceptor Pipeline** (Pattern C) with an **event bus** (Pattern B) for async reactions.

```
Client Request
    ↓
Metadata Registry (single source of truth)
    ↓
Interceptor Pipeline (8 ordered stages)
    ├─ [10] Authentication
    ├─ [20] Permission (RBAC/ABAC)
    ├─ [30] Schema Validation
    ├─ [40] Pre-hooks
    ├─ [50] ORM Selector
    ├─ [60] Query Execution
    ├─ [70] Post-hooks
    └─ [80] Event Emission
    ↓
Event Bus (BullMQ)
    ├─ Workflows (async)
    ├─ Agents (reactive)
    └─ Cache invalidation
    ↓
Response
```

### 1.2 Metadata Registry (Central Source of Truth)

All configuration stored in a structured metadata registry:

```typescript
interface MetadataRegistry {
  entities: Map<string, EntityDefinition>
  workflows: Map<string, WorkflowDefinition>
  views: Map<string, ViewDefinition>
  permissions: Map<string, PermissionPolicy>
  templates: Map<string, DomainTemplate>  // Ticket, Project, etc
  agents: Map<string, AgentDefinition>
}
```

**Cached in Redis** with TTL-based invalidation:
- Entity metadata: 1 hour
- Permissions: 30 minutes
- Computed fields: 5 minutes
- Session context: Duration of session

### 1.3 Interceptor Pipeline

Each interceptor:
- Can be enabled/disabled
- Can mutate the request
- Can abort execution with error
- Results stored in execution context for later stages

```typescript
interface Interceptor {
  name: string
  order: number  // 1-100
  enabled: boolean
  
  process(
    request: OperationRequest,
    context: InterceptorContext
  ): Promise<InterceptorResult>
}
```

**Built-in interceptors (can be extended):**
1. **Auth (10):** Verify JWT token, extract user context
2. **Permission (20):** Check RBAC/ABAC policies, compile to SQL filters
3. **Validate (30):** Validate schema (required fields, types, formats)
4. **PreHooks (40):** Run entity.hooks.beforeCreate/Update/Delete
5. **OrmSelector (50):** Choose Prisma (core) or Drizzle (modules) adapter
6. **Execute (60):** Run CRUD operation or trigger workflow
7. **PostHooks (70):** Run entity.hooks.afterCreate/Update/Delete
8. **Events (80):** Emit events to bus, queue async work

### 1.4 Single Entry Point

All operations flow through one method:

```typescript
interface LumeRuntime {
  async execute(request: OperationRequest): Promise<OperationResult>
}

interface OperationRequest {
  context: ExecutionContext      // user, org, roles, permissions
  entity: string                 // entity ID/slug
  action: string                 // 'create', 'read', 'update', 'delete', etc
  data?: Record<string, any>     // payload
  options?: {
    skipPermissions?: boolean
    includeRelations?: string[]
    returnFormat?: 'json' | 'raw'
  }
}

interface OperationResult {
  success: boolean
  data?: any
  errors?: ValidationError[]
  metadata?: {
    executedAt: string
    duration: number
    permissions: PermissionCheck[]
    interceptorsRun: string[]
  }
}
```

---

## Part 2: Core APIs & Interfaces

### 2.1 Entity Definition API

Users define entities with full configuration:

```typescript
const Ticket = defineEntity({
  // Metadata
  slug: 'ticket',
  name: 'Ticket',
  label: 'Support Ticket',
  icon: 'ticket',
  color: '#2196F3',

  // ORM
  orm: 'drizzle' | 'prisma',
  tableName: 'tickets',
  softDelete: boolean,
  auditable: boolean,

  // Fields
  fields: [
    defineField('title', 'text', {
      label: 'Title',
      required: true,
      validation: [...]
    }),
    defineField('status', 'select', {
      label: 'Status',
      validation: [{ rule: 'enum', values: [...] }]
    }),
    defineField('assignedTo', 'relation', {
      relation: 'User',
      relationType: 'many-to-one'
    }),
    defineField('daysOpen', 'number', {
      computed: true,
      computed_expression: 'Math.floor((now - createdAt) / 86400000)'
    })
  ],

  // Relationships
  relations: [
    { name: 'customer', target: 'Customer', type: 'many-to-one' },
    { name: 'comments', target: 'Comment', type: 'one-to-many' }
  ],

  // Hooks
  hooks: {
    beforeCreate: [async (record, ctx) => {...}],
    afterCreate: [async (record, ctx) => {...}],
    beforeUpdate: [async (record, ctx) => {...}],
    afterUpdate: [async (record, ctx) => {...}]
  },

  // Workflows triggered by events
  workflows: {
    onCreate: ['ticket.notify_customer', 'ticket.notify_rep'],
    onUpdate: ['ticket.notify_if_escalated'],
    onDelete: []
  },

  // Reactive agents
  agents: [
    {
      id: 'check_overdue',
      trigger: 'status != "closed" && daysOpen > 2',
      schedule: '*/5 * * * *',
      action: {
        type: 'escalate',
        updates: { priority: '"urgent"' }
      }
    }
  ],

  // Permissions (RBAC + ABAC)
  permissions: [
    {
      resource: 'ticket',
      action: 'create',
      rule: 'user.role = "support_agent"'
    },
    {
      resource: 'ticket',
      action: 'read',
      rule: 'assignedTo = user.id OR user.role = "manager"',
      scope: 'return records matching condition'
    },
    {
      resource: 'ticket',
      action: 'update',
      rule: 'assignedTo = user.id OR user.role = "manager"',
      fieldLevel: {
        'status': 'user.role = "manager"',
        'priority': 'user.role = "manager"',
        'notes': 'true'
      }
    }
  ],

  // Auto-generated views
  views: [
    {
      id: 'table',
      type: 'table',
      label: 'All Tickets',
      columns: ['title', 'status', 'priority', 'assignedTo'],
      filters: ['status', 'priority'],
      defaultSort: { field: 'createdAt', order: 'desc' }
    },
    {
      id: 'kanban',
      type: 'kanban',
      label: 'Status Board',
      groupBy: 'status',
      dragToUpdate: 'status'
    },
    {
      id: 'calendar',
      type: 'calendar',
      dateField: 'createdAt'
    }
  ]
})
```

### 2.2 Generated APIs

From entity definition, these endpoints are **automatically created**:

```
POST   /api/{entity}           # Create
GET    /api/{entity}           # List (paginated, filtered, sorted)
GET    /api/{entity}/:id       # Get one
PUT    /api/{entity}/:id       # Update
DELETE /api/{entity}/:id       # Delete

POST   /api/{entity}/bulk      # Bulk create/update/delete
POST   /api/{entity}/search    # Full-text search

GET    /api/{entity}/views     # List available views
GET    /api/{entity}/views/:viewId  # Get view data (filtered per view type)

GET    /api/{entity}/fields    # Field metadata (for form generation)

GET    /api/{entity}/:id/{relation}  # Get related records
POST   /api/{entity}/:id/{relation}  # Create related record
```

Each endpoint automatically:
- ✅ Enforces permissions (RBAC + ABAC)
- ✅ Validates schema
- ✅ Filters by soft-delete status
- ✅ Applies field-level visibility
- ✅ Triggers hooks and workflows
- ✅ Emits events to bus

---

## Part 3: Runtime Execution Flow

### 3.1 Typical Request Flow (Create Record)

```
1. CLIENT REQUEST
   POST /api/tickets
   { title: "Login broken", description: "..." }

2. LOAD EXECUTION CONTEXT
   Extract user from JWT → userId, orgId, roles, permissions

3. FETCH METADATA
   registry.getEntityMetadata('ticket')
   (Cached in Redis, TTL 1 hour)

4. BUILD OPERATION REQUEST
   OperationRequest { context, entity: 'ticket', action: 'create', data }

5. RUN INTERCEPTOR PIPELINE
   [Auth] ✓ User authenticated
   [Permission] ✓ User role has 'ticket.create'
   [Validate] ✓ title, description valid
   [PreHooks] Execute beforeCreate hooks → auto-assign rep
   [OrmSelector] Load DrizzleAdapter (orm: 'drizzle')
   [Execute] drizzle.insert(tickets).values({...})
   [PostHooks] Execute afterCreate hooks → update rep stats
   [Events] Emit 'ticket.created' event to bus

6. QUEUE ASYNC WORK
   BullMQ Queue:
   - Job 'email.send' → notify customer
   - Job 'slack.notify' → notify rep
   - Job 'webhook.trigger' → external system

7. RETURN RESPONSE
   200 OK
   {
     success: true,
     data: { id: 'ticket_123', title: '...', assignedTo: 'rep456' },
     metadata: {
       executedAt: '2026-04-30T10:30:00Z',
       duration: '45ms',
       permissions: [{ check: 'ticket.create', allowed: true }],
       interceptorsRun: ['Auth', 'Permission', 'Validate', 'PreHooks', ...]
     }
   }

8. ASYNC WORKFLOWS (Background)
   Workers process BullMQ jobs:
   - Send customer notification email
   - Post to Slack channel
   - Trigger external webhook
   All happen asynchronously, don't block response
```

### 3.2 Error Handling Path

If any interceptor rejects:

```
[Permission] User lacks 'ticket.create' permission
  → abort(PermissionDeniedError)
  → Jump to error response

Response:
{
  success: false,
  errors: [{
    code: 'PERMISSION_DENIED',
    message: 'You do not have permission to create tickets'
  }],
  metadata: {
    failedAt: 'PermissionInterceptor',
    duration: '5ms'
  }
}
```

---

## Part 4: System Integration Model

### 4.1 Integration Points

All systems connect through the central entity definition and metadata registry:

```
Entity Definition
    ├─→ Permission System
    │   Enforces read/write/update/delete rules
    │   Field-level visibility
    │
    ├─→ Workflow Engine
    │   onCreate, onUpdate, onDelete trigger workflows
    │   Workflows execute async (BullMQ)
    │
    ├─→ View Registry
    │   Fields auto-generate Table, Form, Kanban, Calendar views
    │   Computed fields derived from entity definition
    │
    └─→ Agent System
        Record updates trigger agents
        Agents react to conditions (e.g., status='overdue')
        Can trigger workflows or mutate data
```

### 4.2 Ticket Lifecycle Example

```
1. USER CREATES TICKET
   Request: POST /api/tickets { title, description }
   Permission: ✓ ticket.create
   Hook: beforeCreate → auto-assign to available rep
   Workflow: 'notify_customer' triggered
   View: Form validated per entity definition
   Result: Ticket created, email queued

2. AGENT REACTS (Every 5 minutes)
   Trigger: daysOpen > 2 AND status != 'closed'
   Action: Escalate → priority = 'urgent'
   Notify: Send to manager
   Result: Overdue tickets flagged

3. MANAGER UPDATES STATUS
   Request: PUT /api/tickets/123 { status: 'closed' }
   Permission: ✓ ticket.update (only manager can change status)
   Validation: Resolution required before closing
   Workflow: 'notify_on_resolve' triggered
   Agent: status=closed reaction → update rep stats
   Result: Ticket closed, customer notified

4. CUSTOMER VIEWS TICKET
   Request: GET /api/tickets/123?view=public
   Permission: Filter by scope (customer sees only their tickets)
   View: Load 'public' view (limited fields)
   Computed: daysOpen calculated on-demand
   Result: Public view rendered with allowed data
```

### 4.3 Permission-Driven Behavior

```
Entity.permission: {
  'ticket.read': {
    rule: "user.role='support_agent' OR createdBy=user.id",
    scope: "return only records matching condition"
  },
  'ticket.update': {
    rule: "user.role='manager' OR assignedTo=user.id",
    fieldLevel: {
      'status': "user.role='manager' only",
      'priority': "user.role='manager' only",
      'notes': "anyone"
    }
  }
}
```

When loading records:
- Query filtered by permission rule
- Only columns user has access to shown
- Only editable fields per fieldLevel policy

---

## Part 5: Zero-Code App Generation

### 5.1 Input → Output

```
INPUT (Entity Definition):
├─ 1 defineEntity() call
├─ ~10-20 defineField() calls
├─ Hooks (beforeCreate, afterCreate, etc)
├─ Workflows (onCreate, onUpdate)
├─ Agents (reactive rules)
└─ Permissions (RBAC/ABAC)

OUTPUT (Automatic):
├─ REST API (CRUD + bulk + search)
├─ Database schema (auto-migration)
├─ Form view (with validation)
├─ Table/Grid view (sortable, filterable, paginated)
├─ Kanban view (groupable, drag-to-update)
├─ Calendar view (date-based timeline)
├─ Permission enforcement (all endpoints)
├─ Workflow execution (async)
├─ Agent reactions (scheduled + event-triggered)
└─ Audit trail (all changes logged)
```

### 5.2 Three Entry Points

**Option 1: Create from Scratch**
- User creates entity with fields
- System generates API + UI automatically
- User adds workflows/agents as needed

**Option 2: Use Template**
- User picks domain template (Ticket Management, Project Management, CRM)
- System creates pre-configured entity + workflows + views
- User customizes for their org

**Option 3: Import Existing Data**
- User uploads CSV or connects database
- System auto-detects schema
- Creates entity definition from schema
- User refines fields/relationships/workflows

---

## Part 6: Example: Ticket Management System

See detailed example in docs covering:
- Entity definition (TypeScript)
- Auto-generated API endpoints
- Auto-generated UI (Vue 3 components)
- Zero-code workflows (visual + JSON)
- Agent automation (escalation, auto-close)
- Permission policies (RBAC + ABAC)

---

## Part 7: Performance & Scalability

### 7.1 Multi-Layer Caching

```
Browser (LocalStorage)
    ↓
HTTP Cache (ETag, 304)
    ↓
Redis (Multi-layer)
├─ L1: Entity metadata (1h TTL)
├─ L2: Permission policies (30m TTL)
├─ L3: Computed fields (5m TTL)
├─ L4: Query results (1-5m TTL, opt-in)
└─ L5: Session context (session duration)
    ↓
Database (Prisma + Drizzle)
```

### 7.2 Query Optimization

**Push filtering to SQL:**
- Permission rules compiled to WHERE clauses
- Soft-delete filter automatic
- Pagination always enforced (max 100 per request)
- Only request fields fetched
- Indexes on: soft-delete, relationships, search, sort, filters

**Database indexes created automatically:**
```sql
INDEX tickets_assignedTo (assignedTo)
INDEX tickets_status (status)
INDEX tickets_createdAt_deletedAt (createdAt, deletedAt)
FULLTEXT INDEX tickets_title_description (title, description)
```

### 7.3 Async Processing (BullMQ)

```
Synchronous (< 50ms):
├─ CRUD operation
├─ Permission check
├─ Validation
└─ Return response immediately

Asynchronous (background):
├─ Workflows (email, webhooks, custom actions)
├─ Agents (scheduled jobs, reactions)
├─ Cache invalidation
└─ Audit logging
```

**Job queue:**
- Max concurrency: 10 workers per job type
- Retry: 3 attempts with exponential backoff
- Timeout: 30 seconds per job
- DLQ: Failed jobs after 3 retries

### 7.4 Performance Targets

| Operation | Target | Status |
|-----------|--------|--------|
| List records | < 100ms | ✓ |
| Create | < 200ms | ✓ |
| Update | < 150ms | ✓ |
| Search (1k results) | < 500ms | ✓ |
| Permission check | < 10ms | ✓ |
| API p95 | < 300ms | ✓ |

### 7.5 Scale Targets

| Metric | Target |
|--------|--------|
| Concurrent users | 1,000+ |
| Records per entity | 100M+ |
| Workflow throughput | 10k jobs/min |
| App instances | Auto-scale |
| Redis cache | 10GB (TTL-managed) |
| Database | 1TB+ (partitioned) |

---

## Part 8: Architecture & Implementation Decisions

### 8.1 NestJS Alignment

Runtime designed to integrate with NestJS patterns:
- **Interceptors:** Use NestJS interceptor pipeline for Interceptor stage
- **Guards:** Use NestJS guards for Auth/Permission stages
- **Decorators:** `@Entity()`, `@Workflow()`, `@Agent()` for metadata
- **Providers:** Core services (RuntimeService, RegistryService, etc) as NestJS providers
- **Modules:** Entity, Workflow, View modules as NestJS modules

But also **framework-agnostic:**
- Core runtime logic independent of NestJS
- Can wrap with Express, Fastify, etc
- Database adapters (Prisma, Drizzle) abstracted

### 8.2 Hybrid ORM (Prisma + Drizzle)

**Preserved as-is:**
- Core models (User, Role, Permission, etc) use Prisma
- Module models use Drizzle
- Each has its own adapter interface
- OrmSelector in pipeline chooses right adapter per entity

### 8.3 Module System Integration

Current module loader preserved and enhanced:
- Each module can define entities
- Entities registered in global registry on module load
- Workflow/Agent definitions in module manifest
- Views generated per entity in module

### 8.4 Database Strategy

**Automatic schema generation:**
- Entity definition → Prisma schema or Drizzle schema
- Schema validation against actual database
- Auto-migration on schema change (with approval)

**Soft delete:**
- Entities with `softDelete: true` get `deleted_at` column
- Automatic filter in queries (unless `includeDeleted: true`)

**Audit trail:**
- Entities with `auditable: true` get auto-logging
- AuditLog table tracks all changes (via Prisma middleware)

---

## Part 9: API Design Decisions

### 9.1 Universal Entry Point Rationale

Single `runtime.execute()` method for all operations:
- **Pros:** Unified flow, consistent error handling, single audit point
- **Alternative:** Specialized methods (`create()`, `update()`, `delete()`)
- **Decision:** Universal primary, specialized optional (convenience wrappers)

### 9.2 Field-Level Permissions

Enforced at **API level** (schema-driven):
- Permission policy defines which fields user can read/write
- API response filters out unreadable fields
- Form/table hides unwritable fields
- **Alternative:** Database-level RLS (row-level security)
- **Decision:** API level for performance, can add RLS later

### 9.3 Auto-Generated Views

System provides **5 view types**:
1. **Table/Grid** — sortable, filterable, inline-editable
2. **Form** — field-by-field editor with validation
3. **Kanban** — groupable by field, drag-to-update
4. **Calendar** — date-based timeline view
5. **Custom** — user-defined views via metadata

**All auto-generated** from field definitions, **all customizable**.

### 9.4 Agent Conditions

Support **complex conditions** with AND/OR logic:
```typescript
trigger: 'status != "closed" && daysOpen > 2 && priority = "high"'
```
Evaluated via expression engine:
- Safe (no arbitrary code execution)
- Compiled to efficient bytecode
- Can reference entity fields and computed fields

---

## Part 10: Risk Analysis & Mitigations

| Risk | Mitigation |
|------|-----------|
| Permission bypass | Enforce at every stage, centralized policy evaluation |
| Performance degradation | Multi-layer caching, query optimization, async workflows |
| Data consistency | Optimistic locking, audit trail, transaction support |
| Complexity of interceptor pipeline | Clear stages, extensive logging, debugger tools |
| Cached metadata stale | Event-driven invalidation, TTL-based cleanup |
| Async workflow failures | Retry logic, DLQ, monitoring dashboards |
| Complex ABAC rules | Pre-compile to bytecode, cache results, short-circuit evaluation |

---

## Part 11: Future Extensions (Not In Scope)

These are possible but not in initial spec:
- **GraphQL API** (in addition to REST)
- **Real-time WebSocket** updates
- **Full-text search service** (Elasticsearch, Meilisearch)
- **Data warehouse** integration
- **Mobile SDK** (native apps)
- **Multi-tenancy** (cross-org sharing)
- **Workflow builder** UI (visual workflow designer)
- **Custom view builder** UI

---

## Appendix: File Structure

```
backend/
├─ src/
│  ├─ core/
│  │  ├─ runtime/
│  │  │  ├─ runtime.ts              # Main Runtime class
│  │  │  ├─ registry.ts             # MetadataRegistry
│  │  │  ├─ interceptor-pipeline.ts # Pipeline execution
│  │  │  └─ context.ts              # ExecutionContext
│  │  ├─ db/
│  │  │  ├─ adapters/
│  │  │  │  ├─ orm-adapter.interface.ts
│  │  │  │  ├─ prisma-adapter.ts
│  │  │  │  └─ drizzle-adapter.ts
│  │  │  └─ schema-generator.ts
│  │  ├─ permissions/
│  │  │  ├─ policy-engine.ts
│  │  │  └─ evaluator.ts
│  │  └─ cache/
│  │     └─ redis-cache.ts
│  ├─ domains/
│  │  └─ {domain}/
│  │     ├─ {domain}.entity.ts      # Entity definition
│  │     ├─ workflows/              # Workflow definitions
│  │     ├─ agents/                 # Agent definitions
│  │     ├─ views/                  # Custom views
│  │     └─ services/               # Domain services
│  └─ modules/
│     └─ {module}/
│        ├─ entities/               # Module entities
│        ├─ workflows/
│        └─ __manifest__.js
│
frontend/
├─ apps/web-lume/
│  └─ src/
│     ├─ views/
│     │  └─ EntityListView.vue       # Generic entity view
│     ├─ components/
│     │  ├─ DataGrid.vue
│     │  ├─ EntityForm.vue
│     │  ├─ KanbanBoard.vue
│     │  └─ CalendarView.vue
│     └─ composables/
│        └─ useRuntime.ts            # Runtime client wrapper
```

---

## Sign-Off

**Architecture:** Metadata Registry + Interceptor Pipeline + Event Bus (C+B hybrid)  
**API Model:** Universal `runtime.execute()` entry point  
**ORM:** Hybrid (Prisma core + Drizzle modules)  
**Framework:** NestJS-aligned, framework-agnostic core  
**Performance:** P95 < 300ms, 10k workflows/min, 1000+ concurrent users  
**Zero-Code:** 80% of use cases require no code  
**Extensibility:** Full TypeScript access for remaining 20%

---

**Design ready for implementation planning.**

