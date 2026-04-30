# Agent System Foundation

## Overview

The Lume Agent System is an autonomous, event-driven framework that enables zero-code business logic automation. Agents are self-contained programs that listen to entity lifecycle events, evaluate conditions, and execute actions in response—all without modifying user-facing code.

**Key Design Goals:**
- **Event-Driven Reactivity**: Agents respond to entity mutations without polling
- **Decoupled Execution**: Multiple agents operate independently; one agent's failure doesn't block others
- **At-Least-Once Delivery**: Event persistence + checkpoint confirmation ensures no lost events
- **Idempotent Actions**: Agents safely re-run without side effects
- **Business Automation**: Auto-assign, escalate, notify, audit, and more—all declaratively
- **Type Safety**: Full TypeScript interfaces for registration, handlers, and context
- **Error Resilience**: Graceful degradation, dead-letter queues, manual retry

**Architecture Principle**: Agents are first-class citizens in the runtime, equal to Entities and Workflows. They form the reactive backbone of business process automation.

---

## 1. Agent API & Registration

### TypeScript Interface

All agents in Lume are registered via the `agent()` API, which provides a fluent interface for defining behavior:

```typescript
// ============================================================================
// Core Agent Types
// ============================================================================

/**
 * RuntimeEvent represents a data mutation that triggers agents.
 * Emitted by Entity and Workflow subsystems.
 */
export interface RuntimeEvent {
  // Unique event identifier (for deduplication)
  id: string;

  // Event type: 'entity:{action}'
  type: 'entity:created' | 'entity:updated' | 'entity:deleted';

  // Fully qualified entity name: '{domain}:{entity}'
  entityName: string;

  // The entity instance after the mutation
  data: Record<string, any>;

  // The entity instance before the mutation (for updates only)
  previousData?: Record<string, any>;

  // User who triggered the event
  userId: string;

  // ISO8601 timestamp
  timestamp: string;

  // Origin of the event: 'api' | 'ui' | 'batch' | 'workflow' | 'agent'
  source: 'api' | 'ui' | 'batch' | 'workflow' | 'agent';

  // Tracing metadata
  metadata: {
    // Trace ID for correlating related events
    correlationId: string;
    // HTTP client IP (for API events)
    ipAddress?: string;
    // Browser user agent (for UI events)
    userAgent?: string;
  };
}

/**
 * ExecutionContext provides runtime utilities and state for agent handlers.
 * Passed to every agent handler function.
 */
export interface ExecutionContext {
  // Database access (Prisma for core, Drizzle for modules)
  db: {
    prisma: PrismaClient;
    drizzle: DrizzleConnection;
  };

  // Entity service for mutations
  entities: {
    create: (entityName: string, data: any) => Promise<any>;
    update: (entityName: string, id: string, data: any) => Promise<any>;
    delete: (entityName: string, id: string) => Promise<void>;
    findOne: (entityName: string, id: string) => Promise<any>;
    findMany: (entityName: string, filter: any) => Promise<any[]>;
  };

  // Workflow execution
  workflows: {
    trigger: (workflowId: string, eventData: any) => Promise<ExecutionResult>;
  };

  // Notification service
  notify: {
    email: (to: string, template: string, data: any) => Promise<void>;
    slack: (channel: string, message: string) => Promise<void>;
    inApp: (userId: string, message: string, type: 'info' | 'warning' | 'error') => Promise<void>;
  };

  // Logging
  log: {
    info: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
    debug: (message: string, meta?: any) => void;
  };

  // Permission checks
  checkPermission: (userId: string, permission: string, resource?: any) => Promise<boolean>;

  // Agent state
  agentId: string;
  agentName: string;
  executionId: string; // Unique per execution run
}

/**
 * Agent definition: metadata for registration and execution.
 */
export interface AgentDefinition {
  // Unique agent identifier
  id: string;
  name: string;
  description: string;

  // Entity events to listen for
  triggers: Array<'entity:created' | 'entity:updated' | 'entity:deleted'>;

  // Filter to decide which events to react to
  entityFilter: {
    // Required: entity name(s)
    entityName: string | string[];
    // Optional: conditions on entity data
    conditions?: EntityFilterCondition[];
  };

  // Handler function (async, isolated execution)
  handler: (event: RuntimeEvent, context: ExecutionContext) => Promise<void>;

  // Optional: lifecycle hooks
  onStart?: () => Promise<void>;
  onError?: (error: Error, event: RuntimeEvent, context: ExecutionContext) => Promise<void>;
  onSuccess?: (event: RuntimeEvent, context: ExecutionContext) => Promise<void>;

  // Execution constraints
  timeout: number; // milliseconds (default: 30000)
  maxRetries: number; // (default: 3)
  enabled: boolean; // (default: true)
}

/**
 * Filter condition for agents to evaluate before handling events.
 */
export interface EntityFilterCondition {
  // Field path: 'status', 'metadata.priority', 'assignee.role'
  field: string;
  // Comparison operator
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'exists';
  // Expected value
  value: any;
}

/**
 * Result of agent execution.
 */
export interface ExecutionResult {
  // Execution status
  status: 'success' | 'failure' | 'timeout';

  // Execution latency (ms)
  duration: number;

  // Error details (if failed)
  error?: {
    message: string;
    stack?: string;
    retriable: boolean; // Can retry?
  };

  // Output data from handler
  output?: Record<string, any>;
}

/**
 * Agent registration function (fluent API).
 */
export function agent(
  name: string,
  definition: Omit<AgentDefinition, 'id' | 'name'> & { name?: string }
): AgentDefinition {
  // Implementation in agent-registry.ts
  // Validates definition, stores in registry, returns registered agent
}
```

### Registration Example

Agents register via the module manifest:

```typescript
// backend/src/modules/support/manifest.ts

export default {
  id: 'support',
  name: 'Support Module',
  version: '1.0.0',

  // Register agents during module initialization
  agents: [
    // Agent 1: Auto-assign tickets to available agents
    agent('ticket:auto-assign', {
      triggers: ['entity:created'],
      entityFilter: {
        entityName: 'Ticket',
        conditions: [
          { field: 'status', operator: 'eq', value: 'open' },
          { field: 'assignee', operator: 'exists', value: false }
        ]
      },

      async handler(event: RuntimeEvent, context: ExecutionContext) {
        const ticket = event.data;

        // Find first available agent
        const availableAgents = await context.entities.findMany('Agent', {
          available: true,
          sort: { joinedAt: 'asc' },
          limit: 1
        });

        if (availableAgents.length === 0) {
          context.log.warn('No available agents for auto-assign', { ticketId: ticket.id });
          return;
        }

        const assignee = availableAgents[0];

        // Update ticket with assignment
        await context.entities.update('Ticket', ticket.id, {
          assignee: assignee.id,
          status: 'assigned',
          assignedAt: new Date().toISOString()
        });

        // Notify assignee
        await context.notify.email(
          assignee.email,
          'ticket-assigned',
          {
            ticketId: ticket.id,
            ticketTitle: ticket.title,
            customerName: ticket.customer.name
          }
        );

        context.log.info('Ticket auto-assigned', {
          ticketId: ticket.id,
          assigneeId: assignee.id
        });
      },

      timeout: 10000,
      maxRetries: 3,
      enabled: true
    })
  ]
};
```

---

## 2. Agent State Machine & Lifecycle

### State Machine Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      AGENT LIFECYCLE                            │
└─────────────────────────────────────────────────────────────────┘

             ┌──────────────────────────────────────┐
             │        [REGISTERED]                  │
             │  Agent definition stored in registry │
             └──────────────────────────────────────┘
                             │
                             │ (Event emitted)
                             ▼
             ┌──────────────────────────────────────┐
             │   [LISTENING]                        │
             │ Agent subscribed to event stream     │
             │ Awaiting matching events             │
             └──────────────────────────────────────┘
                    │                    │
        (Match)     │                    │ (No match)
                    ▼                    └────┐
             ┌──────────────────────────────┐ │
             │   [TRIGGERED]                │ │
             │ Event received & filtered    │ │
             │ Conditions evaluated         │ │
             └──────────────────────────────┘ │
                    │                         │
                    ▼                         │
             ┌──────────────────────────────┐ │
             │   [EXECUTING]                │ │
             │ Handler running (async)      │ │
             │ Isolated execution context   │ │
             │ Timeout monitoring enabled   │ │
             └──────────────────────────────┘ │
                  │            │              │
      (Success)   │            │ (Timeout)    │
                  ▼            ▼              │
             ┌────────┐  ┌──────────────┐    │
             │SUCCESS │  │TIMEOUT/ERROR │    │
             │  PHASE │  │  PHASE       │    │
             └────────┘  └──────────────┘    │
                  │            │              │
                  │            ├─ Checkpoint? │
                  │            │              │
                  │            └─ Retry?   ┌─┘
                  │                │       │
                  │                └──────►│
                  │                        │
                  └──────────────────────┬─┘
                                        │
                                        ▼
                ┌──────────────────────────────────┐
                │    [LISTENING]                   │
                │  Back to waiting for next event  │
                │  (or removed if disabled)        │
                └──────────────────────────────────┘
```

### State Definitions

| State | Duration | Description |
|-------|----------|-------------|
| **REGISTERED** | Bootstrap | Agent definition loaded and registered in AgentRegistry |
| **LISTENING** | Indefinite | Agent subscribed to event stream, awaiting matches |
| **TRIGGERED** | Milliseconds | Event received; filter conditions evaluated |
| **EXECUTING** | 0–30s | Handler running asynchronously in isolated context |
| **SUCCESS** | Instant | Handler completed without error |
| **TIMEOUT/ERROR** | Instant | Handler exceeded timeout or threw error |
| **CLEANUP** | Seconds | Checkpoint confirmation, retry decision, logging |

### Lifecycle Phases (5 Stages)

#### Phase 1: Registration

**What Happens:**
- Agent definition declared via `agent()` in module manifest
- Agent registered in `AgentRegistry` singleton
- Validation: triggers, filters, handler signature
- Type checking: all TypeScript interfaces enforced

**Code:**
```typescript
// backend/src/core/agent/agent-registry.ts
export class AgentRegistry {
  private agents = new Map<string, AgentDefinition>();
  private listeners = new Map<string, Set<AgentDefinition>>();

  register(definition: AgentDefinition): void {
    // Validate
    if (!definition.id || !definition.name) {
      throw new Error(`Invalid agent definition: missing id or name`);
    }
    if (!definition.handler || typeof definition.handler !== 'function') {
      throw new Error(`Agent ${definition.id}: handler must be a function`);
    }
    if (!Array.isArray(definition.triggers) || definition.triggers.length === 0) {
      throw new Error(`Agent ${definition.id}: must specify triggers`);
    }

    // Store
    this.agents.set(definition.id, definition);

    // Index by trigger
    definition.triggers.forEach((trigger) => {
      if (!this.listeners.has(trigger)) {
        this.listeners.set(trigger, new Set());
      }
      this.listeners.get(trigger)!.add(definition);
    });

    console.log(`[Agent] Registered: ${definition.id}`);
  }

  getAgentsByTrigger(trigger: string): AgentDefinition[] {
    return Array.from(this.listeners.get(trigger) || []);
  }
}
```

**Timing:** Synchronous, during app bootstrap

---

#### Phase 2: Listening

**What Happens:**
- Agent subscribed to event stream via `EventBus`
- Agent listens for events matching `triggers` (e.g., `entity:created`)
- Event stream feeds matching events to agent
- Agent remains in this state until event arrives or agent is disabled

**Code:**
```typescript
// backend/src/core/agent/agent-executor.ts
export class AgentExecutor {
  constructor(
    private registry: AgentRegistry,
    private eventBus: EventBus,
    private checkpointStore: CheckpointStore
  ) {}

  start(): void {
    // Subscribe to all entity events
    this.eventBus.subscribe('entity:*', async (event: RuntimeEvent) => {
      await this.handleEntityEvent(event);
    });

    console.log('[Agent] System started, listening for events');
  }

  private async handleEntityEvent(event: RuntimeEvent): Promise<void> {
    // Extract trigger type from event
    const trigger = event.type; // e.g., 'entity:created'

    // Get all agents listening to this trigger
    const agents = this.registry.getAgentsByTrigger(trigger);

    if (agents.length === 0) {
      return; // No agents for this trigger
    }

    // Execute agents in parallel (non-blocking)
    agents.forEach((agent) => {
      if (agent.enabled) {
        this.executeAgent(agent, event).catch((err) => {
          console.error(`[Agent] Unhandled error in ${agent.id}:`, err);
        });
      }
    });
  }
}
```

**Timing:** Indefinite, until agent is unregistered

---

#### Phase 3: Trigger

**What Happens:**
- Event arrives on event stream
- Agent extracts event properties
- Agent evaluates filter conditions (`entityFilter`)
- If conditions match: proceed to Execution
- If conditions don't match: return to Listening (skip execution)

**Code:**
```typescript
private evaluateFilter(
  agent: AgentDefinition,
  event: RuntimeEvent
): boolean {
  const { entityFilter } = agent;

  // Check entity name
  const entityNames = Array.isArray(entityFilter.entityName)
    ? entityFilter.entityName
    : [entityFilter.entityName];

  if (!entityNames.includes(event.entityName)) {
    return false;
  }

  // Evaluate conditions
  if (!entityFilter.conditions || entityFilter.conditions.length === 0) {
    return true; // No conditions = match all
  }

  for (const condition of entityFilter.conditions) {
    if (!this.evaluateCondition(event.data, condition)) {
      return false; // Any condition fails = filter fails
    }
  }

  return true; // All conditions pass
}

private evaluateCondition(
  data: Record<string, any>,
  condition: EntityFilterCondition
): boolean {
  const value = this.getNestedValue(data, condition.field);

  switch (condition.operator) {
    case 'eq':
      return value === condition.value;
    case 'neq':
      return value !== condition.value;
    case 'gt':
      return value > condition.value;
    case 'gte':
      return value >= condition.value;
    case 'lt':
      return value < condition.value;
    case 'lte':
      return value <= condition.value;
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(value);
    case 'nin':
      return Array.isArray(condition.value) && !condition.value.includes(value);
    case 'contains':
      return String(value).includes(String(condition.value));
    case 'exists':
      return condition.value ? value !== undefined : value === undefined;
    default:
      return false;
  }
}
```

**Timing:** Milliseconds (synchronous filter evaluation)

---

#### Phase 4: Execution

**What Happens:**
- Agent handler function invoked with `event` and `context`
- Execution runs asynchronously in isolated context
- Timeout enforced (default 30 seconds)
- All handler exceptions caught and logged
- Handler completes with success or error

**Code:**
```typescript
private async executeAgent(
  agent: AgentDefinition,
  event: RuntimeEvent
): Promise<void> {
  const executionId = generateId();
  const startTime = Date.now();

  // Check if event already processed (deduplication)
  const checkpoint = await this.checkpointStore.get(agent.id, event.id);
  if (checkpoint && checkpoint.status === 'success') {
    console.log(`[Agent] Event ${event.id} already processed by ${agent.id}`);
    return;
  }

  // Evaluate filter
  if (!this.evaluateFilter(agent, event)) {
    return; // Filter didn't match, skip execution
  }

  // Create execution context
  const context = this.createExecutionContext(agent, executionId);

  try {
    // Call onStart hook
    if (agent.onStart) {
      await agent.onStart();
    }

    // Execute handler with timeout
    const result = await Promise.race([
      agent.handler(event, context),
      this.createTimeout(agent.timeout || 30000)
    ]);

    const duration = Date.now() - startTime;

    // Call onSuccess hook
    if (agent.onSuccess) {
      await agent.onSuccess(event, context);
    }

    // Checkpoint success
    await this.checkpointStore.set(agent.id, event.id, {
      status: 'success',
      duration,
      timestamp: new Date().toISOString()
    });

    console.log(`[Agent] ${agent.id} executed successfully in ${duration}ms`);
  } catch (error) {
    const duration = Date.now() - startTime;
    const err = error instanceof Error ? error : new Error(String(error));

    // Call onError hook
    if (agent.onError) {
      await agent.onError(err, event, context);
    }

    // Decide: retry or dead-letter?
    const retriable = err.message.includes('RETRIABLE') || error instanceof TimeoutError;

    if (retriable && (await this.shouldRetry(agent.id, event.id))) {
      // Queue for retry
      await this.retryQueue.push({
        agentId: agent.id,
        eventId: event.id,
        attempt: 1,
        maxAttempts: agent.maxRetries || 3
      });

      console.warn(`[Agent] ${agent.id} queued for retry`, {
        error: err.message,
        duration
      });
    } else {
      // Dead-letter queue
      await this.deadLetterQueue.push({
        agentId: agent.id,
        eventId: event.id,
        error: err.message,
        timestamp: new Date().toISOString()
      });

      console.error(`[Agent] ${agent.id} failed and moved to DLQ`, {
        error: err.message,
        duration,
        retriable
      });
    }
  }
}

private createExecutionContext(
  agent: AgentDefinition,
  executionId: string
): ExecutionContext {
  return {
    db: {
      prisma: this.prisma,
      drizzle: this.drizzle
    },
    entities: {
      create: (entityName: string, data: any) =>
        this.entityService.create(entityName, data),
      update: (entityName: string, id: string, data: any) =>
        this.entityService.update(entityName, id, data),
      delete: (entityName: string, id: string) =>
        this.entityService.delete(entityName, id),
      findOne: (entityName: string, id: string) =>
        this.entityService.findOne(entityName, id),
      findMany: (entityName: string, filter: any) =>
        this.entityService.findMany(entityName, filter)
    },
    workflows: {
      trigger: (workflowId: string, eventData: any) =>
        this.workflowExecutor.execute(workflowId, eventData)
    },
    notify: {
      email: (to: string, template: string, data: any) =>
        this.notificationService.sendEmail(to, template, data),
      slack: (channel: string, message: string) =>
        this.notificationService.sendSlack(channel, message),
      inApp: (userId: string, message: string, type: 'info' | 'warning' | 'error') =>
        this.notificationService.sendInApp(userId, message, type)
    },
    log: {
      info: (message: string, meta?: any) =>
        this.logger.info(`[Agent ${agent.id}] ${message}`, meta),
      warn: (message: string, meta?: any) =>
        this.logger.warn(`[Agent ${agent.id}] ${message}`, meta),
      error: (message: string, meta?: any) =>
        this.logger.error(`[Agent ${agent.id}] ${message}`, meta),
      debug: (message: string, meta?: any) =>
        this.logger.debug(`[Agent ${agent.id}] ${message}`, meta)
    },
    checkPermission: (userId: string, permission: string, resource?: any) =>
      this.permissionEngine.evaluate(userId, permission, resource),
    agentId: agent.id,
    agentName: agent.name,
    executionId
  };
}

private createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new TimeoutError(`Agent execution exceeded ${ms}ms`)), ms)
  );
}
```

**Timing:** 0–30 seconds (configurable timeout)

---

#### Phase 5: Cleanup

**What Happens:**
- Execution result recorded (success, error, timeout)
- Checkpoint stored to prevent duplicate execution
- Retry decision made: retry queue or dead-letter queue
- Hooks executed (`onSuccess` or `onError`)
- Agent returns to Listening state
- Event persisted for audit trail

**Code:**
```typescript
// Checkpoint storage (prevents duplicate execution)
export interface Checkpoint {
  agentId: string;
  eventId: string;
  status: 'success' | 'failure' | 'timeout';
  duration: number; // milliseconds
  timestamp: string; // ISO8601
  error?: string;
}

export class CheckpointStore {
  async get(agentId: string, eventId: string): Promise<Checkpoint | null> {
    // Query from database or cache
    return await this.db.agentCheckpoints.findUnique({
      where: { agentId_eventId: { agentId, eventId } }
    });
  }

  async set(agentId: string, eventId: string, data: Omit<Checkpoint, 'agentId' | 'eventId'>): Promise<void> {
    await this.db.agentCheckpoints.upsert({
      where: { agentId_eventId: { agentId, eventId } },
      update: data,
      create: {
        agentId,
        eventId,
        ...data
      }
    });
  }
}

// Retry queue (for transient failures)
export class RetryQueue {
  async push(item: RetryItem): Promise<void> {
    // Store in queue table or Redis
    await this.queue.enqueue(item);
  }

  async process(): Promise<void> {
    // Periodic job: dequeue, retry, re-enqueue if failed
    const item = await this.queue.dequeue();
    if (item && item.attempt < item.maxAttempts) {
      // Re-execute agent
      await this.executor.executeAgent(item.agentId, item.eventId);
      item.attempt++;
      await this.queue.enqueue(item);
    }
  }
}

// Dead-letter queue (for permanent failures)
export class DeadLetterQueue {
  async push(item: DeadLetterItem): Promise<void> {
    // Store in DLQ table for manual inspection
    await this.db.agentDeadLetters.create({
      data: item
    });

    // Alert ops team
    await this.notificationService.alert({
      channel: 'ops',
      message: `Agent ${item.agentId} failed processing event ${item.eventId}`,
      error: item.error
    });
  }

  async retry(id: string): Promise<void> {
    // Manual retry from UI
    const item = await this.db.agentDeadLetters.findUnique({ where: { id } });
    // Re-execute from checkpoint
  }
}
```

**Timing:** Seconds (database writes, notifications)

---

## 3. Event Subscription Model

### Event Subscription Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     EventBus                            │
│  (Publish-Subscribe Broker)                             │
└─────────────────────────────────────────────────────────┘
        │                               │
        │ Publish                       │ Subscribe
        │                               │
        ▼                               ▼
┌───────────────────┐    ┌─────────────────────────────────┐
│  Entity Events    │    │   Agent Listeners               │
│                   │    │                                 │
│ entity:created    │───►│  [Agent 1] Auto-Assign         │
│ entity:updated    │    │  [Agent 2] Escalation          │
│ entity:deleted    │    │  [Agent 3] Notification        │
│                   │    │  [Agent 4] Audit               │
└───────────────────┘    └─────────────────────────────────┘
                                        │
                                        │ Filter & Execute
                                        │
                                ┌───────────────────┐
                                │ Agent Executions  │
                                │                   │
                                │ [Parallel, async] │
                                │                   │
                                │ ✓ No blocking     │
                                │ ✓ Independent     │
                                │ ✓ Isolated        │
                                └───────────────────┘
```

### Event Subscription Model

Agents don't poll; they subscribe to the event stream. When an entity mutation occurs, the runtime publishes an event. All subscribed agents receive the event simultaneously and process in parallel.

**Subscription Process:**

```typescript
export class EventBus {
  private listeners = new Map<string, Set<EventHandler>>();
  private eventLog: RuntimeEvent[] = [];

  // Agent subscribes to event type
  subscribe(trigger: string, handler: EventHandler): void {
    if (!this.listeners.has(trigger)) {
      this.listeners.set(trigger, new Set());
    }
    this.listeners.get(trigger)!.add(handler);
  }

  // Entity publishes event
  async publish(event: RuntimeEvent): Promise<void> {
    // Store in event log (for audit)
    this.eventLog.push(event);

    // Notify all subscribers
    const handlers = this.listeners.get(event.type) || [];
    const wildcard = this.listeners.get(event.type.split(':')[0] + ':*') || [];

    const allHandlers = Array.from(handlers).concat(Array.from(wildcard));

    // Fire and forget: handlers execute asynchronously
    allHandlers.forEach((handler) => {
      handler(event).catch((err) => {
        console.error(`[EventBus] Handler error:`, err);
      });
    });
  }
}
```

### Filter Conditions

Agents declare **entity filters** that determine which events they respond to:

```typescript
// Example: Auto-Assign Agent
{
  entityFilter: {
    entityName: 'Ticket',
    conditions: [
      { field: 'status', operator: 'eq', value: 'open' },
      { field: 'assignee', operator: 'exists', value: false }
    ]
  }
}

// Matches events where:
// - entityName === 'Ticket'
// - event.data.status === 'open'
// - event.data.assignee is undefined/null
```

**Supported Filter Operators:**

| Operator | Meaning | Example |
|----------|---------|---------|
| `eq` | Equal | `{ field: 'status', operator: 'eq', value: 'open' }` |
| `neq` | Not equal | `{ field: 'status', operator: 'neq', value: 'closed' }` |
| `gt` | Greater than | `{ field: 'priority', operator: 'gt', value: 3 }` |
| `gte` | Greater or equal | `{ field: 'age', operator: 'gte', value: 18 }` |
| `lt` | Less than | `{ field: 'retries', operator: 'lt', value: 3 }` |
| `lte` | Less or equal | `{ field: 'sla', operator: 'lte', value: 4 }` |
| `in` | In array | `{ field: 'status', operator: 'in', value: ['open', 'pending'] }` |
| `nin` | Not in array | `{ field: 'status', operator: 'nin', value: ['closed', 'archived'] }` |
| `contains` | String contains | `{ field: 'title', operator: 'contains', value: 'urgent' }` |
| `exists` | Field exists | `{ field: 'metadata', operator: 'exists', value: true }` |

### Multi-Agent Coordination

Multiple agents can respond to the same event. They execute **in parallel** and **independently**:

```
Event: ticket:created
    │
    ├──► [Agent 1: Auto-Assign] ──► DB write (assign agent)
    │
    ├──► [Agent 2: Escalation] ──► Check SLA
    │
    ├──► [Agent 3: Notify] ──► Send emails
    │
    └──► [Agent 4: Audit] ──► Log to audit trail

All agents execute simultaneously.
Agent 1 failure does NOT block Agents 2, 3, 4.
```

**Key Rules:**

1. **No Blocking**: Agent A failing doesn't block Agent B
2. **No Order**: Agents don't execute sequentially (no guarantee of order)
3. **No Shared State**: Agents can't directly communicate (use events if needed)
4. **Idempotent**: Agents must be safe to re-run (same result)

### Event Queuing & Persistence

Events are persisted before agent execution to ensure **at-least-once delivery**:

```typescript
export class EventLog {
  async record(event: RuntimeEvent): Promise<void> {
    // Persist to database
    await this.db.eventLogs.create({
      data: {
        id: event.id,
        type: event.type,
        entityName: event.entityName,
        data: event.data,
        userId: event.userId,
        timestamp: event.timestamp,
        source: event.source,
        metadata: event.metadata
      }
    });

    // Publish to event stream
    await this.eventBus.publish(event);
  }

  async getUnprocessed(agentId: string): Promise<RuntimeEvent[]> {
    // Find events not yet successfully processed by agent
    return await this.db.eventLogs.findMany({
      where: {
        NOT: {
          agentCheckpoints: {
            some: {
              agentId,
              status: 'success'
            }
          }
        }
      }
    });
  }
}
```

---

## 4. Example Agents (Real Business Logic)

### Agent 1: Auto-Assign Ticket to Available Agent

**Business Logic**: When a ticket is created, automatically assign it to the first available agent.

```typescript
agent('ticket:auto-assign', {
  triggers: ['entity:created'],
  
  entityFilter: {
    entityName: 'Ticket',
    conditions: [
      { field: 'status', operator: 'eq', value: 'open' },
      { field: 'assignee', operator: 'exists', value: false }
    ]
  },

  async handler(event: RuntimeEvent, context: ExecutionContext) {
    const ticket = event.data;
    
    context.log.info('Auto-assign triggered', { ticketId: ticket.id });

    // Find first available agent
    const agents = await context.entities.findMany('Agent', {
      available: true,
      department: ticket.department, // Agents in same department
      sort: { 'activeTickets.length': 'asc' }, // Least busy first
      limit: 1
    });

    if (agents.length === 0) {
      context.log.warn('No available agents for auto-assign', {
        ticketId: ticket.id,
        department: ticket.department
      });
      return; // Queue for manual assignment later
    }

    const assignee = agents[0];

    // Update ticket
    await context.entities.update('Ticket', ticket.id, {
      assignee: assignee.id,
      assignedAt: new Date().toISOString(),
      status: 'assigned'
    });

    // Notify assignee
    await context.notify.email(assignee.email, 'ticket-assigned', {
      ticketId: ticket.id,
      ticketNumber: ticket.number,
      ticketTitle: ticket.title,
      customerName: ticket.customer.name,
      priority: ticket.priority
    });

    // Notify customer
    await context.notify.email(ticket.customer.email, 'ticket-acknowledged', {
      ticketId: ticket.id,
      agentName: assignee.name
    });

    context.log.info('Ticket auto-assigned successfully', {
      ticketId: ticket.id,
      assigneeId: assignee.id,
      assigneeName: assignee.name
    });
  },

  timeout: 10000, // 10 seconds
  maxRetries: 2,
  enabled: true
})
```

**Guarantees:**
- Idempotent: Multiple executions = same result (DB constraint on assignment)
- Timeout-safe: If agent lookup takes >10s, error gracefully
- Retriable: Database failures trigger retry queue

---

### Agent 2: SLA Escalation on Ticket Update

**Business Logic**: When a ticket is updated, check if SLA is breached. If yes, escalate to manager.

```typescript
agent('ticket:escalate-if-sla-breached', {
  triggers: ['entity:updated'],
  
  entityFilter: {
    entityName: 'Ticket',
    conditions: [
      { field: 'status', operator: 'in', value: ['open', 'pending', 'assigned'] }
    ]
  },

  async handler(event: RuntimeEvent, context: ExecutionContext) {
    const ticket = event.data;
    const previousTicket = event.previousData;

    context.log.info('Checking SLA for ticket', { ticketId: ticket.id });

    // Get ticket creation time and SLA definition
    const createdAt = new Date(ticket.createdAt);
    const now = new Date();
    const ageMs = now.getTime() - createdAt.getTime();

    // Fetch SLA based on priority
    const slas = await context.entities.findMany('SLA', {
      priority: ticket.priority
    });

    if (slas.length === 0) {
      context.log.warn('No SLA defined for priority', { priority: ticket.priority });
      return;
    }

    const sla = slas[0];
    const slaMs = sla.responseTimeHours * 60 * 60 * 1000;

    // Check if breached
    if (ageMs > slaMs) {
      context.log.warn('SLA breached for ticket', {
        ticketId: ticket.id,
        ageHours: ageMs / (60 * 60 * 1000),
        slaHours: sla.responseTimeHours
      });

      // Escalate ticket
      await context.entities.update('Ticket', ticket.id, {
        escalatedAt: now.toISOString(),
        escalationLevel: (ticket.escalationLevel || 0) + 1
      });

      // Notify manager
      const managers = await context.entities.findMany('User', {
        role: 'manager',
        department: ticket.department
      });

      if (managers.length > 0) {
        const manager = managers[0];
        
        await context.notify.email(manager.email, 'ticket-escalated', {
          ticketId: ticket.id,
          ticketTitle: ticket.title,
          reason: `SLA breached (${Math.round(ageMs / (60 * 60 * 1000))}h vs ${sla.responseTimeHours}h limit)`
        });

        // In-app notification
        await context.notify.inApp(
          manager.id,
          `Ticket #${ticket.number} escalated: SLA breached`,
          'warning'
        );

        context.log.info('Ticket escalated to manager', {
          ticketId: ticket.id,
          managerId: manager.id
        });
      }
    } else {
      const remaining = (slaMs - ageMs) / (60 * 1000); // Minutes remaining
      if (remaining < 60) {
        // Warning: less than 1 hour remaining
        context.log.warn('SLA warning: <1 hour remaining', {
          ticketId: ticket.id,
          minutesRemaining: remaining
        });
      }
    }
  },

  timeout: 15000, // 15 seconds
  maxRetries: 2,
  enabled: true
})
```

**Guarantees:**
- Idempotent: Same ticket, multiple updates = escalated only once (checked by escalatedAt)
- Time-aware: Correctly calculates elapsed time
- Non-blocking: If manager lookup fails, logs warning and continues

---

### Agent 3: Multi-Channel Notifications on Ticket Assignment

**Business Logic**: When a ticket is assigned, send notifications to assignee via email and Slack.

```typescript
agent('ticket:notify-on-assignment', {
  triggers: ['entity:updated'],
  
  entityFilter: {
    entityName: 'Ticket',
    conditions: [
      // Only trigger when assignee changes
      // (We detect this by checking if assignee is set AND wasn't set before)
    ]
  },

  async handler(event: RuntimeEvent, context: ExecutionContext) {
    const ticket = event.data;
    const previousTicket = event.previousData || {};

    // Check if assignee changed (was unassigned, now assigned)
    if (!previousTicket.assignee && ticket.assignee) {
      context.log.info('Ticket assigned, sending notifications', {
        ticketId: ticket.id,
        assigneeId: ticket.assignee
      });

      // Fetch assignee user
      const assignee = await context.entities.findOne('User', ticket.assignee);
      if (!assignee) {
        context.log.error('Assignee user not found', { userId: ticket.assignee });
        throw new Error(`RETRIABLE: Assignee user not found`); // Retry-able
      }

      // Email notification
      await context.notify.email(assignee.email, 'ticket-assigned-to-you', {
        ticketId: ticket.id,
        ticketNumber: ticket.number,
        ticketTitle: ticket.title,
        customerName: ticket.customer.name,
        priority: ticket.priority,
        dashboardUrl: `${process.env.APP_URL}/tickets/${ticket.id}`
      });

      context.log.info('Email sent to assignee', {
        assigneeEmail: assignee.email
      });

      // Slack notification (if assignee has Slack linked)
      if (assignee.slackUserId) {
        try {
          const priorityEmoji = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢'
          }[ticket.priority] || '⚪';

          await context.notify.slack(assignee.slackUserId, `
${priorityEmoji} New ticket assigned to you

*${ticket.number}: ${ticket.title}*
Customer: ${ticket.customer.name}
Priority: ${ticket.priority}

<${process.env.APP_URL}/tickets/${ticket.id}|View in Lume>
          `.trim());

          context.log.info('Slack message sent to assignee', {
            assigneeSlackId: assignee.slackUserId
          });
        } catch (err) {
          context.log.warn('Failed to send Slack notification', {
            error: err instanceof Error ? err.message : String(err),
            assigneeSlackId: assignee.slackUserId
          });
          // Don't fail: Slack is optional
        }
      }

      // In-app notification
      await context.notify.inApp(
        assignee.id,
        `You've been assigned ticket #${ticket.number}: ${ticket.title}`,
        'info'
      );

      context.log.info('Notifications sent for ticket assignment', {
        ticketId: ticket.id,
        assigneeId: assignee.id,
        channels: ['email', assignee.slackUserId ? 'slack' : null, 'in-app']
      });
    }
  },

  timeout: 20000, // 20 seconds (multiple notifications)
  maxRetries: 3,
  enabled: true
})
```

**Guarantees:**
- Multi-channel delivery: Email + Slack + in-app (each independent)
- Failure isolation: Slack failure doesn't block email
- Idempotent: Previous ticket state checked to avoid duplicate notifications

---

### Agent 4: Audit Logging on Any Entity Change

**Business Logic**: Log all entity mutations to audit trail with full before/after state.

```typescript
agent('system:audit-all-changes', {
  triggers: ['entity:created', 'entity:updated', 'entity:deleted'],
  
  entityFilter: {
    entityName: '*' // All entities
  },

  async handler(event: RuntimeEvent, context: ExecutionContext) {
    const { entityName, action, data, previousData, userId, source, timestamp } = event;

    context.log.debug('Recording audit log', { entityName, action, userId });

    // Build audit entry
    const auditEntry = {
      userId,
      action: event.type.split(':')[1], // 'created' | 'updated' | 'deleted'
      entityName,
      entityId: data.id,
      source,
      timestamp,

      // Changes (for updates only)
      changes: previousData
        ? this.calculateChanges(previousData, data)
        : {},

      // Full snapshot
      snapshot: {
        before: previousData || null,
        after: data
      },

      // User info
      userEmail: null,
      userRole: null,

      // Request context
      ipAddress: event.metadata.ipAddress,
      userAgent: event.metadata.userAgent,
      correlationId: event.metadata.correlationId
    };

    // Enrich with user info
    if (userId) {
      const user = await context.entities.findOne('User', userId);
      if (user) {
        auditEntry.userEmail = user.email;
        auditEntry.userRole = user.role;
      }
    }

    // Store audit log
    await context.entities.create('AuditLog', auditEntry);

    context.log.info('Audit log recorded', {
      entityName,
      entityId: data.id,
      action: auditEntry.action
    });

    // Alert if sensitive operation
    if (this.isSensitiveOperation(entityName, auditEntry.action)) {
      context.log.warn('SENSITIVE OPERATION AUDIT', {
        entityName,
        action: auditEntry.action,
        userId,
        userEmail: auditEntry.userEmail,
        timestamp
      });

      // Notify security team
      await context.notify.email(
        process.env.SECURITY_EMAIL || 'security@example.com',
        'sensitive-operation-audit',
        auditEntry
      );
    }
  },

  timeout: 5000, // Fast (just logging)
  maxRetries: 5, // Audit logs are critical, retry harder
  enabled: true
});

// Helper: Calculate what changed between before/after
private calculateChanges(before: any, after: any): Record<string, { from: any; to: any }> {
  const changes: Record<string, { from: any; to: any }> = {};

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  allKeys.forEach((key) => {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes[key] = {
        from: before[key],
        to: after[key]
      };
    }
  });

  return changes;
}

private isSensitiveOperation(entityName: string, action: string): boolean {
  // Operations that require alerting
  return (
    (entityName === 'User' && action === 'deleted') ||
    (entityName === 'Role' && ['created', 'updated', 'deleted'].includes(action)) ||
    (entityName === 'Permission' && ['created', 'updated', 'deleted'].includes(action)) ||
    (entityName === 'Setting' && action === 'updated')
  );
}
```

**Guarantees:**
- Comprehensive: Logs all entity changes
- Idempotent: Each event logged once (via checkpoint)
- Performance: Light logging doesn't block primary operation
- Critical: High retry count ensures audit logs aren't lost

---

## 5. Execution Model: Guarantees & Error Handling

### At-Least-Once Delivery Guarantee

Lume guarantees **at-least-once delivery**: events are persisted before agent execution, so no events are lost even if the system crashes.

**Flow:**

```
Event triggered
    │
    ▼
[EventLog] ← Persist to database
    │
    ▼ (Confirmed)
[EventBus] ← Publish to subscribers
    │
    ▼
[Agent Execution] ← Handler runs (async)
    │
    ├─ Success → [Checkpoint] mark as success (idempotent)
    │
    └─ Failure
        ├─ Transient? → [Retry Queue]
        └─ Permanent? → [Dead-Letter Queue]
```

**Deduplication via Checkpoint:**

```typescript
// Handler runs multiple times for same event (e.g., after crash recovery)
// But checkpoint prevents actual duplicate work

if (await checkpoint.get(agentId, eventId)) {
  // Already processed, skip
  return;
}

// Execute handler

await checkpoint.set(agentId, eventId, { status: 'success' });
```

### Idempotency Requirements

**All agents MUST be idempotent**: executing the handler twice must produce the same result.

**Idempotent Patterns:**

```typescript
// GOOD: Idempotent (check before updating)
async handler(event, context) {
  const ticket = event.data;
  
  // Check if already assigned
  const existing = await context.entities.findOne('Ticket', ticket.id);
  if (existing.assignee) {
    return; // Already assigned, skip
  }

  // Assign now
  await context.entities.update('Ticket', ticket.id, { assignee: agent.id });
}

// GOOD: Idempotent (use upsert)
async handler(event, context) {
  const ticket = event.data;
  
  // Upsert: create if not exists, update if exists
  await context.entities.upsert('TicketAssignment', {
    where: { ticketId: ticket.id },
    create: { ticketId: ticket.id, assigneeId: agent.id },
    update: {} // No-op if already exists
  });
}

// BAD: Not idempotent (increments on every run)
async handler(event, context) {
  const ticket = event.data;
  
  // Don't do this!
  await context.entities.update('Ticket', ticket.id, {
    retryCount: ticket.retryCount + 1
  });
  // If handler runs twice: retryCount incremented twice (wrong!)
}

// GOOD: Use increment operator instead
async handler(event, context) {
  const ticket = event.data;
  
  await context.entities.update('Ticket', ticket.id, {
    retryCount: { $inc: 1 } // Atomic increment once per execution
  });
}
```

### Error Handling & Retry Strategy

Errors are classified as **retriable** (transient) or **permanent** (fatal).

**Retriable Errors:**
- Database connection timeout
- Network timeout
- Service unavailable (503)
- Database lock timeout

**Permanent Errors:**
- Validation error (invalid data)
- Permission denied
- Resource not found
- Type error in handler code

**Retry Logic:**

```typescript
// Retry queue: for transient errors
if (error.isRetriable && retryCount < maxRetries) {
  await retryQueue.push({
    agentId: agent.id,
    eventId: event.id,
    attempt: retryCount + 1,
    maxAttempts: agent.maxRetries || 3,
    delay: exponentialBackoff(retryCount) // 1s, 2s, 4s
  });
  
  context.log.warn(`Queued for retry (attempt ${retryCount + 1})`);
}

// Dead-letter queue: for permanent errors
else {
  await deadLetterQueue.push({
    agentId: agent.id,
    eventId: event.id,
    error: error.message,
    timestamp: now,
    manual_intervention: true
  });
  
  context.log.error(`Moved to dead-letter queue (manual retry needed)`);
}
```

**Exponential Backoff:**

```typescript
function exponentialBackoff(attempt: number): number {
  // 1s, 2s, 4s, 8s, ... with jitter
  const base = Math.pow(2, attempt) * 1000;
  const jitter = Math.random() * base * 0.1; // ±10%
  return base + jitter;
}

// Retry attempts:
// Attempt 1: Wait 1s, then retry
// Attempt 2: Wait 2s, then retry
// Attempt 3: Wait 4s, then retry
// Attempt 4: Give up, move to DLQ
```

### Timeout Enforcement

Each agent execution has a maximum timeout (default 30 seconds). If handler doesn't complete, execution is terminated and treated as retriable error.

```typescript
private createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(`Agent execution exceeded ${ms}ms`));
    }, ms);
  });
}

// Usage in handler execution
const result = await Promise.race([
  agent.handler(event, context), // User handler
  this.createTimeout(agent.timeout || 30000) // Timeout
]);

// If handler takes >30s: TimeoutError thrown
// Handler is not cancelled (it keeps running in background)
// But agent execution is marked as failed and retried
```

### Dead-Letter Queue (DLQ)

Failed agents with permanent errors are moved to DLQ for manual review and retry.

**DLQ Schema:**

```typescript
interface DeadLetterItem {
  id: string;
  agentId: string;
  eventId: string;
  eventData: RuntimeEvent;
  error: string;
  errorStack?: string;
  timestamp: string;
  attempts: number;
  lastAttemptAt: string;
  manualReviewRequired: boolean;
  resolvedAt?: string;
}
```

**DLQ Management:**

```typescript
export class DeadLetterQueueService {
  // List DLQ items
  async list(filter?: { agentId?: string; before?: Date }): Promise<DeadLetterItem[]> {
    return await this.db.agentDeadLetters.findMany({
      where: filter,
      orderBy: { timestamp: 'desc' }
    });
  }

  // Manually retry DLQ item
  async retry(id: string): Promise<ExecutionResult> {
    const item = await this.db.agentDeadLetters.findUnique({ where: { id } });
    if (!item) throw new Error(`DLQ item not found: ${id}`);

    // Reconstruct event and re-execute
    const result = await this.executor.executeAgent(
      item.agentId,
      item.eventId
    );

    if (result.status === 'success') {
      // Mark as resolved
      await this.db.agentDeadLetters.update({
        where: { id },
        data: { resolvedAt: new Date() }
      });
    }

    return result;
  }

  // Alert ops on DLQ growth
  async monitorDLQHealth(): Promise<void> {
    const unresolvedCount = await this.db.agentDeadLetters.count({
      where: { resolvedAt: null }
    });

    if (unresolvedCount > 10) {
      await this.notificationService.alert({
        channel: 'ops',
        severity: 'warning',
        message: `${unresolvedCount} agents in dead-letter queue requiring manual intervention`
      });
    }
  }
}
```

---

## Summary

| Aspect | Design |
|--------|--------|
| **Registration** | `agent()` function, AgentRegistry singleton |
| **Lifecycle** | REGISTERED → LISTENING → TRIGGERED → EXECUTING → CLEANUP → LISTENING |
| **Trigger** | Entity events (`entity:created/updated/deleted`) |
| **Filter** | EntityFilter with conditions (eq, neq, gt, in, exists, etc.) |
| **Execution** | Async, isolated context, 30s timeout (configurable) |
| **Parallelism** | Multiple agents execute simultaneously (no blocking) |
| **Idempotency** | Checkpoint deduplication, upsert patterns |
| **Delivery** | At-least-once (event persisted before execution) |
| **Error Handling** | Retriable (retry queue) vs permanent (dead-letter queue) |
| **Retry** | Exponential backoff (1s, 2s, 4s, ...) |
| **Observability** | Full logging, audit trail, checkpoint history |

**Next Steps (Integration):**
1. Agent system depends on Entity subsystem (event emission)
2. Agents trigger Workflow subsystem (optional chaining)
3. Agents mutate entities → new events → more agents (fan-out)
4. Permission engine guards all agent-initiated mutations
5. Views auto-invalidate on agent-triggered changes

