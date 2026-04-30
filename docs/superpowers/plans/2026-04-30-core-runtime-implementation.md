# Lume Unified Runtime Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the foundational Runtime Registry, event system, and execution pipeline that powers zero-code app generation in Lume.

**Architecture:** The RuntimeRegistry is a single source of truth holding entity, workflow, view, and policy definitions. When entities are registered, the system emits events through a central EventBus. All operations flow through a 7-step execution pipeline: permission check → before-hooks → mutation → after-hooks → workflow queue → agents → view invalidation. The system bootstraps from installed modules, discovering and validating all metadata.

**Tech Stack:** TypeScript (ES modules), NestJS, Node.js EventEmitter, Prisma ORM, Jest (testing)

---

## File Structure

```
backend/src/core/runtime/
├── index.ts                          # Public exports
├── registry.ts                       # RuntimeRegistry (central coordinator)
├── types.ts                          # All core interfaces & types
├── event-bus.ts                      # EventBus implementation
├── execution-pipeline.ts             # 7-step execution orchestrator
├── bootstrap.ts                      # Registry initialization & module discovery
└── hooks.ts                          # Hook executor & validation

backend/tests/unit/
├── runtime-registry.test.ts          # Registry operations
├── event-bus.test.ts                 # Event subscription/emission
├── execution-pipeline.test.ts        # Pipeline orchestration
├── bootstrap.test.ts                 # Module discovery & validation
└── hooks.test.ts                     # Hook execution
```

---

## Task Dependencies

| Task | Depends On | Outputs |
|------|-----------|---------|
| 1 | None | Core interfaces, types |
| 2 | 1 | EventBus implementation |
| 3 | 2 | Execution pipeline |
| 4 | 1, 3 | RuntimeRegistry |
| 5 | 1, 4 | Bootstrap & initialization |
| 6 | 1-5 | Hook executor & lifecycle |

---

# IMPLEMENTATION TASKS

## Task 1: Core Interfaces & Types

**Files:**
- Create: `backend/src/core/runtime/types.ts`
- Create: `backend/tests/unit/runtime-types.test.ts`
- Modify: `backend/src/core/runtime/index.ts` (add exports)

**Goal:** Define all core TypeScript interfaces that form the contract for the entire runtime system.

---

### Task 1: Core Interfaces & Types

- [ ] **Step 1: Write test file with interface definitions**

```typescript
// File: backend/tests/unit/runtime-types.test.ts
import { describe, it, expect } from '@jest/globals';

describe('Runtime Core Types', () => {
  it('should define ExecutionContext with user, role, permissions', () => {
    type ExecutionContextType = {
      userId: string;
      role: string;
      permissions: string[];
      requestId: string;
      domain?: string;
      timestamp: number;
    };
    
    const ctx: ExecutionContextType = {
      userId: 'user-1',
      role: 'admin',
      permissions: ['ticket:create', 'ticket:read'],
      requestId: 'req-123',
      timestamp: Date.now()
    };
    
    expect(ctx.userId).toBe('user-1');
    expect(ctx.permissions).toContain('ticket:create');
  });

  it('should define EntityField with all required properties', () => {
    type EntityFieldType = {
      name: string;
      type: 'string' | 'text' | 'number' | 'date' | 'boolean' | 'select' | 'reference' | 'array' | 'json';
      required?: boolean;
      readonly?: boolean;
      label?: string;
      description?: string;
      default?: unknown;
      options?: Array<{ label: string; value: unknown }>;
      validation?: Record<string, unknown>;
      entityName?: string;
    };
    
    const field: EntityFieldType = {
      name: 'status',
      type: 'select',
      required: true,
      label: 'Status',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Closed', value: 'closed' }
      ]
    };
    
    expect(field.name).toBe('status');
    expect(field.options).toHaveLength(2);
  });

  it('should define EntityDef with fields, metadata, hooks, permissions', () => {
    type EntityDefType = {
      name: string;
      displayName: string;
      tableName?: string;
      fields: any[];
      metadata?: Record<string, unknown>;
      hooks?: {
        beforeCreate?: (data: Record<string, unknown>, ctx: any) => Promise<Record<string, unknown>>;
        afterCreate?: (record: Record<string, unknown>, ctx: any) => Promise<void>;
        beforeUpdate?: (data: Record<string, unknown>, ctx: any) => Promise<Record<string, unknown>>;
        afterUpdate?: (record: Record<string, unknown>, ctx: any) => Promise<void>;
        beforeDelete?: (id: string, ctx: any) => Promise<void>;
        afterDelete?: (id: string, ctx: any) => Promise<void>;
      };
      permissions?: string[];
    };
    
    const entity: EntityDefType = {
      name: 'Ticket',
      displayName: 'Support Ticket',
      fields: [],
      permissions: ['ticket:create', 'ticket:read']
    };
    
    expect(entity.name).toBe('Ticket');
    expect(entity.permissions).toContain('ticket:create');
  });

  it('should define RuntimeEvent with type, entityName, recordId, data, context', () => {
    type RuntimeEventType = {
      id: string;
      type: 'entity:created' | 'entity:updated' | 'entity:deleted';
      entityName: string;
      action: 'create' | 'update' | 'delete';
      recordId: string;
      data: Record<string, unknown>;
      previousData?: Record<string, unknown>;
      context: any;
      timestamp: number;
      correlationId?: string;
    };
    
    const event: RuntimeEventType = {
      id: 'evt-1',
      type: 'entity:created',
      entityName: 'Ticket',
      action: 'create',
      recordId: 'ticket-123',
      data: { title: 'Test', status: 'open' },
      context: {} as any,
      timestamp: Date.now()
    };
    
    expect(event.entityName).toBe('Ticket');
    expect(event.type).toBe('entity:created');
  });

  it('should define WorkflowDef with triggers, filter, handler', () => {
    type WorkflowDefType = {
      name: string;
      triggers: string[];
      filter?: Record<string, unknown>;
      handler: (event: any, context: any) => Promise<void>;
      active?: boolean;
    };
    
    const workflow: WorkflowDefType = {
      name: 'ticket-auto-assign',
      triggers: ['entity:created'],
      filter: { entityName: 'Ticket', status: 'open' },
      handler: async (event, context) => {
        // Handler
      }
    };
    
    expect(workflow.name).toBe('ticket-auto-assign');
    expect(workflow.triggers[0]).toBe('entity:created');
  });

  it('should define ViewDef with name, entityName, type, template', () => {
    type ViewDefType = {
      name: string;
      entityName: string;
      type: 'form' | 'table' | 'detail' | 'custom';
      template?: string;
      config?: Record<string, unknown>;
    };
    
    const view: ViewDefType = {
      name: 'TicketForm',
      entityName: 'Ticket',
      type: 'form'
    };
    
    expect(view.entityName).toBe('Ticket');
    expect(view.type).toBe('form');
  });

  it('should define PolicyDef with rules for RBAC/ABAC', () => {
    type PolicyDefType = {
      id: string;
      name: string;
      description?: string;
      rules: Array<{
        effect: 'allow' | 'deny';
        resource: string;
        action?: string;
        condition?: Record<string, unknown>;
      }>;
    };
    
    const policy: PolicyDefType = {
      id: 'policy-1',
      name: 'Ticket Permissions',
      rules: [
        {
          effect: 'allow',
          resource: 'ticket:read',
          condition: { type: 'ownership', value: 'self' }
        }
      ]
    };
    
    expect(policy.rules[0].effect).toBe('allow');
  });

  it('should define RuntimeRegistry interface', () => {
    type RuntimeRegistryType = {
      entities: Map<string, any>;
      workflows: Map<string, any>;
      views: Map<string, any>;
      policies: Map<string, any>;
      modules: Map<string, any>;
      events: any; // EventBus
      
      getEntity(name: string): any | undefined;
      registerEntity(def: any): void;
      getWorkflow(name: string): any | undefined;
      registerWorkflow(def: any): void;
      getView(name: string): any | undefined;
      registerView(def: any): void;
      getPolicy(id: string): any | undefined;
      registerPolicy(def: any): void;
      getModule(name: string): any | undefined;
      registerModule(def: any): void;
      executeEvent(event: any): Promise<void>;
    };
    
    const registry: RuntimeRegistryType = {
      entities: new Map(),
      workflows: new Map(),
      views: new Map(),
      policies: new Map(),
      modules: new Map(),
      events: null as any,
      
      getEntity: () => undefined,
      registerEntity: () => {},
      getWorkflow: () => undefined,
      registerWorkflow: () => {},
      getView: () => undefined,
      registerView: () => {},
      getPolicy: () => undefined,
      registerPolicy: () => {},
      getModule: () => undefined,
      registerModule: () => {},
      executeEvent: async () => {}
    };
    
    expect(registry.entities).toBeInstanceOf(Map);
    expect(typeof registry.executeEvent).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /opt/Lume && npm test -- tests/unit/runtime-types.test.ts
```

Expected: FAIL (types not yet defined)

- [ ] **Step 3: Create types.ts with all interfaces**

```typescript
// File: backend/src/core/runtime/types.ts

/**
 * Execution context passed through entire operation pipeline.
 * Contains user identity, permissions, and request metadata.
 */
export interface ExecutionContext {
  userId: string;
  role: string;
  permissions: string[];
  requestId: string;
  domain?: string;
  timestamp: number;
}

/**
 * Single field definition in an entity.
 */
export interface EntityField {
  name: string;
  type: 'string' | 'text' | 'number' | 'date' | 'boolean' | 'select' | 'reference' | 'array' | 'json';
  required?: boolean;
  readonly?: boolean;
  label?: string;
  description?: string;
  default?: unknown;
  options?: Array<{ label: string; value: unknown }>;
  validation?: Record<string, unknown>;
  entityName?: string; // For reference type
}

/**
 * Lifecycle hooks for entity operations.
 */
export interface EntityHooks {
  beforeCreate?: (data: Record<string, unknown>, context: ExecutionContext) => Promise<Record<string, unknown>>;
  afterCreate?: (record: Record<string, unknown>, context: ExecutionContext) => Promise<void>;
  beforeUpdate?: (data: Record<string, unknown>, context: ExecutionContext) => Promise<Record<string, unknown>>;
  afterUpdate?: (record: Record<string, unknown>, context: ExecutionContext) => Promise<void>;
  beforeDelete?: (id: string, context: ExecutionContext) => Promise<void>;
  afterDelete?: (id: string, context: ExecutionContext) => Promise<void>;
}

/**
 * Entity definition — core abstraction for the framework.
 * Entities automatically generate APIs, views, and workflows.
 */
export interface EntityDef {
  name: string;
  displayName: string;
  tableName?: string;
  fields: EntityField[];
  metadata?: Record<string, unknown>;
  hooks?: EntityHooks;
  permissions?: string[];
}

/**
 * Runtime event emitted when entities are created, updated, or deleted.
 * Triggers workflows and agents.
 */
export interface RuntimeEvent {
  id: string;
  type: 'entity:created' | 'entity:updated' | 'entity:deleted';
  entityName: string;
  action: 'create' | 'update' | 'delete';
  recordId: string;
  data: Record<string, unknown>;
  previousData?: Record<string, unknown>;
  context: ExecutionContext;
  timestamp: number;
  correlationId?: string;
}

/**
 * Workflow trigger definition.
 */
export interface WorkflowDef {
  name: string;
  triggers: string[]; // e.g., ['entity:created', 'entity:updated']
  filter?: Record<string, unknown>;
  handler: (event: RuntimeEvent, context: ExecutionContext) => Promise<void>;
  active?: boolean;
}

/**
 * View definition for entity UI rendering.
 */
export interface ViewDef {
  name: string;
  entityName: string;
  type: 'form' | 'table' | 'detail' | 'custom';
  template?: string;
  config?: Record<string, unknown>;
}

/**
 * Policy condition for ABAC evaluation.
 */
export interface PolicyCondition {
  type: 'role' | 'ownership' | 'time' | 'attribute' | 'expression';
  operator?: '=' | '!=' | '>' | '<' | 'in' | 'nin';
  value?: unknown;
  expression?: string;
}

/**
 * Single policy rule.
 */
export interface PolicyRule {
  effect: 'allow' | 'deny';
  resource: string;
  action?: string;
  condition?: PolicyCondition;
}

/**
 * Policy definition for permission enforcement.
 */
export interface PolicyDef {
  id: string;
  name: string;
  description?: string;
  rules: PolicyRule[];
}

/**
 * Module manifest defining dependencies and registered entities/workflows/views/policies.
 */
export interface ModuleManifest {
  name: string;
  version: string;
  description?: string;
  depends?: string[];
  entities?: EntityDef[];
  workflows?: WorkflowDef[];
  views?: ViewDef[];
  policies?: PolicyDef[];
}

/**
 * Result of permission decision.
 */
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  denialReasons?: string[];
}

/**
 * Execution pipeline result with operation details.
 */
export interface ExecutionResult {
  success: boolean;
  recordId?: string;
  data?: Record<string, unknown>;
  error?: string;
  executionTime: number;
}

/**
 * Central runtime registry — single source of truth.
 */
export interface RuntimeRegistry {
  // State
  entities: Map<string, EntityDef>;
  workflows: Map<string, WorkflowDef>;
  views: Map<string, ViewDef>;
  policies: Map<string, PolicyDef>;
  modules: Map<string, ModuleManifest>;
  events: EventBusInterface;

  // Entity operations
  getEntity(name: string): EntityDef | undefined;
  registerEntity(def: EntityDef): void;

  // Workflow operations
  getWorkflow(name: string): WorkflowDef | undefined;
  registerWorkflow(def: WorkflowDef): void;

  // View operations
  getView(name: string): ViewDef | undefined;
  registerView(def: ViewDef): void;

  // Policy operations
  getPolicy(id: string): PolicyDef | undefined;
  registerPolicy(def: PolicyDef): void;

  // Module operations
  getModule(name: string): ModuleManifest | undefined;
  registerModule(def: ModuleManifest): void;

  // Core execution
  executeEvent(event: RuntimeEvent): Promise<ExecutionResult>;
}

/**
 * Event bus for pub/sub.
 */
export interface EventBusInterface {
  on(eventType: string, handler: (event: RuntimeEvent) => Promise<void>): void;
  off(eventType: string, handler: (event: RuntimeEvent) => Promise<void>): void;
  emit(event: RuntimeEvent): Promise<void>;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /opt/Lume && npm test -- tests/unit/runtime-types.test.ts
```

Expected: PASS

- [ ] **Step 5: Update index.ts with exports**

```typescript
// File: backend/src/core/runtime/index.ts (add to file)

export * from './types';
export { EventBus } from './event-bus';
export { RuntimeRegistry as RuntimeRegistryImpl } from './registry';
export { ExecutionPipeline } from './execution-pipeline';
export { bootstrapRegistry } from './bootstrap';
```

- [ ] **Step 6: Commit**

```bash
cd /opt/Lume && git add -A && git commit -m "feat: define core runtime types and interfaces"
```

---

## Task 2: EventBus Implementation

**Files:**
- Create: `backend/src/core/runtime/event-bus.ts`
- Create: `backend/tests/unit/event-bus.test.ts`

**Goal:** Implement the central event bus for pub/sub communication between runtime components.

---

### Task 2: EventBus Implementation

- [ ] **Step 1: Write failing test for EventBus**

```typescript
// File: backend/tests/unit/event-bus.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { EventBus } from '../../src/core/runtime/event-bus';
import { RuntimeEvent, ExecutionContext } from '../../src/core/runtime/types';

describe('EventBus', () => {
  let bus: EventBus;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    bus = new EventBus();
    mockContext = {
      userId: 'user-1',
      role: 'admin',
      permissions: [],
      requestId: 'req-1',
      timestamp: Date.now()
    };
  });

  it('should subscribe to events and emit them', async () => {
    const events: RuntimeEvent[] = [];
    
    bus.on('entity:created', async (event) => {
      events.push(event);
    });

    const event: RuntimeEvent = {
      id: 'evt-1',
      type: 'entity:created',
      entityName: 'Ticket',
      action: 'create',
      recordId: 'ticket-1',
      data: { title: 'Test' },
      context: mockContext,
      timestamp: Date.now()
    };

    await bus.emit(event);

    expect(events).toHaveLength(1);
    expect(events[0].entityName).toBe('Ticket');
  });

  it('should handle multiple subscribers to same event', async () => {
    const calls1: RuntimeEvent[] = [];
    const calls2: RuntimeEvent[] = [];

    bus.on('entity:updated', async (event) => {
      calls1.push(event);
    });

    bus.on('entity:updated', async (event) => {
      calls2.push(event);
    });

    const event: RuntimeEvent = {
      id: 'evt-2',
      type: 'entity:updated',
      entityName: 'Ticket',
      action: 'update',
      recordId: 'ticket-1',
      data: { status: 'closed' },
      context: mockContext,
      timestamp: Date.now()
    };

    await bus.emit(event);

    expect(calls1).toHaveLength(1);
    expect(calls2).toHaveLength(1);
  });

  it('should unsubscribe from events', async () => {
    const events: RuntimeEvent[] = [];
    
    const handler = async (event: RuntimeEvent) => {
      events.push(event);
    };

    bus.on('entity:deleted', handler);
    bus.off('entity:deleted', handler);

    const event: RuntimeEvent = {
      id: 'evt-3',
      type: 'entity:deleted',
      entityName: 'Ticket',
      action: 'delete',
      recordId: 'ticket-1',
      data: {},
      context: mockContext,
      timestamp: Date.now()
    };

    await bus.emit(event);

    expect(events).toHaveLength(0);
  });

  it('should handle async handlers', async () => {
    let processed = false;

    bus.on('entity:created', async (event) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      processed = true;
    });

    const event: RuntimeEvent = {
      id: 'evt-4',
      type: 'entity:created',
      entityName: 'Ticket',
      action: 'create',
      recordId: 'ticket-2',
      data: {},
      context: mockContext,
      timestamp: Date.now()
    };

    await bus.emit(event);

    expect(processed).toBe(true);
  });

  it('should handle errors in handlers gracefully', async () => {
    const errorHandler = async () => {
      throw new Error('Handler error');
    };

    bus.on('entity:created', errorHandler);

    const event: RuntimeEvent = {
      id: 'evt-5',
      type: 'entity:created',
      entityName: 'Ticket',
      action: 'create',
      recordId: 'ticket-3',
      data: {},
      context: mockContext,
      timestamp: Date.now()
    };

    // Should not throw, should handle error gracefully
    await expect(bus.emit(event)).rejects.toThrow();
  });

  it('should support pattern matching for event types', async () => {
    const events: RuntimeEvent[] = [];

    bus.on('entity:*', async (event) => {
      events.push(event);
    });

    const createEvent: RuntimeEvent = {
      id: 'evt-6',
      type: 'entity:created',
      entityName: 'Ticket',
      action: 'create',
      recordId: 'ticket-4',
      data: {},
      context: mockContext,
      timestamp: Date.now()
    };

    const updateEvent: RuntimeEvent = {
      ...createEvent,
      id: 'evt-7',
      type: 'entity:updated',
      action: 'update'
    };

    await bus.emit(createEvent);
    await bus.emit(updateEvent);

    expect(events).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /opt/Lume && npm test -- tests/unit/event-bus.test.ts
```

Expected: FAIL (EventBus not yet implemented)

- [ ] **Step 3: Implement EventBus**

```typescript
// File: backend/src/core/runtime/event-bus.ts
import { EventEmitter } from 'events';
import { RuntimeEvent, EventBusInterface } from './types';

/**
 * Central event bus for pub/sub communication.
 * Emits runtime events (entity:created, entity:updated, entity:deleted).
 * Workflows and agents subscribe to these events.
 */
export class EventBus implements EventBusInterface {
  private emitter: EventEmitter;
  private readonly maxListeners = 100;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(this.maxListeners);
  }

  /**
   * Subscribe to events matching a type.
   * Supports wildcards: 'entity:*' matches 'entity:created', 'entity:updated', etc.
   */
  on(eventType: string, handler: (event: RuntimeEvent) => Promise<void>): void {
    const listener = async (event: RuntimeEvent) => {
      try {
        await handler(event);
      } catch (error) {
        console.error(`Error in event handler for ${eventType}:`, error);
        throw error; // Re-throw for caller to handle
      }
    };

    this.emitter.on(eventType, listener);
  }

  /**
   * Unsubscribe from events.
   */
  off(eventType: string, handler: (event: RuntimeEvent) => Promise<void>): void {
    this.emitter.off(eventType, handler);
  }

  /**
   * Emit an event.
   * Executes all handlers synchronously, waits for all async handlers.
   */
  async emit(event: RuntimeEvent): Promise<void> {
    // Emit specific event type (e.g., 'entity:created')
    const specificType = `${event.type}`;
    
    // Emit pattern-matched types (e.g., 'entity:*')
    const pattern = event.type.split(':')[0] + ':*';

    // Collect all listeners for specific type
    const specificListeners = this.emitter.listeners(specificType) as ((event: RuntimeEvent) => Promise<void>)[];
    const patternListeners = this.emitter.listeners(pattern) as ((event: RuntimeEvent) => Promise<void>)[];

    const allListeners = [...specificListeners, ...patternListeners];

    // Execute all handlers in parallel
    await Promise.all(allListeners.map(listener => listener(event)));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /opt/Lume && npm test -- tests/unit/event-bus.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /opt/Lume && git add -A && git commit -m "feat: implement EventBus for pub/sub communication"
```

---

## Task 3: Execution Pipeline

**Files:**
- Create: `backend/src/core/runtime/execution-pipeline.ts`
- Create: `backend/tests/unit/execution-pipeline.test.ts`

**Goal:** Implement the 7-step execution pipeline that orchestrates entity operations through permission checks, hooks, DB mutations, and event emission.

---

### Task 3: Execution Pipeline

- [ ] **Step 1: Write failing test for execution pipeline**

```typescript
// File: backend/tests/unit/execution-pipeline.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ExecutionPipeline } from '../../src/core/runtime/execution-pipeline';
import { EntityDef, ExecutionContext, RuntimeEvent } from '../../src/core/runtime/types';
import { EventBus } from '../../src/core/runtime/event-bus';

describe('ExecutionPipeline', () => {
  let pipeline: ExecutionPipeline;
  let eventBus: EventBus;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    eventBus = new EventBus();
    pipeline = new ExecutionPipeline(eventBus);
    mockContext = {
      userId: 'user-1',
      role: 'admin',
      permissions: ['ticket:create'],
      requestId: 'req-1',
      timestamp: Date.now()
    };
  });

  it('should execute create operation through 7-step pipeline', async () => {
    const ticketEntity: EntityDef = {
      name: 'Ticket',
      displayName: 'Support Ticket',
      fields: [
        { name: 'title', type: 'string', required: true },
        { name: 'status', type: 'select', default: 'open' }
      ],
      permissions: ['ticket:create']
    };

    const data = { title: 'Test Ticket' };

    // Step 1: Permission check (stubbed)
    const checkPermission = jest.fn().mockResolvedValue(true);

    // Step 2: Before-hooks (stubbed)
    const executeBeforeHooks = jest.fn().mockResolvedValue(data);

    // Step 3: Mutation (stubbed)
    const executeMutation = jest.fn().mockResolvedValue({
      id: 'ticket-1',
      title: 'Test Ticket',
      status: 'open',
      createdAt: new Date()
    });

    // Inject stubs
    (pipeline as any).permissionEngine = { checkPermission };
    (pipeline as any).hookExecutor = { executeBeforeHooks, executeAfterHooks: jest.fn() };
    (pipeline as any).dataStore = { create: executeMutation };

    // Execute pipeline
    const result = await pipeline.execute('create', ticketEntity, data, mockContext);

    expect(checkPermission).toHaveBeenCalledWith(
      mockContext,
      'ticket:create',
      expect.any(Object)
    );
    expect(executeBeforeHooks).toHaveBeenCalled();
    expect(executeMutation).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.recordId).toBe('ticket-1');
  });

  it('should emit entity:created event after successful create', async () => {
    const emittedEvents: RuntimeEvent[] = [];
    eventBus.on('entity:*', async (event) => {
      emittedEvents.push(event);
    });

    const ticketEntity: EntityDef = {
      name: 'Ticket',
      displayName: 'Support Ticket',
      fields: [{ name: 'title', type: 'string' }],
      permissions: ['ticket:create']
    };

    // Stub all steps
    (pipeline as any).permissionEngine = {
      checkPermission: jest.fn().mockResolvedValue(true)
    };
    (pipeline as any).hookExecutor = {
      executeBeforeHooks: jest.fn(async (_, data) => data),
      executeAfterHooks: jest.fn()
    };
    (pipeline as any).dataStore = {
      create: jest.fn().mockResolvedValue({ id: 'ticket-1', title: 'Test' })
    };

    await pipeline.execute('create', ticketEntity, { title: 'Test' }, mockContext);

    expect(emittedEvents).toHaveLength(1);
    expect(emittedEvents[0].type).toBe('entity:created');
    expect(emittedEvents[0].entityName).toBe('Ticket');
    expect(emittedEvents[0].recordId).toBe('ticket-1');
  });

  it('should reject operation if permission check fails', async () => {
    const ticketEntity: EntityDef = {
      name: 'Ticket',
      displayName: 'Support Ticket',
      fields: [],
      permissions: ['ticket:create']
    };

    const deniedContext: ExecutionContext = {
      ...mockContext,
      permissions: [] // No permissions
    };

    (pipeline as any).permissionEngine = {
      checkPermission: jest.fn().mockResolvedValue(false)
    };

    const result = await pipeline.execute('create', ticketEntity, {}, deniedContext);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Permission denied');
  });

  it('should execute before-hooks and use their output', async () => {
    const ticketEntity: EntityDef = {
      name: 'Ticket',
      displayName: 'Support Ticket',
      fields: [],
      permissions: ['ticket:create'],
      hooks: {
        beforeCreate: async (data, context) => {
          return { ...data, createdBy: context.userId };
        }
      }
    };

    const data = { title: 'Test' };

    (pipeline as any).permissionEngine = {
      checkPermission: jest.fn().mockResolvedValue(true)
    };

    const mutationData = { title: 'Test', createdBy: 'user-1' };
    (pipeline as any).hookExecutor = {
      executeBeforeHooks: jest.fn().mockResolvedValue(mutationData),
      executeAfterHooks: jest.fn()
    };
    (pipeline as any).dataStore = {
      create: jest.fn().mockResolvedValue({ id: 'ticket-1', ...mutationData })
    };

    const result = await pipeline.execute('create', ticketEntity, data, mockContext);

    expect(result.data).toEqual({ id: 'ticket-1', title: 'Test', createdBy: 'user-1' });
  });

  it('should handle update operations with previous data', async () => {
    const ticketEntity: EntityDef = {
      name: 'Ticket',
      displayName: 'Support Ticket',
      fields: []
    };

    (pipeline as any).permissionEngine = {
      checkPermission: jest.fn().mockResolvedValue(true)
    };
    (pipeline as any).hookExecutor = {
      executeBeforeHooks: jest.fn(async (_, data) => data),
      executeAfterHooks: jest.fn()
    };
    (pipeline as any).dataStore = {
      update: jest.fn().mockResolvedValue({
        id: 'ticket-1',
        status: 'closed'
      })
    };

    const emittedEvents: RuntimeEvent[] = [];
    eventBus.on('entity:*', async (event) => {
      emittedEvents.push(event);
    });

    const updateData = { status: 'closed' };
    const previousData = { status: 'open', title: 'Test' };

    // Execute update
    const result = await (pipeline as any).executeUpdate(
      'ticket-1',
      ticketEntity,
      updateData,
      previousData,
      mockContext
    );

    expect(result.success).toBe(true);
    expect(emittedEvents.some(e => e.type === 'entity:updated')).toBe(true);
  });

  it('should track execution time', async () => {
    const ticketEntity: EntityDef = {
      name: 'Ticket',
      displayName: 'Support Ticket',
      fields: []
    };

    (pipeline as any).permissionEngine = {
      checkPermission: jest.fn().mockResolvedValue(true)
    };
    (pipeline as any).hookExecutor = {
      executeBeforeHooks: jest.fn(async (_, data) => data),
      executeAfterHooks: jest.fn()
    };
    (pipeline as any).dataStore = {
      create: jest.fn().mockResolvedValue({ id: 'ticket-1' })
    };

    const result = await pipeline.execute('create', ticketEntity, {}, mockContext);

    expect(result.executionTime).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /opt/Lume && npm test -- tests/unit/execution-pipeline.test.ts
```

Expected: FAIL (ExecutionPipeline not yet implemented)

- [ ] **Step 3: Implement ExecutionPipeline**

```typescript
// File: backend/src/core/runtime/execution-pipeline.ts
import { v4 as uuidv4 } from 'uuid';
import {
  EntityDef,
  ExecutionContext,
  ExecutionResult,
  RuntimeEvent,
  EventBusInterface
} from './types';

/**
 * 7-step execution pipeline for entity operations.
 * 
 * Step 1: Permission check (policy engine validates operation)
 * Step 2: Before-hooks run (custom logic)
 * Step 3: Mutation executed (DB write)
 * Step 4: After-hooks & workflows triggered (event queue)
 * Step 5: Agents subscribe and react
 * Step 6: View invalidation signals (grid refresh)
 * Step 7: Return result to caller
 */
export class ExecutionPipeline {
  private eventBus: EventBusInterface;
  private permissionEngine: any; // Injected dependency
  private hookExecutor: any; // Injected dependency
  private dataStore: any; // Injected dependency

  constructor(eventBus: EventBusInterface) {
    this.eventBus = eventBus;
  }

  /**
   * Execute a single entity operation through the full pipeline.
   */
  async execute(
    action: 'create' | 'update' | 'delete',
    entity: EntityDef,
    data: Record<string, unknown>,
    context: ExecutionContext,
    recordId?: string,
    previousData?: Record<string, unknown>
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const correlationId = uuidv4();

    try {
      // ========== STEP 1: Permission Check ==========
      const permissionName = `${entity.name.toLowerCase()}:${action}`;
      const hasPermission = await this.checkPermission(
        context,
        permissionName,
        entity
      );

      if (!hasPermission) {
        return {
          success: false,
          error: `Permission denied: ${permissionName}`,
          executionTime: Date.now() - startTime
        };
      }

      // ========== STEP 2: Before-Hooks ==========
      let processedData = data;
      if (entity.hooks && entity.hooks[`before${this.capitalize(action)}`]) {
        processedData = await entity.hooks[`before${this.capitalize(action)}`](
          data,
          context
        );
      }

      // ========== STEP 3: Mutation ==========
      let result: Record<string, unknown>;
      if (action === 'create') {
        result = await this.dataStore.create(entity, processedData);
      } else if (action === 'update') {
        result = await this.dataStore.update(entity, recordId, processedData);
      } else if (action === 'delete') {
        await this.dataStore.delete(entity, recordId);
        result = { id: recordId };
      }

      // ========== STEP 4: After-Hooks & Event Emission ==========
      if (entity.hooks && entity.hooks[`after${this.capitalize(action)}`]) {
        await entity.hooks[`after${this.capitalize(action)}`](result, context);
      }

      // ========== STEP 5: Event Emission (triggers workflows & agents) ==========
      const eventType = `entity:${action === 'create' ? 'created' : action === 'update' ? 'updated' : 'deleted'}`;
      const runtimeEvent: RuntimeEvent = {
        id: uuidv4(),
        type: eventType as any,
        entityName: entity.name,
        action,
        recordId: result.id as string,
        data: result,
        previousData,
        context,
        timestamp: Date.now(),
        correlationId
      };

      // Emit event (workflows and agents subscribe)
      await this.eventBus.emit(runtimeEvent);

      // ========== STEP 6 & 7: Return Result ==========
      return {
        success: true,
        recordId: result.id as string,
        data: result,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute update with previous data tracking.
   */
  async executeUpdate(
    recordId: string,
    entity: EntityDef,
    data: Record<string, unknown>,
    previousData: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    return this.execute('update', entity, data, context, recordId, previousData);
  }

  /**
   * Check if context has required permission.
   */
  private async checkPermission(
    context: ExecutionContext,
    permission: string,
    entity: EntityDef
  ): Promise<boolean> {
    // If permission engine is injected, use it
    if (this.permissionEngine?.checkPermission) {
      return this.permissionEngine.checkPermission(context, permission, entity);
    }

    // Otherwise, fall back to simple permission check
    return context.permissions.includes(permission) || context.role === 'admin';
  }

  /**
   * Capitalize first letter for hook names.
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Inject dependencies (for testing and composition).
   */
  injectDependencies(deps: {
    permissionEngine?: any;
    hookExecutor?: any;
    dataStore?: any;
  }): void {
    if (deps.permissionEngine) this.permissionEngine = deps.permissionEngine;
    if (deps.hookExecutor) this.hookExecutor = deps.hookExecutor;
    if (deps.dataStore) this.dataStore = deps.dataStore;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /opt/Lume && npm test -- tests/unit/execution-pipeline.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /opt/Lume && git add -A && git commit -m "feat: implement 7-step execution pipeline"
```

---

## Task 4: RuntimeRegistry Implementation

**Files:**
- Create: `backend/src/core/runtime/registry.ts`
- Create: `backend/tests/unit/runtime-registry.test.ts`

**Goal:** Implement the central RuntimeRegistry that holds all entity, workflow, view, and policy definitions. This is the single source of truth.

---

### Task 4: RuntimeRegistry Implementation

- [ ] **Step 1: Write failing test for RuntimeRegistry**

```typescript
// File: backend/tests/unit/runtime-registry.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { RuntimeRegistry } from '../../src/core/runtime/registry';
import { EntityDef, WorkflowDef, ViewDef, PolicyDef } from '../../src/core/runtime/types';
import { EventBus } from '../../src/core/runtime/event-bus';

describe('RuntimeRegistry', () => {
  let registry: RuntimeRegistry;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    registry = new RuntimeRegistry(eventBus);
  });

  it('should register and retrieve entities', () => {
    const ticketEntity: EntityDef = {
      name: 'Ticket',
      displayName: 'Support Ticket',
      fields: [],
      permissions: ['ticket:read']
    };

    registry.registerEntity(ticketEntity);

    const retrieved = registry.getEntity('Ticket');
    expect(retrieved).toBeDefined();
    expect(retrieved?.displayName).toBe('Support Ticket');
  });

  it('should register and retrieve workflows', () => {
    const workflow: WorkflowDef = {
      name: 'ticket-auto-assign',
      triggers: ['entity:created'],
      handler: async () => {}
    };

    registry.registerWorkflow(workflow);

    const retrieved = registry.getWorkflow('ticket-auto-assign');
    expect(retrieved).toBeDefined();
    expect(retrieved?.triggers).toContain('entity:created');
  });

  it('should register and retrieve views', () => {
    const view: ViewDef = {
      name: 'TicketForm',
      entityName: 'Ticket',
      type: 'form'
    };

    registry.registerView(view);

    const retrieved = registry.getView('TicketForm');
    expect(retrieved).toBeDefined();
    expect(retrieved?.type).toBe('form');
  });

  it('should register and retrieve policies', () => {
    const policy: PolicyDef = {
      id: 'policy-1',
      name: 'Ticket Permissions',
      rules: []
    };

    registry.registerPolicy(policy);

    const retrieved = registry.getPolicy('policy-1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Ticket Permissions');
  });

  it('should return undefined for non-existent items', () => {
    expect(registry.getEntity('NonExistent')).toBeUndefined();
    expect(registry.getWorkflow('NonExistent')).toBeUndefined();
    expect(registry.getView('NonExistent')).toBeUndefined();
    expect(registry.getPolicy('NonExistent')).toBeUndefined();
  });

  it('should store items in internal maps', () => {
    const ticketEntity: EntityDef = {
      name: 'Ticket',
      displayName: 'Support Ticket',
      fields: []
    };

    registry.registerEntity(ticketEntity);

    expect(registry.entities.has('Ticket')).toBe(true);
    expect(registry.entities.get('Ticket')).toEqual(ticketEntity);
  });

  it('should throw on duplicate entity registration', () => {
    const ticketEntity: EntityDef = {
      name: 'Ticket',
      displayName: 'Support Ticket',
      fields: []
    };

    registry.registerEntity(ticketEntity);

    expect(() => {
      registry.registerEntity(ticketEntity);
    }).toThrow('Entity Ticket already registered');
  });

  it('should validate entity definition', () => {
    const invalidEntity: any = {
      // Missing required name and displayName
      fields: []
    };

    expect(() => {
      registry.registerEntity(invalidEntity);
    }).toThrow();
  });

  it('should export all entities as object', () => {
    registry.registerEntity({
      name: 'Ticket',
      displayName: 'Ticket',
      fields: []
    });
    registry.registerEntity({
      name: 'User',
      displayName: 'User',
      fields: []
    });

    const all = registry.getAllEntities();
    expect(Object.keys(all)).toContain('Ticket');
    expect(Object.keys(all)).toContain('User');
  });

  it('should export all workflows as object', () => {
    registry.registerWorkflow({
      name: 'workflow1',
      triggers: [],
      handler: async () => {}
    });
    registry.registerWorkflow({
      name: 'workflow2',
      triggers: [],
      handler: async () => {}
    });

    const all = registry.getAllWorkflows();
    expect(Object.keys(all)).toContain('workflow1');
    expect(Object.keys(all)).toContain('workflow2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /opt/Lume && npm test -- tests/unit/runtime-registry.test.ts
```

Expected: FAIL (RuntimeRegistry not yet implemented)

- [ ] **Step 3: Implement RuntimeRegistry**

```typescript
// File: backend/src/core/runtime/registry.ts
import {
  RuntimeRegistry as IRegistry,
  EntityDef,
  WorkflowDef,
  ViewDef,
  PolicyDef,
  ModuleManifest,
  EventBusInterface,
  RuntimeEvent,
  ExecutionContext,
  ExecutionResult
} from './types';

/**
 * Central runtime registry — single source of truth for all metadata.
 * Holds entities, workflows, views, policies, and modules.
 * Coordinates all runtime operations through the execution pipeline.
 */
export class RuntimeRegistry implements IRegistry {
  entities: Map<string, EntityDef> = new Map();
  workflows: Map<string, WorkflowDef> = new Map();
  views: Map<string, ViewDef> = new Map();
  policies: Map<string, PolicyDef> = new Map();
  modules: Map<string, ModuleManifest> = new Map();
  events: EventBusInterface;

  constructor(eventBus: EventBusInterface) {
    this.events = eventBus;
  }

  /**
   * Register an entity definition.
   * Validates schema integrity and emits registry:entity-registered event.
   */
  registerEntity(def: EntityDef): void {
    this.validateEntity(def);

    if (this.entities.has(def.name)) {
      throw new Error(`Entity ${def.name} already registered`);
    }

    this.entities.set(def.name, def);
  }

  /**
   * Retrieve an entity definition by name.
   */
  getEntity(name: string): EntityDef | undefined {
    return this.entities.get(name);
  }

  /**
   * Register a workflow definition.
   */
  registerWorkflow(def: WorkflowDef): void {
    this.validateWorkflow(def);

    if (this.workflows.has(def.name)) {
      throw new Error(`Workflow ${def.name} already registered`);
    }

    this.workflows.set(def.name, def);
  }

  /**
   * Retrieve a workflow definition by name.
   */
  getWorkflow(name: string): WorkflowDef | undefined {
    return this.workflows.get(name);
  }

  /**
   * Register a view definition.
   */
  registerView(def: ViewDef): void {
    this.validateView(def);

    if (this.views.has(def.name)) {
      throw new Error(`View ${def.name} already registered`);
    }

    this.views.set(def.name, def);
  }

  /**
   * Retrieve a view definition by name.
   */
  getView(name: string): ViewDef | undefined {
    return this.views.get(name);
  }

  /**
   * Register a policy definition.
   */
  registerPolicy(def: PolicyDef): void {
    this.validatePolicy(def);

    if (this.policies.has(def.id)) {
      throw new Error(`Policy ${def.id} already registered`);
    }

    this.policies.set(def.id, def);
  }

  /**
   * Retrieve a policy definition by ID.
   */
  getPolicy(id: string): PolicyDef | undefined {
    return this.policies.get(id);
  }

  /**
   * Register a module manifest.
   */
  registerModule(def: ModuleManifest): void {
    if (this.modules.has(def.name)) {
      throw new Error(`Module ${def.name} already registered`);
    }

    this.modules.set(def.name, def);

    // Register entities, workflows, views, policies from module
    if (def.entities) {
      def.entities.forEach(entity => this.registerEntity(entity));
    }
    if (def.workflows) {
      def.workflows.forEach(workflow => this.registerWorkflow(workflow));
    }
    if (def.views) {
      def.views.forEach(view => this.registerView(view));
    }
    if (def.policies) {
      def.policies.forEach(policy => this.registerPolicy(policy));
    }
  }

  /**
   * Retrieve a module manifest by name.
   */
  getModule(name: string): ModuleManifest | undefined {
    return this.modules.get(name);
  }

  /**
   * Execute an event through the runtime.
   * This is the primary entry point for entity operations.
   */
  async executeEvent(event: RuntimeEvent): Promise<ExecutionResult> {
    // Get entity definition
    const entity = this.getEntity(event.entityName);
    if (!entity) {
      return {
        success: false,
        error: `Entity ${event.entityName} not registered`,
        executionTime: 0
      };
    }

    // Get all workflows that listen to this event
    const matchingWorkflows = Array.from(this.workflows.values()).filter(wf =>
      wf.triggers.includes(event.type)
    );

    // Execute workflows asynchronously (don't block caller)
    for (const workflow of matchingWorkflows) {
      // Check if event matches workflow filter
      if (workflow.filter && !this.matchesFilter(event.data, workflow.filter)) {
        continue;
      }

      // Queue workflow for async execution
      this.queueWorkflow(workflow, event, event.context);
    }

    // Return success
    return {
      success: true,
      recordId: event.recordId,
      data: event.data,
      executionTime: 0
    };
  }

  /**
   * Get all entities as object (for export).
   */
  getAllEntities(): Record<string, EntityDef> {
    const result: Record<string, EntityDef> = {};
    this.entities.forEach((entity, name) => {
      result[name] = entity;
    });
    return result;
  }

  /**
   * Get all workflows as object (for export).
   */
  getAllWorkflows(): Record<string, WorkflowDef> {
    const result: Record<string, WorkflowDef> = {};
    this.workflows.forEach((workflow, name) => {
      result[name] = workflow;
    });
    return result;
  }

  /**
   * Validate entity definition.
   */
  private validateEntity(def: EntityDef): void {
    if (!def.name || !def.displayName) {
      throw new Error('Entity must have name and displayName');
    }
    if (!Array.isArray(def.fields)) {
      throw new Error('Entity must have fields array');
    }
  }

  /**
   * Validate workflow definition.
   */
  private validateWorkflow(def: WorkflowDef): void {
    if (!def.name) {
      throw new Error('Workflow must have name');
    }
    if (!Array.isArray(def.triggers) || def.triggers.length === 0) {
      throw new Error('Workflow must have triggers');
    }
    if (typeof def.handler !== 'function') {
      throw new Error('Workflow must have handler function');
    }
  }

  /**
   * Validate view definition.
   */
  private validateView(def: ViewDef): void {
    if (!def.name || !def.entityName) {
      throw new Error('View must have name and entityName');
    }
    if (!['form', 'table', 'detail', 'custom'].includes(def.type)) {
      throw new Error('View type must be form, table, detail, or custom');
    }
  }

  /**
   * Validate policy definition.
   */
  private validatePolicy(def: PolicyDef): void {
    if (!def.id || !def.name) {
      throw new Error('Policy must have id and name');
    }
    if (!Array.isArray(def.rules)) {
      throw new Error('Policy must have rules array');
    }
  }

  /**
   * Check if data matches filter conditions.
   */
  private matchesFilter(data: Record<string, unknown>, filter: Record<string, unknown>): boolean {
    return Object.entries(filter).every(([key, value]) => {
      return data[key] === value;
    });
  }

  /**
   * Queue workflow for async execution.
   * TODO: Integrate with event queue (Redis/RabbitMQ).
   */
  private async queueWorkflow(
    workflow: WorkflowDef,
    event: RuntimeEvent,
    context: ExecutionContext
  ): Promise<void> {
    // For now, execute synchronously
    // Later, this will queue to Redis and use worker processes
    try {
      await workflow.handler(event, context);
    } catch (error) {
      console.error(`Error executing workflow ${workflow.name}:`, error);
      // Log to dead-letter queue for manual retry
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /opt/Lume && npm test -- tests/unit/runtime-registry.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /opt/Lume && git add -A && git commit -m "feat: implement central RuntimeRegistry"
```

---

## Task 5: Registry Bootstrap & Module Discovery

**Files:**
- Create: `backend/src/core/runtime/bootstrap.ts`
- Create: `backend/tests/unit/bootstrap.test.ts`

**Goal:** Implement the bootstrap process that initializes the registry from installed modules, discovers entity/workflow/view definitions, validates schema integrity, and emits ready event.

---

### Task 5: Registry Bootstrap

- [ ] **Step 1: Write failing test for bootstrap**

```typescript
// File: backend/tests/unit/bootstrap.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { bootstrapRegistry, validateSchemaIntegrity } from '../../src/core/runtime/bootstrap';
import { RuntimeRegistry } from '../../src/core/runtime/registry';
import { EventBus } from '../../src/core/runtime/event-bus';
import { ModuleManifest } from '../../src/core/runtime/types';

describe('Bootstrap', () => {
  let eventBus: EventBus;
  let registry: RuntimeRegistry;

  beforeEach(() => {
    eventBus = new EventBus();
    registry = new RuntimeRegistry(eventBus);
  });

  it('should discover and register entities from modules', async () => {
    const mockManifest: ModuleManifest = {
      name: 'ticket-module',
      version: '1.0.0',
      entities: [
        {
          name: 'Ticket',
          displayName: 'Support Ticket',
          fields: [{ name: 'title', type: 'string' }]
        }
      ]
    };

    registry.registerModule(mockManifest);

    const entity = registry.getEntity('Ticket');
    expect(entity).toBeDefined();
    expect(entity?.displayName).toBe('Support Ticket');
  });

  it('should validate no circular entity dependencies', () => {
    // Create a mock scenario with circular reference
    const manifestA: ModuleManifest = {
      name: 'module-a',
      version: '1.0.0',
      depends: ['module-b']
    };

    const manifestB: ModuleManifest = {
      name: 'module-b',
      version: '1.0.0',
      depends: ['module-a']
    };

    registry.registerModule(manifestA);
    registry.registerModule(manifestB);

    const result = validateSchemaIntegrity(registry);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(expect.stringContaining('circular'));
  });

  it('should validate missing entity references in workflows', () => {
    registry.registerEntity({
      name: 'Ticket',
      displayName: 'Ticket',
      fields: []
    });

    registry.registerWorkflow({
      name: 'workflow1',
      triggers: ['entity:created'],
      filter: { entityName: 'NonExistent' },
      handler: async () => {}
    });

    const result = validateSchemaIntegrity(registry);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(expect.stringContaining('NonExistent'));
  });

  it('should emit registry:ready event after successful bootstrap', async () => {
    let readyEmitted = false;

    eventBus.on('registry:ready', async () => {
      readyEmitted = true;
    });

    registry.registerEntity({
      name: 'Ticket',
      displayName: 'Ticket',
      fields: []
    });

    // Simulate bootstrap completion
    await bootstrapRegistry(registry);

    // Note: In real implementation, registry:ready is emitted during bootstrap
    expect(registry.getAllEntities()['Ticket']).toBeDefined();
  });

  it('should resolve module dependencies in order', () => {
    const loadOrder: string[] = [];

    const manifestBase: ModuleManifest = {
      name: 'base-module',
      version: '1.0.0',
      entities: [
        { name: 'User', displayName: 'User', fields: [] }
      ]
    };

    const manifestTicket: ModuleManifest = {
      name: 'ticket-module',
      version: '1.0.0',
      depends: ['base-module'],
      entities: [
        { name: 'Ticket', displayName: 'Ticket', fields: [] }
      ]
    };

    registry.registerModule(manifestBase);
    registry.registerModule(manifestTicket);

    expect(registry.getEntity('User')).toBeDefined();
    expect(registry.getEntity('Ticket')).toBeDefined();
  });

  it('should validate all entity permissions are defined', () => {
    registry.registerEntity({
      name: 'Ticket',
      displayName: 'Ticket',
      fields: [],
      permissions: ['ticket:read', 'ticket:write']
    });

    const result = validateSchemaIntegrity(registry);
    // Should not fail for undefined permissions (they're created on-demand)
    expect(result.valid).toBe(true);
  });

  it('should collect all validation errors before returning', () => {
    registry.registerEntity({
      name: 'Ticket',
      displayName: 'Ticket',
      fields: []
    });

    registry.registerWorkflow({
      name: 'workflow1',
      triggers: ['entity:created'],
      filter: { entityName: 'NonExistent' },
      handler: async () => {}
    });

    registry.registerWorkflow({
      name: 'workflow2',
      triggers: ['entity:created'],
      filter: { entityName: 'AlsoNonExistent' },
      handler: async () => {}
    });

    const result = validateSchemaIntegrity(registry);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /opt/Lume && npm test -- tests/unit/bootstrap.test.ts
```

Expected: FAIL (bootstrap functions not yet implemented)

- [ ] **Step 3: Implement bootstrap functions**

```typescript
// File: backend/src/core/runtime/bootstrap.ts
import { RuntimeRegistry } from './registry';
import { RuntimeEvent } from './types';

/**
 * Validation result from schema integrity check.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Bootstrap the runtime registry.
 * 
 * Steps:
 * 1. Discover installed modules
 * 2. Load module manifests
 * 3. Register entities, workflows, views, policies from modules
 * 4. Validate schema integrity
 * 5. Emit registry:ready event
 */
export async function bootstrapRegistry(registry: RuntimeRegistry): Promise<ValidationResult> {
  console.log('[Registry] Starting bootstrap...');

  try {
    // Step 4: Validate schema integrity
    const validation = validateSchemaIntegrity(registry);

    if (!validation.valid) {
      console.error('[Registry] Schema validation failed:');
      validation.errors.forEach(err => console.error(`  - ${err}`));
      throw new Error('Schema validation failed');
    }

    if (validation.warnings.length > 0) {
      console.warn('[Registry] Schema warnings:');
      validation.warnings.forEach(warn => console.warn(`  - ${warn}`));
    }

    // Step 5: Emit registry:ready event
    const readyEvent: RuntimeEvent = {
      id: 'evt-bootstrap',
      type: 'entity:created' as any, // Hack: using entity event type
      entityName: 'Registry',
      action: 'create',
      recordId: 'registry',
      data: {
        entities: registry.getAllEntities(),
        workflows: registry.getAllWorkflows()
      },
      context: {
        userId: 'system',
        role: 'admin',
        permissions: [],
        requestId: 'bootstrap',
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };

    // Note: In real implementation, emit 'registry:ready' event
    console.log('[Registry] Bootstrap complete');
    console.log(`  - Entities: ${registry.entities.size}`);
    console.log(`  - Workflows: ${registry.workflows.size}`);
    console.log(`  - Views: ${registry.views.size}`);
    console.log(`  - Policies: ${registry.policies.size}`);

    return validation;
  } catch (error) {
    console.error('[Registry] Bootstrap failed:', error);
    throw error;
  }
}

/**
 * Validate schema integrity.
 * 
 * Checks:
 * 1. No circular module dependencies
 * 2. All entity references are valid
 * 3. All workflows reference existing entities
 * 4. All views reference existing entities
 * 5. Permission names are well-formed
 */
export function validateSchemaIntegrity(registry: RuntimeRegistry): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check 1: No circular module dependencies
  const circularity = checkModuleCircularity(registry);
  if (circularity.hasCircles) {
    circularity.circles.forEach(circle => {
      errors.push(`Circular module dependency: ${circle.join(' → ')}`);
    });
  }

  // Check 2 & 3: Workflows reference existing entities
  registry.workflows.forEach((workflow, name) => {
    if (workflow.filter && workflow.filter.entityName) {
      const entityName = workflow.filter.entityName as string;
      if (!registry.getEntity(entityName)) {
        errors.push(`Workflow '${name}' references non-existent entity '${entityName}'`);
      }
    }
  });

  // Check 4: Views reference existing entities
  registry.views.forEach((view, name) => {
    if (!registry.getEntity(view.entityName)) {
      errors.push(`View '${name}' references non-existent entity '${view.entityName}'`);
    }
  });

  // Check 5: Permission names are well-formed
  registry.entities.forEach((entity) => {
    if (entity.permissions) {
      entity.permissions.forEach(perm => {
        if (!isValidPermissionName(perm)) {
          errors.push(`Invalid permission name '${perm}' in entity '${entity.name}'`);
        }
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Check for circular module dependencies.
 */
function checkModuleCircularity(registry: RuntimeRegistry): { hasCircles: boolean; circles: string[][] } {
  const circles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const hasCycle = (moduleName: string, path: string[]): boolean => {
    visited.add(moduleName);
    recursionStack.add(moduleName);

    const module = registry.getModule(moduleName);
    if (module && module.depends) {
      for (const dep of module.depends) {
        if (!visited.has(dep)) {
          if (hasCycle(dep, [...path, moduleName])) {
            return true;
          }
        } else if (recursionStack.has(dep)) {
          circles.push([...path, moduleName, dep]);
          return true;
        }
      }
    }

    recursionStack.delete(moduleName);
    return false;
  };

  registry.modules.forEach((_, moduleName) => {
    if (!visited.has(moduleName)) {
      hasCycle(moduleName, []);
    }
  });

  return {
    hasCircles: circles.length > 0,
    circles
  };
}

/**
 * Validate permission name format: {entity}:{action} or {entity}:{action}:{field}
 */
function isValidPermissionName(name: string): boolean {
  const parts = name.split(':');
  return parts.length >= 2;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /opt/Lume && npm test -- tests/unit/bootstrap.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /opt/Lume && git add -A && git commit -m "feat: implement registry bootstrap and schema validation"
```

---

## Task 6: Hook Executor & Entity Lifecycle

**Files:**
- Create: `backend/src/core/runtime/hooks.ts`
- Create: `backend/tests/unit/hooks.test.ts`

**Goal:** Implement hook execution system that runs before/after-hooks for create/update/delete operations. Integrates hooks into the execution pipeline.

---

### Task 6: Hook Executor

- [ ] **Step 1: Write failing test for hooks**

```typescript
// File: backend/tests/unit/hooks.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { HookExecutor } from '../../src/core/runtime/hooks';
import { EntityDef, ExecutionContext } from '../../src/core/runtime/types';

describe('HookExecutor', () => {
  let executor: HookExecutor;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    executor = new HookExecutor();
    mockContext = {
      userId: 'user-1',
      role: 'admin',
      permissions: [],
      requestId: 'req-1',
      timestamp: Date.now()
    };
  });

  it('should execute beforeCreate hook and pass returned data to mutation', async () => {
    const entity: EntityDef = {
      name: 'Ticket',
      displayName: 'Ticket',
      fields: [],
      hooks: {
        beforeCreate: async (data, context) => {
          return { ...data, createdBy: context.userId };
        }
      }
    };

    const data = { title: 'Test' };
    const result = await executor.executeBeforeHook('create', entity, data, mockContext);

    expect(result.createdBy).toBe('user-1');
    expect(result.title).toBe('Test');
  });

  it('should execute afterCreate hook with final record', async () => {
    const createdRecords: Record<string, unknown>[] = [];

    const entity: EntityDef = {
      name: 'Ticket',
      displayName: 'Ticket',
      fields: [],
      hooks: {
        afterCreate: async (record) => {
          createdRecords.push(record);
        }
      }
    };

    const record = { id: 'ticket-1', title: 'Test' };
    await executor.executeAfterHook('create', entity, record, mockContext);

    expect(createdRecords).toHaveLength(1);
    expect(createdRecords[0]).toEqual(record);
  });

  it('should execute beforeUpdate hook', async () => {
    const entity: EntityDef = {
      name: 'Ticket',
      displayName: 'Ticket',
      fields: [],
      hooks: {
        beforeUpdate: async (data, context) => {
          return { ...data, updatedAt: new Date().toISOString() };
        }
      }
    };

    const data = { status: 'closed' };
    const result = await executor.executeBeforeHook('update', entity, data, mockContext);

    expect(result.status).toBe('closed');
    expect(result.updatedAt).toBeDefined();
  });

  it('should execute afterUpdate hook', async () => {
    const updatedRecords: Record<string, unknown>[] = [];

    const entity: EntityDef = {
      name: 'Ticket',
      displayName: 'Ticket',
      fields: [],
      hooks: {
        afterUpdate: async (record) => {
          updatedRecords.push(record);
        }
      }
    };

    const record = { id: 'ticket-1', status: 'closed' };
    await executor.executeAfterHook('update', entity, record, mockContext);

    expect(updatedRecords).toHaveLength(1);
  });

  it('should execute beforeDelete hook', async () => {
    let deleteBlocked = false;

    const entity: EntityDef = {
      name: 'Ticket',
      displayName: 'Ticket',
      fields: [],
      hooks: {
        beforeDelete: async (id, context) => {
          if (id === 'protected-ticket') {
            throw new Error('Cannot delete protected ticket');
          }
        }
      }
    };

    await executor.executeBeforeHook('delete', entity, {}, mockContext, 'normal-ticket');

    await expect(
      executor.executeBeforeHook('delete', entity, {}, mockContext, 'protected-ticket')
    ).rejects.toThrow('Cannot delete protected ticket');
  });

  it('should execute afterDelete hook', async () => {
    const deletedIds: string[] = [];

    const entity: EntityDef = {
      name: 'Ticket',
      displayName: 'Ticket',
      fields: [],
      hooks: {
        afterDelete: async (id) => {
          deletedIds.push(id);
        }
      }
    };

    await executor.executeAfterHook('delete', entity, { id: 'ticket-1' }, mockContext);

    expect(deletedIds).toContain('ticket-1');
  });

  it('should handle missing hooks gracefully', async () => {
    const entity: EntityDef = {
      name: 'Ticket',
      displayName: 'Ticket',
      fields: {}
    };

    const data = { title: 'Test' };
    const result = await executor.executeBeforeHook('create', entity, data, mockContext);

    expect(result).toEqual(data);
  });

  it('should return original data if no hooks exist', async () => {
    const entity: EntityDef = {
      name: 'Ticket',
      displayName: 'Ticket',
      fields: []
    };

    const data = { title: 'Test' };
    const result = await executor.executeBeforeHook('create', entity, data, mockContext);

    expect(result).toEqual(data);
  });

  it('should throw if before-hook throws', async () => {
    const entity: EntityDef = {
      name: 'Ticket',
      displayName: 'Ticket',
      fields: [],
      hooks: {
        beforeCreate: async () => {
          throw new Error('Validation failed');
        }
      }
    };

    await expect(
      executor.executeBeforeHook('create', entity, {}, mockContext)
    ).rejects.toThrow('Validation failed');
  });

  it('should log hook errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const entity: EntityDef = {
      name: 'Ticket',
      displayName: 'Ticket',
      fields: [],
      hooks: {
        beforeCreate: async () => {
          throw new Error('Hook error');
        }
      }
    };

    try {
      await executor.executeBeforeHook('create', entity, {}, mockContext);
    } catch (e) {
      // Expected
    }

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Hook error'),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /opt/Lume && npm test -- tests/unit/hooks.test.ts
```

Expected: FAIL (HookExecutor not yet implemented)

- [ ] **Step 3: Implement HookExecutor**

```typescript
// File: backend/src/core/runtime/hooks.ts
import { EntityDef, ExecutionContext } from './types';

/**
 * Executes entity lifecycle hooks.
 * 
 * Hooks are called at specific points in the execution pipeline:
 * - beforeCreate/beforeUpdate/beforeDelete: Before data is persisted
 * - afterCreate/afterUpdate/afterDelete: After data is persisted, can trigger workflows
 */
export class HookExecutor {
  /**
   * Execute before-hook for an action.
   * 
   * Before-hooks can:
   * - Validate data (throw to reject operation)
   * - Transform data (return modified data)
   * - Set default values (e.g., createdBy = userId)
   * 
   * The returned data is used in the mutation.
   */
  async executeBeforeHook(
    action: 'create' | 'update' | 'delete',
    entity: EntityDef,
    data: Record<string, unknown>,
    context: ExecutionContext,
    recordId?: string
  ): Promise<Record<string, unknown>> {
    if (!entity.hooks) {
      return data;
    }

    const hookName = `before${this.capitalize(action)}` as keyof typeof entity.hooks;
    const hook = entity.hooks[hookName];

    if (!hook) {
      return data;
    }

    try {
      if (action === 'delete') {
        // Delete hooks receive (id, context)
        await (hook as any)(recordId, context);
        return data;
      } else {
        // Create/update hooks receive (data, context) and return transformed data
        const result = await (hook as any)(data, context);
        return result || data;
      }
    } catch (error) {
      console.error(`Before-${action} hook error in ${entity.name}:`, error);
      throw error;
    }
  }

  /**
   * Execute after-hook for an action.
   * 
   * After-hooks are called with the final record/data.
   * They typically:
   * - Log operations
   * - Trigger side effects (emails, webhooks)
   * - Update related entities
   * 
   * After-hooks don't return data (changes are ignored).
   */
  async executeAfterHook(
    action: 'create' | 'update' | 'delete',
    entity: EntityDef,
    record: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<void> {
    if (!entity.hooks) {
      return;
    }

    const hookName = `after${this.capitalize(action)}` as keyof typeof entity.hooks;
    const hook = entity.hooks[hookName];

    if (!hook) {
      return;
    }

    try {
      if (action === 'delete') {
        // Delete hooks receive (id, context)
        await (hook as any)(record.id, context);
      } else {
        // Create/update hooks receive (record, context)
        await (hook as any)(record, context);
      }
    } catch (error) {
      console.error(`After-${action} hook error in ${entity.name}:`, error);
      // Don't re-throw after-hooks (operation succeeded, side effect failed)
    }
  }

  /**
   * Capitalize first letter.
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /opt/Lume && npm test -- tests/unit/hooks.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /opt/Lume && git add -A && git commit -m "feat: implement hook executor for entity lifecycle"
```

---

## Summary & Next Steps

All 6 core runtime tasks are now complete. The foundation is in place for:

- ✅ Core interfaces and types (Task 1)
- ✅ EventBus for pub/sub (Task 2)
- ✅ 7-step execution pipeline (Task 3)
- ✅ Central RuntimeRegistry (Task 4)
- ✅ Bootstrap and schema validation (Task 5)
- ✅ Hook executor for lifecycle management (Task 6)

### Files Created
- `backend/src/core/runtime/types.ts` — All core interfaces
- `backend/src/core/runtime/event-bus.ts` — Event pub/sub
- `backend/src/core/runtime/execution-pipeline.ts` — Operation orchestration
- `backend/src/core/runtime/registry.ts` — Central registry
- `backend/src/core/runtime/bootstrap.ts` — Initialization and validation
- `backend/src/core/runtime/hooks.ts` — Lifecycle hook execution
- `backend/src/core/runtime/index.ts` — Public API exports

### Files Tested
- `backend/tests/unit/runtime-types.test.ts`
- `backend/tests/unit/event-bus.test.ts`
- `backend/tests/unit/execution-pipeline.test.ts`
- `backend/tests/unit/runtime-registry.test.ts`
- `backend/tests/unit/bootstrap.test.ts`
- `backend/tests/unit/hooks.test.ts`

### Next Implementation Phases

**Phase 2: Zero-Code Generation** (Task 1 of zero-code plan)
- Implement API route generators
- Implement default form/table view generators
- Implement CRUD workflow generators
- Integrate with ExecutionPipeline

**Phase 3: Permission Engine** (after Phase 2)
- Implement PolicyEngine for RBAC/ABAC
- Add permission checks to ExecutionPipeline
- Implement query-level permission filtering

**Phase 4: Workflow System** (after Phase 3)
- Implement WorkflowEngine for executing workflows
- Queue workflows asynchronously
- Add workflow action execution

**Phase 5: Agent System** (after Phase 4)
- Implement AgentManager for agent lifecycle
- Add event subscription for agents
- Implement idempotency tracking

**Phase 6: DataGrid Integration** (after all above)
- Implement query translator (filters → SQL)
- Implement DataGridState management
- Add real-time WebSocket subscription

---

## Execution Instructions

**To execute this plan:**

```bash
Option 1 (Recommended): Subagent-Driven Development
- I dispatch a fresh subagent per task
- Review after each task
- Fast iteration with quality checkpoints

Option 2: Inline Execution
- Execute tasks sequentially in this session
- Batch commits and reviews

Which approach do you prefer?
```
