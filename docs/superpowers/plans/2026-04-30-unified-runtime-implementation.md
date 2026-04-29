# Unified Metadata-Driven Platform Runtime — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Lume from a modular backend into a complete application builder platform with zero-code app generation, unified runtime, and full extensibility.

**Architecture:** 
- Metadata Registry (Redis-backed) as single source of truth
- Interceptor Pipeline (8 ordered stages) for all operations
- Event Bus (BullMQ) for async workflows and agents
- Framework-agnostic core with NestJS-aligned wrappers
- Hybrid ORM (Prisma + Drizzle) with dynamic selector

**Tech Stack:** 
- NestJS, Express.js (existing)
- TypeScript
- Prisma + Drizzle (ORM)
- Redis (caching)
- BullMQ (job queue)
- Vue 3 + Ant Design Vue (frontend)
- Jest + ESM (testing)

---

## File Structure

### Core Runtime (`backend/src/core/runtime/`)
```
backend/src/core/
├─ runtime/
│  ├─ runtime.ts                 # Main Runtime class, execute() entry point
│  ├─ registry.ts                # MetadataRegistry (in-memory + Redis)
│  ├─ interceptor-pipeline.ts    # InterceptorPipeline orchestration
│  ├─ execution-context.ts       # ExecutionContext interface + loader
│  ├─ interceptors/
│  │  ├─ auth.interceptor.ts
│  │  ├─ permission.interceptor.ts
│  │  ├─ schema.interceptor.ts
│  │  ├─ pre-hooks.interceptor.ts
│  │  ├─ orm-selector.interceptor.ts
│  │  ├─ query-executor.interceptor.ts
│  │  ├─ post-hooks.interceptor.ts
│  │  └─ event-emitter.interceptor.ts
│  └─ types.ts                   # Core interfaces (EntityDefinition, OperationRequest, etc)
├─ permissions/
│  ├─ policy-engine.ts           # PolicyEngine for RBAC/ABAC evaluation
│  ├─ evaluator.ts               # Expression evaluator (safe conditions)
│  └─ types.ts                   # Permission types
├─ cache/
│  ├─ redis-cache.ts             # RedisCache wrapper with TTL
│  └─ types.ts                   # Cache types
├─ db/
│  ├─ adapters/
│  │  ├─ orm-adapter.interface.ts # IOrmAdapter interface
│  │  ├─ prisma-adapter.ts       # PrismaAdapter (existing, refactored)
│  │  └─ drizzle-adapter.ts      # DrizzleAdapter (existing, refactored)
│  ├─ schema-generator.ts        # Generate Drizzle schemas from EntityDefinition
│  └─ types.ts                   # Database types
└─ utils/
   └─ logger.ts                  # Execution logger for debugging
```

### Entities & Domains (`backend/src/domains/`)
```
backend/src/domains/
├─ entity/
│  ├─ entity.builder.ts          # defineEntity(), defineField() APIs
│  ├─ entity-store.ts            # EntityDefinitionStore (register, retrieve)
│  └─ types.ts                   # EntityDefinition, FieldDefinition, etc
├─ workflow/
│  ├─ workflow-executor.ts       # Execute workflows (sync + async)
│  ├─ workflow-store.ts          # WorkflowDefinitionStore
│  └─ types.ts                   # WorkflowDefinition types
├─ agent/
│  ├─ agent-executor.ts          # Execute agents (scheduled + event-triggered)
│  ├─ agent-store.ts             # AgentDefinitionStore
│  ├─ trigger-evaluator.ts       # Evaluate agent trigger conditions
│  └─ types.ts                   # AgentDefinition types
├─ view/
│  ├─ view-generator.ts          # Auto-generate Table, Form, Kanban, Calendar, Timeline views
│  ├─ view-store.ts              # ViewDefinitionStore
│  └─ types.ts                   # ViewDefinition types
└─ template/
   ├─ template-store.ts          # Domain templates (Ticket, Project, CRM, etc)
   ├─ ticket-template.ts         # Ticket domain template
   └─ types.ts                   # DomainTemplate types
```

### API Routes (`backend/src/api/`)
```
backend/src/api/
├─ crud.routes.ts                # Auto-generated CRUD endpoints
├─ view.routes.ts                # View-specific endpoints (kanban, calendar, etc)
├─ entity.routes.ts              # Entity metadata endpoints
├─ workflow.routes.ts            # Workflow definition endpoints
├─ agent.routes.ts               # Agent definition endpoints
└─ middleware/
   └─ runtime.middleware.ts       # Load Runtime into request
```

### Frontend (`frontend/apps/web-lume/src/`)
```
frontend/apps/web-lume/src/
├─ components/
│  ├─ DataGrid.vue               # Generic table/grid component
│  ├─ EntityForm.vue             # Generic form component
│  ├─ KanbanBoard.vue            # Generic kanban component
│  ├─ CalendarView.vue           # Generic calendar component
│  ├─ TimelineView.vue           # Generic timeline component
│  └─ ViewSelector.vue           # Switch between views
├─ views/
│  └─ EntityListView.vue         # Generic entity list view (orchestrates components)
├─ composables/
│  ├─ useRuntime.ts              # Runtime client wrapper
│  ├─ useEntity.ts               # Entity CRUD helper
│  └─ usePermissions.ts          # Permission checking helper
├─ utils/
│  ├─ form-renderer.ts           # Render form from entity fields
│  ├─ grid-renderer.ts           # Render grid columns from entity fields
│  └─ view-helper.ts             # Map view type to component
└─ types.ts                      # Frontend types (align with backend)
```

### Tests (`backend/tests/`)
```
backend/tests/
├─ unit/
│  ├─ runtime.test.ts
│  ├─ registry.test.ts
│  ├─ interceptor-pipeline.test.ts
│  ├─ permission-engine.test.ts
│  ├─ policy-evaluator.test.ts
│  ├─ entity-builder.test.ts
│  ├─ workflow-executor.test.ts
│  ├─ agent-executor.test.ts
│  ├─ view-generator.test.ts
│  └─ schema-generator.test.ts
├─ integration/
│  ├─ runtime-full-flow.test.ts
│  ├─ entity-api.test.ts
│  ├─ permission-enforcement.test.ts
│  ├─ workflow-execution.test.ts
│  ├─ agent-execution.test.ts
│  └─ ticket-example.test.ts
└─ fixtures/
   └─ test-entities.ts
```

---

## Phase 1: Core Runtime Foundation (Weeks 1-2)

### Task 1: Create Core Runtime Types & Interfaces

**Files:**
- Create: `backend/src/core/runtime/types.ts`
- Create: `backend/src/core/runtime/execution-context.ts`
- Create: `backend/src/core/permissions/types.ts`
- Create: `backend/src/core/db/adapters/orm-adapter.interface.ts`

- [ ] **Step 1: Write types.ts with all core interfaces**

```typescript
// backend/src/core/runtime/types.ts

export interface ExecutionContext {
  userId: string
  orgId: string
  roles: string[]
  permissions: string[]
  locale?: string
  timezone?: string
}

export interface OperationRequest {
  context: ExecutionContext
  entity: string
  action: string
  data?: Record<string, any>
  options?: {
    skipPermissions?: boolean
    includeRelations?: string[]
    returnFormat?: 'json' | 'raw'
  }
}

export interface OperationResult {
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

export interface ValidationError {
  field?: string
  message: string
  code?: string
}

export interface PermissionCheck {
  check: string
  allowed: boolean
  reason?: string
}

export interface EntityDefinition {
  id: string
  slug: string
  name: string
  label: string
  description?: string
  icon?: string
  color?: string
  orm: 'prisma' | 'drizzle'
  tableName: string
  fields: FieldDefinition[]
  relations: RelationDefinition[]
  hooks?: {
    beforeCreate?: Array<(record: any, ctx: any) => Promise<void>>
    afterCreate?: Array<(record: any, ctx: any) => Promise<void>>
    beforeUpdate?: Array<(record: any, ctx: any) => Promise<void>>
    afterUpdate?: Array<(record: any, ctx: any) => Promise<void>>
    beforeDelete?: Array<(record: any, ctx: any) => Promise<void>>
    afterDelete?: Array<(record: any, ctx: any) => Promise<void>>
  }
  workflows?: {
    onCreate?: string[]
    onUpdate?: string[]
    onDelete?: string[]
  }
  agents?: AgentDefinition[]
  permissions?: PermissionPolicy[]
  views?: ViewDefinition[]
  softDelete?: boolean
  auditable?: boolean
}

export interface FieldDefinition {
  id: string
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'datetime' | 'boolean' | 'select' | 'relation' | 'rich-text'
  required: boolean
  unique?: boolean
  indexed?: boolean
  defaultValue?: any
  validation?: ValidationRule[]
  computed?: boolean
  computed_expression?: string
}

export interface RelationDefinition {
  name: string
  target: string
  type: 'many-to-one' | 'one-to-many' | 'many-to-many'
  required?: boolean
}

export interface ValidationRule {
  rule: string
  value?: any
}

export interface PermissionPolicy {
  resource: string
  action: string
  rule?: string
  scope?: 'return records matching condition'
  fieldLevel?: Record<string, string>
  allow?: boolean
}

export interface PermissionRequest {
  user: ExecutionContext
  resource: string
  action: string
  data?: any
  scope?: 'query' | 'field'
}

export interface PermissionResult {
  allowed: boolean
  reason?: string
  filters?: any[]
  fieldFilters?: Record<string, boolean>
}

export interface AgentDefinition {
  id: string
  trigger: string
  schedule?: string
  action: {
    type: 'escalate' | 'workflow' | 'mutate'
    updates?: Record<string, any>
    workflowId?: string
    notify?: string | string[]
  }
}

export interface ViewDefinition {
  id: string
  type: 'table' | 'form' | 'kanban' | 'calendar' | 'timeline'
  label: string
  columns?: string[]
  filters?: string[]
  groupBy?: string
  dateField?: string
  defaultSort?: { field: string; order: 'asc' | 'desc' }
}

export interface WorkflowDefinition {
  id: string
  trigger: string
  name: string
  steps: WorkflowStep[]
  errorHandler?: {
    type: 'retry' | 'skip' | 'fail'
    maxAttempts?: number
    backoffMs?: number
  }
  status: 'active' | 'inactive'
}

export interface WorkflowStep {
  id: string
  type: 'if' | 'send_email' | 'send_notification' | 'workflow' | 'mutate' | 'wait' | 'log'
  condition?: any
  [key: string]: any
}
```

- [ ] **Step 2: Write execution-context.ts with context extraction**

```typescript
// backend/src/core/runtime/execution-context.ts

import { ExecutionContext } from './types'

export class ContextLoader {
  async loadFromRequest(req: any): Promise<ExecutionContext> {
    const userId = req.user?.id
    const orgId = req.headers['x-org-id'] || req.user?.orgId
    const roles = req.user?.roles || []
    const permissions = req.user?.permissions || []

    if (!userId || !orgId) {
      throw new Error('Missing user context: userId or orgId')
    }

    return {
      userId,
      orgId,
      roles,
      permissions,
      locale: req.headers['accept-language']?.split(',')[0],
      timezone: req.user?.timezone
    }
  }

  async loadFromToken(token: string, jwtService: any): Promise<ExecutionContext> {
    const decoded = jwtService.verify(token)
    return {
      userId: decoded.sub,
      orgId: decoded.orgId,
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
      locale: decoded.locale,
      timezone: decoded.timezone
    }
  }
}
```

- [ ] **Step 3: Write permission types**

```typescript
// backend/src/core/permissions/types.ts

export interface PolicyEngine {
  evaluate(request: PermissionRequest): Promise<PermissionResult>
  hasPermission(user: ExecutionContext, resource: string, action: string): Promise<boolean>
  compilePolicy(policy: PermissionPolicy, context: ExecutionContext): CompiledPolicy
}

export interface CompiledPolicy {
  allowed: boolean
  filters: any[]
  fieldFilters: Record<string, boolean>
}

export interface PermissionRequest {
  user: ExecutionContext
  resource: string
  action: string
  data?: any
}

export interface PermissionResult {
  allowed: boolean
  reason?: string
  filters?: any[]
  fieldFilters?: Record<string, boolean>
}
```

- [ ] **Step 4: Write ORM adapter interface**

```typescript
// backend/src/core/db/adapters/orm-adapter.interface.ts

export interface IOrmAdapter {
  create(tableName: string, data: any): Promise<any>
  read(tableName: string, id: string): Promise<any>
  readMany(tableName: string, filters?: any[], options?: QueryOptions): Promise<any[]>
  update(tableName: string, id: string, data: any): Promise<any>
  delete(tableName: string, id: string): Promise<void>
  count(tableName: string, filters?: any[]): Promise<number>
  executeRaw(sql: string, params?: any[]): Promise<any>
}

export interface QueryOptions {
  limit?: number
  offset?: number
  orderBy?: { field: string; order: 'asc' | 'desc' }[]
  includeRelations?: string[]
  selectFields?: string[]
}
```

- [ ] **Step 5: Write test for types (smoke test)**

```typescript
// backend/tests/unit/types.test.ts

import { ExecutionContext, OperationRequest, EntityDefinition } from '../../../src/core/runtime/types'

describe('Core Types', () => {
  it('should create ExecutionContext', () => {
    const ctx: ExecutionContext = {
      userId: 'user1',
      orgId: 'org1',
      roles: ['admin'],
      permissions: ['ticket.create']
    }
    expect(ctx.userId).toBe('user1')
  })

  it('should create OperationRequest', () => {
    const req: OperationRequest = {
      context: {
        userId: 'user1',
        orgId: 'org1',
        roles: ['admin'],
        permissions: []
      },
      entity: 'ticket',
      action: 'create',
      data: { title: 'Test' }
    }
    expect(req.entity).toBe('ticket')
  })

  it('should create EntityDefinition', () => {
    const entity: EntityDefinition = {
      id: 'ticket',
      slug: 'ticket',
      name: 'Ticket',
      label: 'Support Ticket',
      orm: 'drizzle',
      tableName: 'tickets',
      fields: [],
      relations: []
    }
    expect(entity.slug).toBe('ticket')
  })
})
```

- [ ] **Step 6: Run test to verify types work**

```bash
cd /opt/Lume/backend
npm run test -- tests/unit/types.test.ts
```

Expected: PASS (types compile and smoke test passes)

- [ ] **Step 7: Commit types**

```bash
git add backend/src/core/runtime/types.ts backend/src/core/runtime/execution-context.ts backend/src/core/permissions/types.ts backend/src/core/db/adapters/orm-adapter.interface.ts backend/tests/unit/types.test.ts
git commit -m "feat: add core runtime types and interfaces

- ExecutionContext, OperationRequest, OperationResult
- EntityDefinition, FieldDefinition, RelationDefinition
- PermissionPolicy, PermissionRequest, PermissionResult
- AgentDefinition, ViewDefinition, WorkflowDefinition
- IOrmAdapter interface
- ContextLoader for extracting context from requests
- Smoke tests for all types"
```

---

### Task 2: Create Metadata Registry with Redis Backing

**Files:**
- Create: `backend/src/core/runtime/registry.ts`
- Create: `backend/src/core/cache/redis-cache.ts`
- Create: `backend/tests/unit/registry.test.ts`

- [ ] **Step 1: Write RedisCache wrapper**

```typescript
// backend/src/core/cache/redis-cache.ts

import { Injectable } from '@nestjs/common'
import { Redis } from 'ioredis'

@Injectable()
export class RedisCache {
  constructor(private redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key)
    return value ? JSON.parse(value) : null
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value))
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key)
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern)
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) > 0
  }

  async flush(): Promise<void> {
    await this.redis.flushdb()
  }
}
```

- [ ] **Step 2: Write MetadataRegistry**

```typescript
// backend/src/core/runtime/registry.ts

import { Injectable } from '@nestjs/common'
import { EntityDefinition, WorkflowDefinition, ViewDefinition, AgentDefinition, PermissionPolicy } from './types'
import { RedisCache } from '../cache/redis-cache.ts'

@Injectable()
export class MetadataRegistry {
  private entities: Map<string, EntityDefinition> = new Map()
  private workflows: Map<string, WorkflowDefinition> = new Map()
  private views: Map<string, ViewDefinition> = new Map()
  private agents: Map<string, AgentDefinition> = new Map()
  private permissions: Map<string, PermissionPolicy> = new Map()

  constructor(private cache: RedisCache) {}

  // Entity management
  async registerEntity(entity: EntityDefinition): Promise<void> {
    this.entities.set(entity.id, entity)
    await this.cache.set(`entity:${entity.id}`, entity, 3600) // 1 hour TTL
  }

  async getEntity(entityId: string): Promise<EntityDefinition | null> {
    // Try cache first
    let entity = await this.cache.get<EntityDefinition>(`entity:${entityId}`)
    if (entity) return entity

    // Fall back to memory
    entity = this.entities.get(entityId) || null
    if (entity) {
      await this.cache.set(`entity:${entityId}`, entity, 3600)
    }
    return entity
  }

  async listEntities(): Promise<EntityDefinition[]> {
    return Array.from(this.entities.values())
  }

  async unregisterEntity(entityId: string): Promise<void> {
    this.entities.delete(entityId)
    await this.cache.del(`entity:${entityId}`)
  }

  // Workflow management
  async registerWorkflow(workflow: WorkflowDefinition): Promise<void> {
    this.workflows.set(workflow.id, workflow)
    await this.cache.set(`workflow:${workflow.id}`, workflow, 1800) // 30 min TTL
  }

  async getWorkflow(workflowId: string): Promise<WorkflowDefinition | null> {
    let workflow = await this.cache.get<WorkflowDefinition>(`workflow:${workflowId}`)
    if (workflow) return workflow

    workflow = this.workflows.get(workflowId) || null
    if (workflow) {
      await this.cache.set(`workflow:${workflowId}`, workflow, 1800)
    }
    return workflow
  }

  async listWorkflows(): Promise<WorkflowDefinition[]> {
    return Array.from(this.workflows.values())
  }

  // Permission management
  async registerPermissions(entityId: string, policies: PermissionPolicy[]): Promise<void> {
    policies.forEach(policy => {
      const key = `${entityId}:${policy.action}`
      this.permissions.set(key, policy)
    })
    await this.cache.del(`policy:${entityId}:*`)
  }

  async getPermission(entityId: string, action: string): Promise<PermissionPolicy | null> {
    const key = `${entityId}:${action}`
    const policy = this.permissions.get(key) || null
    return policy
  }

  // Invalidation
  async invalidateEntity(entityId: string): Promise<void> {
    await this.cache.del(`entity:${entityId}`)
  }

  async invalidateWorkflow(workflowId: string): Promise<void> {
    await this.cache.del(`workflow:${workflowId}`)
  }

  async invalidatePermissions(entityId: string): Promise<void> {
    await this.cache.delPattern(`policy:${entityId}:*`)
  }

  // Debug: clear all
  async clear(): Promise<void> {
    this.entities.clear()
    this.workflows.clear()
    this.views.clear()
    this.agents.clear()
    this.permissions.clear()
    await this.cache.flush()
  }
}
```

- [ ] **Step 3: Write tests for registry**

```typescript
// backend/tests/unit/registry.test.ts

import { Test, TestingModule } from '@nestjs/testing'
import { MetadataRegistry } from '../../../src/core/runtime/registry'
import { RedisCache } from '../../../src/core/cache/redis-cache'
import { EntityDefinition } from '../../../src/core/runtime/types'

describe('MetadataRegistry', () => {
  let registry: MetadataRegistry
  let cache: RedisCache

  beforeEach(async () => {
    cache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delPattern: jest.fn(),
      exists: jest.fn(),
      flush: jest.fn()
    } as any

    registry = new MetadataRegistry(cache)
  })

  describe('registerEntity', () => {
    it('should register entity in memory and cache', async () => {
      const entity: EntityDefinition = {
        id: 'ticket',
        slug: 'ticket',
        name: 'Ticket',
        label: 'Support Ticket',
        orm: 'drizzle',
        tableName: 'tickets',
        fields: [],
        relations: []
      }

      await registry.registerEntity(entity)

      expect(await registry.getEntity('ticket')).toEqual(entity)
      expect(cache.set).toHaveBeenCalledWith('entity:ticket', entity, 3600)
    })
  })

  describe('getEntity', () => {
    it('should return null if entity not found', async () => {
      const result = await registry.getEntity('nonexistent')
      expect(result).toBeNull()
    })

    it('should return entity from cache if available', async () => {
      const entity: EntityDefinition = {
        id: 'ticket',
        slug: 'ticket',
        name: 'Ticket',
        label: 'Support Ticket',
        orm: 'drizzle',
        tableName: 'tickets',
        fields: [],
        relations: []
      }

      ;(cache.get as jest.Mock).mockResolvedValue(entity)

      const result = await registry.getEntity('ticket')
      expect(result).toEqual(entity)
    })
  })

  describe('listEntities', () => {
    it('should return all registered entities', async () => {
      const entity1: EntityDefinition = {
        id: 'ticket',
        slug: 'ticket',
        name: 'Ticket',
        label: 'Ticket',
        orm: 'drizzle',
        tableName: 'tickets',
        fields: [],
        relations: []
      }

      const entity2: EntityDefinition = {
        id: 'customer',
        slug: 'customer',
        name: 'Customer',
        label: 'Customer',
        orm: 'prisma',
        tableName: 'customers',
        fields: [],
        relations: []
      }

      await registry.registerEntity(entity1)
      await registry.registerEntity(entity2)

      const entities = await registry.listEntities()
      expect(entities).toHaveLength(2)
      expect(entities).toContainEqual(entity1)
      expect(entities).toContainEqual(entity2)
    })
  })

  describe('invalidateEntity', () => {
    it('should clear cache for entity', async () => {
      await registry.invalidateEntity('ticket')
      expect(cache.del).toHaveBeenCalledWith('entity:ticket')
    })
  })
})
```

- [ ] **Step 4: Run tests**

```bash
cd /opt/Lume/backend
npm run test -- tests/unit/registry.test.ts
```

Expected: PASS (all registry tests pass)

- [ ] **Step 5: Commit registry**

```bash
git add backend/src/core/cache/redis-cache.ts backend/src/core/runtime/registry.ts backend/tests/unit/registry.test.ts
git commit -m "feat: implement metadata registry with redis caching

- RedisCache wrapper for TTL-based caching
- MetadataRegistry for entities, workflows, permissions
- Separate cache layers for different TTLs (entities 1h, workflows 30m)
- Cache invalidation methods (del, delPattern)
- Full unit tests with mocked Redis"
```

---

### Task 3: Create Interceptor Pipeline Infrastructure

**Files:**
- Create: `backend/src/core/runtime/interceptor-pipeline.ts`
- Create: `backend/src/core/runtime/interceptor.interface.ts`
- Create: `backend/tests/unit/interceptor-pipeline.test.ts`

- [ ] **Step 1: Write Interceptor interface**

```typescript
// backend/src/core/runtime/interceptor.interface.ts

import { ExecutionContext, OperationRequest, OperationResult } from './types'

export interface Interceptor {
  name: string
  order: number
  enabled: boolean

  process(
    request: OperationRequest,
    context: InterceptorContext
  ): Promise<InterceptorResult>
}

export interface InterceptorContext {
  execution: ExecutionContext
  metadata: any
  previousResults: Map<string, any>
  abort: (error: Error) => void
}

export interface InterceptorResult {
  allowed: boolean
  reason?: string
  transformedRequest?: OperationRequest
  metadata?: Record<string, any>
}
```

- [ ] **Step 2: Write InterceptorPipeline orchestrator**

```typescript
// backend/src/core/runtime/interceptor-pipeline.ts

import { Injectable } from '@nestjs/common'
import { Interceptor, InterceptorContext, InterceptorResult } from './interceptor.interface'
import { OperationRequest, OperationResult } from './types'

@Injectable()
export class InterceptorPipeline {
  private interceptors: Interceptor[] = []
  private aborted = false
  private abortError: Error | null = null

  registerInterceptor(interceptor: Interceptor): void {
    this.interceptors.push(interceptor)
    // Sort by order
    this.interceptors.sort((a, b) => a.order - b.order)
  }

  async execute(request: OperationRequest): Promise<{ request: OperationRequest; results: Map<string, any> }> {
    const results = new Map<string, any>()
    this.aborted = false
    this.abortError = null

    const startTime = Date.now()
    let currentRequest = request

    for (const interceptor of this.interceptors) {
      if (!interceptor.enabled) continue

      const context: InterceptorContext = {
        execution: request.context,
        metadata: {},
        previousResults: results,
        abort: (error: Error) => {
          this.aborted = true
          this.abortError = error
        }
      }

      try {
        const result = await interceptor.process(currentRequest, context)

        if (result.transformedRequest) {
          currentRequest = result.transformedRequest
        }

        if (result.metadata) {
          results.set(interceptor.name, result.metadata)
        }

        if (!result.allowed) {
          this.aborted = true
          this.abortError = new Error(result.reason || `${interceptor.name} denied`)
          break
        }
      } catch (error) {
        this.aborted = true
        this.abortError = error as Error
        break
      }

      if (this.aborted) break
    }

    const duration = Date.now() - startTime

    return {
      request: currentRequest,
      results: new Map([
        ...results,
        ['duration', duration],
        ['aborted', this.aborted],
        ['error', this.abortError?.message || null]
      ])
    }
  }

  isAborted(): boolean {
    return this.aborted
  }

  getAbortError(): Error | null {
    return this.abortError
  }

  getInterceptors(): Interceptor[] {
    return this.interceptors.filter(i => i.enabled)
  }
}
```

- [ ] **Step 3: Write tests for pipeline**

```typescript
// backend/tests/unit/interceptor-pipeline.test.ts

import { InterceptorPipeline } from '../../../src/core/runtime/interceptor-pipeline'
import { Interceptor, InterceptorContext, InterceptorResult } from '../../../src/core/runtime/interceptor.interface'
import { OperationRequest } from '../../../src/core/runtime/types'

describe('InterceptorPipeline', () => {
  let pipeline: InterceptorPipeline
  let mockInterceptor1: Interceptor
  let mockInterceptor2: Interceptor

  beforeEach(() => {
    pipeline = new InterceptorPipeline()

    mockInterceptor1 = {
      name: 'First',
      order: 10,
      enabled: true,
      process: jest.fn(async () => ({ allowed: true }))
    }

    mockInterceptor2 = {
      name: 'Second',
      order: 20,
      enabled: true,
      process: jest.fn(async () => ({ allowed: true }))
    }
  })

  describe('registerInterceptor', () => {
    it('should register interceptors in order', () => {
      pipeline.registerInterceptor(mockInterceptor2)
      pipeline.registerInterceptor(mockInterceptor1)

      const interceptors = pipeline.getInterceptors()
      expect(interceptors[0].name).toBe('First')
      expect(interceptors[1].name).toBe('Second')
    })
  })

  describe('execute', () => {
    it('should execute all interceptors in order', async () => {
      pipeline.registerInterceptor(mockInterceptor1)
      pipeline.registerInterceptor(mockInterceptor2)

      const request: OperationRequest = {
        context: {
          userId: 'user1',
          orgId: 'org1',
          roles: [],
          permissions: []
        },
        entity: 'ticket',
        action: 'create'
      }

      const result = await pipeline.execute(request)

      expect(mockInterceptor1.process).toHaveBeenCalled()
      expect(mockInterceptor2.process).toHaveBeenCalled()
      expect(pipeline.isAborted()).toBe(false)
    })

    it('should stop on first rejection', async () => {
      mockInterceptor1 = {
        name: 'First',
        order: 10,
        enabled: true,
        process: jest.fn(async () => ({ allowed: false, reason: 'Denied' }))
      }

      pipeline.registerInterceptor(mockInterceptor1)
      pipeline.registerInterceptor(mockInterceptor2)

      const request: OperationRequest = {
        context: {
          userId: 'user1',
          orgId: 'org1',
          roles: [],
          permissions: []
        },
        entity: 'ticket',
        action: 'create'
      }

      await pipeline.execute(request)

      expect(mockInterceptor1.process).toHaveBeenCalled()
      expect(mockInterceptor2.process).not.toHaveBeenCalled()
      expect(pipeline.isAborted()).toBe(true)
    })

    it('should skip disabled interceptors', async () => {
      mockInterceptor1.enabled = false
      pipeline.registerInterceptor(mockInterceptor1)
      pipeline.registerInterceptor(mockInterceptor2)

      const request: OperationRequest = {
        context: {
          userId: 'user1',
          orgId: 'org1',
          roles: [],
          permissions: []
        },
        entity: 'ticket',
        action: 'create'
      }

      await pipeline.execute(request)

      expect(mockInterceptor1.process).not.toHaveBeenCalled()
      expect(mockInterceptor2.process).toHaveBeenCalled()
    })
  })
})
```

- [ ] **Step 4: Run tests**

```bash
cd /opt/Lume/backend
npm run test -- tests/unit/interceptor-pipeline.test.ts
```

Expected: PASS (all pipeline tests pass)

- [ ] **Step 5: Commit pipeline**

```bash
git add backend/src/core/runtime/interceptor.interface.ts backend/src/core/runtime/interceptor-pipeline.ts backend/tests/unit/interceptor-pipeline.test.ts
git commit -m "feat: implement interceptor pipeline infrastructure

- Interceptor interface with process() method
- InterceptorContext for sharing data between interceptors
- InterceptorPipeline orchestrates execution
- Ordered processing (by interceptor.order)
- Short-circuit abort on rejection or error
- Full unit tests"
```

---

### Task 4: Create Main Runtime Class

**Files:**
- Create: `backend/src/core/runtime/runtime.ts`
- Create: `backend/tests/unit/runtime.test.ts`

- [ ] **Step 1: Write main Runtime class**

```typescript
// backend/src/core/runtime/runtime.ts

import { Injectable } from '@nestjs/common'
import { MetadataRegistry } from './registry'
import { InterceptorPipeline } from './interceptor-pipeline'
import { OperationRequest, OperationResult } from './types'

@Injectable()
export class LumeRuntime {
  constructor(
    private registry: MetadataRegistry,
    private pipeline: InterceptorPipeline
  ) {}

  async execute(request: OperationRequest): Promise<OperationResult> {
    const startTime = Date.now()

    try {
      // Load entity metadata
      const entity = await this.registry.getEntity(request.entity)
      if (!entity) {
        return {
          success: false,
          errors: [{ message: `Entity ${request.entity} not found` }],
          metadata: {
            executedAt: new Date().toISOString(),
            duration: Date.now() - startTime,
            permissions: [],
            interceptorsRun: []
          }
        }
      }

      // Execute pipeline
      const { request: transformedRequest, results } = await this.pipeline.execute(request)

      // Check if pipeline aborted
      if (this.pipeline.isAborted()) {
        const error = this.pipeline.getAbortError()
        return {
          success: false,
          errors: [{ message: error?.message || 'Operation denied' }],
          metadata: {
            executedAt: new Date().toISOString(),
            duration: Date.now() - startTime,
            permissions: [],
            interceptorsRun: Array.from(results.keys())
          }
        }
      }

      // Extract execution result from pipeline
      const executionData = results.get('execution_result')

      return {
        success: true,
        data: executionData || transformedRequest.data,
        metadata: {
          executedAt: new Date().toISOString(),
          duration: results.get('duration') || Date.now() - startTime,
          permissions: results.get('permissions') || [],
          interceptorsRun: Array.from(results.keys()).filter(k => k !== 'duration' && k !== 'permissions')
        }
      }
    } catch (error: any) {
      return {
        success: false,
        errors: [{ message: error.message || 'Internal server error' }],
        metadata: {
          executedAt: new Date().toISOString(),
          duration: Date.now() - startTime,
          permissions: [],
          interceptorsRun: []
        }
      }
    }
  }

  getRegistry(): MetadataRegistry {
    return this.registry
  }

  getPipeline(): InterceptorPipeline {
    return this.pipeline
  }
}
```

- [ ] **Step 2: Write tests for Runtime**

```typescript
// backend/tests/unit/runtime.test.ts

import { Test } from '@nestjs/testing'
import { LumeRuntime } from '../../../src/core/runtime/runtime'
import { MetadataRegistry } from '../../../src/core/runtime/registry'
import { InterceptorPipeline } from '../../../src/core/runtime/interceptor-pipeline'
import { OperationRequest, EntityDefinition } from '../../../src/core/runtime/types'

describe('LumeRuntime', () => {
  let runtime: LumeRuntime
  let registry: MetadataRegistry
  let pipeline: InterceptorPipeline

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LumeRuntime,
        {
          provide: MetadataRegistry,
          useValue: {
            getEntity: jest.fn()
          }
        },
        {
          provide: InterceptorPipeline,
          useValue: {
            execute: jest.fn(),
            isAborted: jest.fn(),
            getAbortError: jest.fn()
          }
        }
      ]
    }).compile()

    runtime = module.get<LumeRuntime>(LumeRuntime)
    registry = module.get<MetadataRegistry>(MetadataRegistry)
    pipeline = module.get<InterceptorPipeline>(InterceptorPipeline)
  })

  describe('execute', () => {
    it('should return error if entity not found', async () => {
      ;(registry.getEntity as jest.Mock).mockResolvedValue(null)

      const request: OperationRequest = {
        context: {
          userId: 'user1',
          orgId: 'org1',
          roles: [],
          permissions: []
        },
        entity: 'nonexistent',
        action: 'read'
      }

      const result = await runtime.execute(request)

      expect(result.success).toBe(false)
      expect(result.errors?.[0].message).toContain('not found')
    })

    it('should execute pipeline for valid entity', async () => {
      const entity: EntityDefinition = {
        id: 'ticket',
        slug: 'ticket',
        name: 'Ticket',
        label: 'Ticket',
        orm: 'drizzle',
        tableName: 'tickets',
        fields: [],
        relations: []
      }

      ;(registry.getEntity as jest.Mock).mockResolvedValue(entity)
      ;(pipeline.execute as jest.Mock).mockResolvedValue({
        request: {},
        results: new Map([
          ['duration', 50],
          ['execution_result', { id: 'ticket_1' }]
        ])
      })
      ;(pipeline.isAborted as jest.Mock).mockReturnValue(false)

      const request: OperationRequest = {
        context: {
          userId: 'user1',
          orgId: 'org1',
          roles: [],
          permissions: []
        },
        entity: 'ticket',
        action: 'create'
      }

      const result = await runtime.execute(request)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ id: 'ticket_1' })
    })

    it('should return error if pipeline aborts', async () => {
      const entity: EntityDefinition = {
        id: 'ticket',
        slug: 'ticket',
        name: 'Ticket',
        label: 'Ticket',
        orm: 'drizzle',
        tableName: 'tickets',
        fields: [],
        relations: []
      }

      ;(registry.getEntity as jest.Mock).mockResolvedValue(entity)
      ;(pipeline.execute as jest.Mock).mockResolvedValue({
        request: {},
        results: new Map()
      })
      ;(pipeline.isAborted as jest.Mock).mockReturnValue(true)
      ;(pipeline.getAbortError as jest.Mock).mockReturnValue(new Error('Permission denied'))

      const request: OperationRequest = {
        context: {
          userId: 'user1',
          orgId: 'org1',
          roles: [],
          permissions: []
        },
        entity: 'ticket',
        action: 'create'
      }

      const result = await runtime.execute(request)

      expect(result.success).toBe(false)
      expect(result.errors?.[0].message).toContain('Permission denied')
    })
  })

  describe('getRegistry', () => {
    it('should return registry instance', () => {
      expect(runtime.getRegistry()).toBe(registry)
    })
  })

  describe('getPipeline', () => {
    it('should return pipeline instance', () => {
      expect(runtime.getPipeline()).toBe(pipeline)
    })
  })
})
```

- [ ] **Step 3: Run tests**

```bash
cd /opt/Lume/backend
npm run test -- tests/unit/runtime.test.ts
```

Expected: PASS (all runtime tests pass)

- [ ] **Step 4: Commit Runtime**

```bash
git add backend/src/core/runtime/runtime.ts backend/tests/unit/runtime.test.ts
git commit -m "feat: implement main LumeRuntime class

- Single execute() entry point for all operations
- Loads entity metadata from registry
- Orchestrates interceptor pipeline
- Returns OperationResult with metadata and timing
- Error handling for missing entities and aborted operations
- Full unit tests with mocked dependencies"
```

---

## Remaining Phases (Outline)

Due to token constraints, I'm providing a high-level outline of remaining phases. Full task breakdowns will be provided in next iteration.

### Phase 2: Entity & API Generation (Weeks 2-3)
- [ ] Entity definition APIs (defineEntity, defineField)
- [ ] CRUD endpoint generation (POST, GET, PUT, DELETE)
- [ ] Bulk operations (POST /bulk)
- [ ] Search endpoint (POST /search with full-text)
- [ ] Field metadata endpoint (GET /fields)
- [ ] View-specific endpoints (GET /views/:viewId)

### Phase 3: Permission System (Weeks 3-4)
- [ ] Permission policy engine (RBAC evaluation)
- [ ] ABAC evaluator (expression engine)
- [ ] Field-level permission enforcement
- [ ] Permission interceptor implementation
- [ ] Query filtering by permissions

### Phase 4: Workflow Engine (Weeks 4-5)
- [ ] Workflow definition storage
- [ ] Workflow executor (step-by-step)
- [ ] BullMQ integration for async execution
- [ ] Retry logic and error handling
- [ ] Event triggering (onCreate, onUpdate, onDelete)

### Phase 5: View System (Weeks 5-6)
- [ ] View generator (auto-generate Table, Form, Kanban, Calendar, Timeline)
- [ ] View definition storage
- [ ] View-specific query transformations
- [ ] Frontend components (DataGrid, EntityForm, KanbanBoard, CalendarView)

### Phase 6: Agent System (Weeks 6-7)
- [ ] Agent definition storage
- [ ] Trigger evaluation (expression engine)
- [ ] Scheduled job execution (cron)
- [ ] Event-triggered reactions
- [ ] Agent actions (escalate, mutate, workflow)

### Phase 7: Performance & Scaling (Weeks 7-8)
- [ ] Redis caching layer (metadata, permissions, computed fields)
- [ ] Query optimization (push filtering to SQL)
- [ ] Database indexes (auto-created)
- [ ] Pagination enforcement (max 100 per request)
- [ ] Monitoring and debugging tools

### Phase 8: Documentation & Validation (Weeks 8+)
- [ ] Update architecture documentation
- [ ] Write comprehensive test cases
- [ ] Create demo seed data (Ticket Management System)
- [ ] Integration testing (end-to-end flows)
- [ ] Code review and validation

---

## Success Criteria

**By end of Phase 1 (Week 2):**
- ✅ Core types, registry, pipeline, runtime implemented
- ✅ Runtime.execute() working end-to-end
- ✅ Metadata registry with Redis caching
- ✅ Basic error handling and logging

**By end of Phase 7 (Week 8):**
- ✅ Complete zero-code app generation
- ✅ All 8 parts of spec implemented
- ✅ Performance targets met (P95 < 300ms)
- ✅ 80% of use cases require zero code
- ✅ Full extensibility for remaining 20%

**By end of Phase 8 (Week 10):**
- ✅ Comprehensive documentation
- ✅ 100+ test cases (unit + integration)
- ✅ Demo seed data with Ticket Management example
- ✅ All systems validated end-to-end
- ✅ Code ready for production

---

**Implementation ready for execution via superpowers:subagent-driven-development or superpowers:executing-plans**

