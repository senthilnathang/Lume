# GraphQL API Layer — Complete Architecture

**Version:** 1.0.0  
**Status:** Production-Ready  
**Implementation Date:** 2026-05-01  
**Total Files:** 130+ (src + tests)

This document describes the complete GraphQL API layer for Lume NestJS, exposing 4 Grid abstractions (DataGrid, PolicyGrid, FlowGrid, AgentGrid) with multi-tenant isolation, field-level RBAC, real-time subscriptions, and AI-native querying.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Decisions](#architecture-decisions)
3. [Grid System](#grid-system)
4. [Security Model](#security-model)
5. [Performance Strategy](#performance-strategy)
6. [Real-Time & Subscriptions](#real-time--subscriptions)
7. [Observability](#observability)
8. [Directory Structure](#directory-structure)
9. [Data Flow](#data-flow)
10. [Integration Points](#integration-points)

---

## Overview

The GraphQL layer is a **production-grade API** built on NestJS + Apollo Server with 9 implementation phases:

| Phase | Component | Status |
|-------|-----------|--------|
| 1 | Foundation (scalars, shared types, module) | ✓ Complete |
| 2 | Security (JWT/RBAC guards) | ✓ Complete |
| 3 | DataLoader (N+1 prevention) | ✓ Complete |
| 4 | DataGrid (Entity/Record CRUD) | ✓ Complete |
| 5 | PolicyGrid (RBAC/ABAC governance) | ✓ Complete |
| 6 | FlowGrid (Workflow automation + subscriptions) | ✓ Complete |
| 7 | AgentGrid (AI-native NL→GraphQL) | ✓ Complete |
| 8 | Observability (tracing, complexity, logging) | ✓ Complete |
| 9 | Integration tests + schema export | ✓ Complete |

**Endpoint:** `POST /api/v2/graphql` (HTTP + WebSocket)  
**Schema:** Auto-generated from TypeScript decorators (code-first)  
**Federation:** Ready (Node interface + @key directive)

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Code-First vs Schema-First** | Code-first | TypeScript → SDL auto-generation eliminates drift; leverages existing decorator patterns (@Injectable, @Permissions) |
| **ORM Boundary** | Prisma (core) + Drizzle (modules) | Prisma for relational join-heavy tables (User, Role, Permission); Drizzle for performance-critical module tables (automation_*, website_*) |
| **DataLoader Scope** | Per-request, scoped to companyId | Per-request isolation prevents cross-tenant leakage; scoped to companyId for multi-tenant batching correctness |
| **Subscriptions** | graphql-ws (WebSocket) | Modern standard protocol; replaces deprecated subscriptions-transport-ws; native NestJS integration |
| **Query Limits** | Complexity scoring (prod=100, dev=1000) | Prevents expensive nested queries; graphql-query-complexity provides field-level cost estimation |
| **Federation** | Monolith with federation-ready types | Single process today; @Directive(@key) + Node interface enable migration to subgraphs without breaking clients |
| **Error Handling** | GraphQL errors with typed extensions | Code-based error extensions (UNAUTHENTICATED, FORBIDDEN, QUERY_COMPLEXITY_EXCEEDED) for client parsing |
| **Caching** | DataLoader batching only | No response caching at GraphQL layer (query result varies per user role); DataLoader handles field-level batching |

---

## Grid System

### **1. DataGrid** — Entity/Record Management

**Purpose:** CRUD operations on business entities with field-level masking and soft deletes

**Types:**
- `EntityType` — entity definition (name, label, fields[])
- `EntityFieldType` — field metadata (type, validation, selectOptions)
- `EntityRecordType` — record data (id, entityId, data: JSON, visibility)
- `EntityViewType` — saved views (filters, sorts, layout)

**Queries:**
```graphql
entities(pagination, model?, status?): [EntityType]
entity(id): EntityType
entityRecords(entityId, pagination, filters?): Paginated(EntityRecordType)
entityRecord(entityId, recordId): EntityRecordType
```

**Mutations:**
```graphql
createEntity(input): EntityType
updateEntity(id, input): EntityType
deleteEntity(id): Boolean
createEntityRecord(entityId, input): EntityRecordType
updateEntityRecord(entityId, recordId, input): EntityRecordType
deleteEntityRecord(recordId): Boolean
deleteEntityRecords(recordIds): [EntityRecordType]
```

**RBAC Permissions:**
- `base.entities.read` — query entities
- `base.entities.create` — create entities
- `base.entities.update` — update entities
- `base.entities.delete` — delete entities
- `base.entity_records.read` — query records
- `base.entity_records.create` — create records
- `base.entity_records.update` — update records
- `base.entity_records.delete` — delete records

**Field-Level Masking:**
- Post-fetch filtering via `EntityFieldPermission` (canRead, canWrite)
- Records exclude fields where `canRead = false` for non-admin users
- Mutations enforce `canWrite = false` fields are rejected with FORBIDDEN

---

### **2. PolicyGrid** — RBAC/ABAC Governance

**Purpose:** Manage roles, permissions, field-level access, and row-level data policies

**Types:**
- `RoleType` — role (id, name, displayName, isSystem, permissions[], fieldPermissions[])
- `PermissionType` — permission (id, name, category, isActive) — read-only (system-defined)
- `FieldPermissionType` — field-level access (fieldId, roleId, canRead, canWrite)
- `RecordRuleType` — row-level policy (modelName, action, domain filter, groups/users, sequence)

**Queries:**
```graphql
roles(pagination?, status?): [RoleType]
role(id): RoleType
permissions(pagination?, category?): [PermissionType]
fieldPermissions(fieldId?, roleId?, pagination?): [FieldPermissionType]
recordRules(modelName?, pagination?): [RecordRuleType]
```

**Mutations:**
```graphql
createRole(input): RoleType
updateRole(id, input): RoleType
deleteRole(id): Boolean
setFieldPermission(input): FieldPermissionType
removeFieldPermission(fieldId, roleId): Boolean
createRecordRule(name, modelName, action, domain, groups?, users?): RecordRuleType
updateRecordRule(id, input): RecordRuleType
deleteRecordRule(id): Boolean
reorderRecordRules(ruleIds): [RecordRuleType]
```

**RBAC Permissions:**
- `base.roles.read/create/update/delete`
- `base.field_permissions.read/write`
- `base.record_rules.read/create/update/delete`

---

### **3. FlowGrid** — Workflow Automation + Real-Time Events

**Purpose:** Automation workflows, visual flow builder, business rules, and real-time event streaming

**Types:**
- `WorkflowType` — state machine workflow (states[], transitions[], initialState, status)
- `FlowType` — visual flow diagram (nodes[], edges[], trigger type, status)
- `BusinessRuleType` — record-level automation (condition, action, priority)
- `FlowEventType` — real-time execution event (flowId, status, recordId, payload, executionTimeMs)

**Queries:**
```graphql
workflows(model?, status?, pagination?): Paginated(WorkflowType)
workflow(id): WorkflowType
flows(model?, trigger?, status?, pagination?): Paginated(FlowType)
flow(id): FlowType
recordRules(modelName?, pagination?): [RecordRuleType]
```

**Mutations:**
```graphql
createWorkflow(input): WorkflowType
updateWorkflow(id, input): WorkflowType
publishWorkflow(id): WorkflowType
deleteWorkflow(id): Boolean
triggerWorkflow(input: TriggerWorkflowInput): Boolean
createFlow(input): FlowType
updateFlow(id, input): FlowType
publishFlow(id): FlowType
deleteFlow(id): Boolean
```

**Subscriptions:**
```graphql
flowExecuted: FlowEventType  # Workflow completed
flowFailed: FlowEventType    # Workflow error
flowProgress: FlowEventType  # Step-level progress
```

**RBAC Permissions:**
- `base.workflows.read/create/update/delete/publish/execute`
- `base.flows.read/create/update/delete/publish`

**Multi-Tenant Filtering:**
- Subscriptions filtered by `ctx.user?.company_id == event.companyId`
- Only authenticated users of same tenant receive events

---

### **4. AgentGrid** — AI-Native Querying

**Purpose:** Natural language → GraphQL translation via LLM for non-technical users

**Types:**
- `AgentQueryResultType` — query result (answer, graphqlQuery, records, confidence, executionTimeMs)
- `SchemaContextType` — LLM prompt context (entities[], buildTime, prompt)
- `EntityContextType` — entity metadata for LLM (name, label, fields[], aiMetadata)

**Queries:**
```graphql
schemaContext(entityName?): SchemaContextType
```

**Mutations:**
```graphql
askQuery(input: AskQueryInput): AgentQueryResultType
```

**Input:**
```graphql
input AskQueryInput {
  question: String!
  entityName: String
  temperature: Float  # Default 0.1 for determinism
}
```

**Result:**
```graphql
type AgentQueryResultType {
  answer: String!
  graphqlQuery: String        # Generated query
  records: JSON               # Execution result
  confidence: Float           # 0-1 score
  executionTimeMs: Int
  errorMessage: String
  suggestion: String
}
```

**Services:**
- `SchemaContextService` — builds LLM prompt from MetadataRegistry (respects aiMetadata.sensitiveFields for PII filtering)
- `NlToGraphqlService` — LLM translation via AIAdapterService (temperature=0.1 for determinism, confidence scoring)

---

## Security Model

### **Authentication**

**Mechanism:** JWT (HS256)  
**Claim Fields:**
- `sub` — user ID (int)
- `email` — user email
- `role_id` — role ID (int)
- `role_name` — role name (string) for fast path
- `company_id` — tenant ID for JWT fallback

**Guard:** `GqlJwtGuard` extends `JwtAuthGuard`
- Overrides `getRequest()` to extract from `GqlExecutionContext`
- Validates token signature + expiration
- Returns `UNAUTHENTICATED` error (not HTTP 401) for invalid tokens

**WebSocket Auth:**
- Token passed in `connection_params.authorization`
- Validated on `onConnect` hook
- Rejected with error message if missing in production

### **Authorization (RBAC)**

**Guard:** `GqlRbacGuard` implements `CanActivate`
- Reads `@Permissions('base.entities.read')` metadata via Reflector
- Admin/super_admin roles bypass permission checks
- Others require explicit permission check via `rbacService.hasPermission(userId, permissionName)`
- Returns `FORBIDDEN` error if permission missing

**Permission Format:** `module.resource.action` (e.g., `base.entities.read`)

### **Field-Level RBAC (Masking)**

**Mechanism:** `EntityFieldPermission` model (fieldId, roleId, canRead, canWrite)

**Read Masking:**
- Post-fetch filtering in resolvers
- EntityRecord.data excludes fields where `canRead = false`

**Write Masking:**
- Mutation validation
- Rejects updates to fields where `canWrite = false` with FORBIDDEN

### **Multi-Tenant Isolation**

**Scope:** `companyId` from two sources (priority order):
1. `x-org-id` header (HTTP requests)
2. JWT `company_id` claim (fallback)

**Enforcement:**
- Mutations throw `ForbiddenException('Company ID required')` if missing
- Queries use companyId for row-level filtering in service layer
- Subscriptions filtered by matching `event.companyId == ctx.user?.company_id`

---

## Performance Strategy

### **DataLoader (N+1 Prevention)**

**Registry:** Per-request, instantiated in context factory

**5 Batch Loaders:**

1. **userById:** Prisma `findMany` batching User ids → single query
2. **roleById:** Prisma `findMany` batching Role ids → single query
3. **entityById:** Prisma `findMany` with deletedAt filter
4. **entityFieldsByEntityId:** Groups EntityField[] by entityId (return arrays)
5. **workflowById:** Drizzle `inArray()` batching automationWorkflows

**Usage Pattern:**
```typescript
// Field resolver
@ResolveField('fields', () => [EntityFieldType])
async fields(@Parent() entity: EntityType, @Context() ctx: GqlContext) {
  // 10 entities → 1 batch query, not 10 queries
  return ctx.loaders.entityFieldsByEntityId.load(entity.id);
}
```

### **Query Complexity Limits**

**ComplexityPlugin** via graphql-query-complexity:
- Production: max 100 points
- Development: max 1000 points
- Point formula:
  - Simple field: 1 point
  - JSON field (data): 5 points
  - Nested type: 2 points per level

**Error:** `QUERY_COMPLEXITY_EXCEEDED` (before execution)

### **Execution Caching**

- **No response caching** at GraphQL layer (query result per user role)
- DataLoader provides field-level caching within single request
- Database query caching via Prisma query cache (if configured)

---

## Real-Time & Subscriptions

### **Transport:** graphql-ws (WebSocket)

**Endpoint:** `WS /api/v2/graphql`

**Lifecycle:**
1. Client connects with `connection_params.authorization`
2. Server validates JWT on `onConnect`
3. Client sends `subscription { flowExecuted { ... } }`
4. Server filters events by `companyId == ctx.user?.company_id`
5. Client receives matching FlowEventType objects in real-time

### **Event Bridging**

**Architecture:** EventBusService → PubSub → WebSocket clients

**Pattern:**
```typescript
// In FlowSubscriptionResolver
constructor(@Inject('PubSub') private pubSub: PubSub) {
  // TODO: Subscribe to EventBusService.on(BuiltInEvents.WORKFLOW_COMPLETED)
  // Publish via: pubSub.publish('flowExecuted', { flowExecuted: {...} })
}

@Subscription(() => FlowEventType, {
  filter: (payload, _, ctx) => payload.flowExecuted.companyId === ctx.user?.company_id
})
flowExecuted() {
  return this.pubSub.asyncIterableIterator(['flowExecuted']);
}
```

### **Subscriptions** (3 channels)

1. **flowExecuted** — Workflow completed successfully
2. **flowFailed** — Workflow error with errorMessage
3. **flowProgress** — Step-level progress (executionTimeMs per step)

---

## Observability

### **TracingPlugin (OpenTelemetry)**

**Spans:**
- Root span per operation with attributes:
  - `graphql.operation.name` — operation name
  - `graphql.operation.type` — "query" | "mutation" | "subscription"
  - `tenant.company_id` — multi-tenant context
  - `user.id` — user performing query
  - `http.client_ip` — client IP for audit

- Child spans per field with N+1 detection:
  - `graphql.field.name` — field name
  - `graphql.field.type` — parent type name
  - `graphql.field.return_type` — return type
  - Multiple field spans → single DB query = normal batching

**Export:** To configured OpenTelemetry backend (Jaeger, Datadog, etc.)

### **ComplexityPlugin**

**Calculation:** Before execution  
**Error Code:** `QUERY_COMPLEXITY_EXCEEDED`  
**Message Format:** `"Query too complex: X/Y. Simplify your query."`

### **LoggingPlugin (Structured JSON)**

**Log Levels:**
- DEBUG: Successful operations
- WARN: Errors or slow queries (>500ms)
- ERROR: Unrecoverable errors with stack trace

**Log Fields:**
- operationName, operationType
- durationMs, errorCount
- queryComplexity
- userId, companyId
- authenticatedUser (boolean)
- httpStatus
- variableCount
- errors[] with message, code, path

---

## Directory Structure

```
src/graphql/
├── graphql.module.ts              # Root module wiring all grids
├── graphql.config.ts              # Apollo config + plugins
├── graphql.context.ts             # Per-request context factory
│
├── scalars/                        # Custom GraphQL scalars
│   ├── date-time.scalar.ts        # DateTime ISO-8601
│   ├── json.scalar.ts             # JSON (for data fields)
│   └── scalars.module.ts
│
├── shared/
│   ├── interfaces/
│   │   ├── node.interface.ts      # Federation-ready Node (id: ID!)
│   │   └── auditable.interface.ts # Timestamps (createdAt, updatedAt, deletedAt?)
│   ├── inputs/
│   │   ├── pagination.input.ts    # page, limit, sortBy, sortOrder
│   │   └── filter.input.ts        # [field, operator, value] domain filters
│   └── types/
│       ├── paginated.type.ts      # Generic Paginated<T>
│       └── mutation-result.type.ts
│
├── guards/
│   ├── gql-jwt.guard.ts           # JWT authentication
│   ├── gql-rbac.guard.ts          # RBAC permission checks
│   └── guards.module.ts
│
├── decorators/
│   ├── gql-current-user.decorator.ts     # @GqlCurrentUser() → JwtPayload
│   ├── gql-tenant.decorator.ts           # @GqlTenant() → companyId
│   └── complexity.decorator.ts           # @Complexity(n) for cost tracking
│
├── dataloader/
│   ├── dataloader.registry.ts     # 5 batch loaders + per-request scope
│   └── dataloader.module.ts
│
├── plugins/
│   ├── tracing.plugin.ts          # OpenTelemetry spans
│   ├── complexity.plugin.ts       # Query cost enforcement
│   ├── logging.plugin.ts          # Structured JSON logs
│   └── plugins.module.ts
│
├── grids/
│   ├── data-grid/
│   │   ├── types/
│   │   │   ├── entity.type.ts
│   │   │   ├── entity-field.type.ts
│   │   │   ├── entity-record.type.ts
│   │   │   └── entity-view.type.ts
│   │   ├── inputs/
│   │   │   ├── create-entity.input.ts
│   │   │   ├── update-entity.input.ts
│   │   │   ├── create-record.input.ts
│   │   │   └── update-record.input.ts
│   │   ├── resolvers/
│   │   │   ├── entity.resolver.ts
│   │   │   └── entity-record.resolver.ts
│   │   └── data-grid.module.ts
│   │
│   ├── policy-grid/
│   │   ├── types/
│   │   │   ├── role.type.ts
│   │   │   ├── permission.type.ts
│   │   │   ├── field-permission.type.ts
│   │   │   └── record-rule.type.ts
│   │   ├── inputs/
│   │   │   ├── create-role.input.ts
│   │   │   ├── assign-permission.input.ts
│   │   │   └── set-field-permission.input.ts
│   │   ├── resolvers/
│   │   │   ├── role.resolver.ts
│   │   │   ├── permission.resolver.ts
│   │   │   ├── field-permission.resolver.ts
│   │   │   └── record-rule.resolver.ts
│   │   └── policy-grid.module.ts
│   │
│   ├── flow-grid/
│   │   ├── types/
│   │   │   ├── workflow.type.ts
│   │   │   ├── flow.type.ts
│   │   │   ├── business-rule.type.ts
│   │   │   └── flow-event.type.ts
│   │   ├── inputs/
│   │   │   ├── create-workflow.input.ts
│   │   │   ├── update-workflow.input.ts
│   │   │   ├── create-flow.input.ts
│   │   │   ├── update-flow.input.ts
│   │   │   └── trigger-workflow.input.ts
│   │   ├── resolvers/
│   │   │   ├── workflow.resolver.ts
│   │   │   ├── flow.resolver.ts
│   │   │   └── flow-subscription.resolver.ts
│   │   └── flow-grid.module.ts
│   │
│   └── agent-grid/
│       ├── types/
│       │   ├── agent-query-result.type.ts
│       │   └── schema-context.type.ts
│       ├── inputs/
│       │   └── ask-query.input.ts
│       ├── services/
│       │   ├── schema-context.service.ts
│       │   └── nl-to-graphql.service.ts
│       ├── resolvers/
│       │   └── agent-query.resolver.ts
│       └── agent-grid.module.ts
│
└── schema/
    ├── schema-export.service.ts   # SDL, introspection, markdown docs
    ├── schema.controller.ts       # REST endpoints for schema export
    └── schema.module.ts
```

---

## Data Flow

### **Query Execution**

```
1. Client sends HTTP POST to /api/v2/graphql with:
   - Authorization: Bearer JWT
   - x-org-id: companyId (optional, falls back to JWT claim)
   - Query: { entities { id name } }

2. Apollo Server calls RequestDidResolveOperation hook
   - TracingPlugin: create root span with operation metadata

3. ExecutionPhase: Query validation + planning
   - GqlJwtGuard: validate JWT, extract user context
   - GqlRbacGuard: check @Permissions decorator
   - ComplexityPlugin: calculate query complexity, reject if over limit

4. FieldResolution: resolve fields depth-first
   - @ResolveField methods call DataLoaders
   - entityFieldsByEntityId.load(id) batches 10 entities → 1 query
   - LoggingPlugin: record start time

5. FieldMasking: apply RBAC filtering
   - EntityRecordResolver: exclude fields where EntityFieldPermission.canRead=false
   - Post-fetch filtering per record

6. ResponseFormat: serialize result
   - JSON scalars converted to objects (not stringified)
   - Timestamps as ISO-8601 strings

7. Hooks: RequestCompleted
   - TracingPlugin: close root span, record execution_time_ms + success
   - LoggingPlugin: structured log with duration, error count, complexity
   - ComplexityPlugin: warn if complexity > 80% of limit

8. HTTP Response: 200 OK with { data: {...}, errors?: [...] }
```

### **Mutation Execution**

```
Same as Query but additionally:

- CompanyId validation: throw ForbiddenException if missing
- Service delegation: call RecordService, EntityService, etc.
- Soft delete: set deletedAt timestamp (not remove rows)
- Audit logging: log user, action, timestamp via EventBusService
- Event publishing: trigger flowExecuted for automation workflows
```

### **Subscription Execution**

```
1. WebSocket connect with { connection_params: { authorization: jwt } }
2. GqlJwtGuard: validate token on onConnect hook
3. Client sends: subscription { flowExecuted { id flowName status } }
4. FlowSubscriptionResolver.flowExecuted()
   - Return pubSub.asyncIterableIterator(['flowExecuted'])
   - Filter applied: only events where companyId == ctx.user?.company_id
5. EventBusService publishes BuiltInEvents.WORKFLOW_COMPLETED
6. PubSub.publish('flowExecuted', { flowExecuted: {...} })
7. Matching subscriptions receive FlowEventType in real-time
```

---

## Integration Points

### **Pending Service Integrations**

Each resolver has TODO comments for business logic delegation:

| Component | Service | Status |
|-----------|---------|--------|
| EntityResolver | EntityService.listEntities() | Pending |
| EntityRecordResolver | RecordService.listRecords() | Pending |
| FieldPermissionResolver | FieldPermissionService | Pending |
| RoleResolver | RbacService.listRoles() | Pending |
| WorkflowResolver | AutomationService.listWorkflows() | Pending |
| FlowSubscriptionResolver | EventBusService.on() → PubSub.publish() | Pending |
| SchemaContextService | MetadataRegistryService.listEntities() | Pending |
| NlToGraphqlService | AIAdapterService.complete() | Pending |
| ComplexityPlugin | getComplexity() calculation | Pending |
| TracingPlugin | @opentelemetry/api tracer | Pending |

### **Next Steps**

1. **Service Integration:** Wire resolvers to business logic services
2. **Error Handling:** Implement custom error classes with GraphQL extension codes
3. **Caching Strategy:** Evaluate Redis for DataLoader batching across requests (if needed)
4. **Performance Testing:** Load test with k6 (existing suite) on GraphQL endpoint
5. **Client Code Generation:** Use `@graphql-codegen` with exported SDL
6. **API Documentation:** Host /docs endpoint with markdown + OpenAPI conversion
7. **Federation Migration:** Plan subgraph split when monolith scales

---

## References

- **Plan Document:** `/opt/Lume/CLAUDE.md` - Execution plan (9 phases)
- **GraphQL Schema:** Auto-generated at build time (introspection available)
- **API Documentation:** `GET /api/v2/graphql/docs` (markdown)
- **Client Examples:** `GET /api/v2/graphql/examples` (GraphQL examples)
