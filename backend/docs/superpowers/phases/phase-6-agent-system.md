# Phase 6: Agent System (Weeks 6-7)

## Overview

Phase 6 implements reactive agents that automatically respond to entity changes. Agents execute actions (escalate, workflow trigger, mutate) based on event triggers (onCreate, onUpdate, onDelete) or cron schedules, with optional condition evaluation to refine when they execute.

## Completed Components

### 1. Agent Executor

**File:** `backend/src/domains/agent/agent-executor.js`

Executes agent actions synchronously or asynchronously:

**Methods:**
- `executeSync(agent, triggerData, executionContext)` — Execute immediately
- `executeAsync(agentId, agent, triggerData, executionContext)` — Queue to BullMQ

**Action Types:**

1. **Escalate** — Update record fields
   ```javascript
   {
     type: 'escalate',
     config: {
       updates: { priority: 'urgent', assignedTo: 5 }
     }
   }
   ```

2. **Workflow** — Trigger workflow execution
   ```javascript
   {
     type: 'workflow',
     config: {
       workflowId: 'notify_customer',
       workflow: { id, steps, ... } // Optional workflow definition
     }
   }
   ```

3. **Mutate** — Arbitrary record updates
   ```javascript
   {
     type: 'mutate',
     config: {
       updates: { lastChecked: 'now', checkCount: 5 }
     }
   }
   ```

**Features:**
- Safe action execution with error handling
- Async queuing for long-running operations
- Integration with runtime, workflow executor, and queue manager
- Fallback to sync if queue manager unavailable

### 2. Agent Store

**File:** `backend/src/domains/agent/agent-store.js`

Central management of agent definitions:

**Methods:**
- `register(agentDef)` — Register agent with validation
- `get(id)` — Retrieve single agent
- `getByEntity(slug)` — Get all agents for entity
- `getByEvent(slug, triggerEvent)` — Get enabled agents by trigger event
- `getScheduled()` — Get all scheduled agents
- `update(id, updates)` — Modify agent definition
- `unregister(id)` — Remove agent
- `clear()` — Clear all agents

**Validation Rules:**
- Requires: id, slug, triggerEvent, action
- Valid triggerEvents: onCreate, onUpdate, onDelete, scheduled, manual
- Valid action types: escalate, workflow, mutate
- Scheduled trigger requires cron schedule expression

**Storage:**
- In-memory Map by ID
- Index by entity slug
- Index by event (slug:triggerEvent)
- Auto-registers to MetadataRegistry

### 3. Trigger Evaluator

**File:** `backend/src/domains/agent/trigger-evaluator.js`

Evaluates ABAC trigger expressions using safe expression evaluator:

**Methods:**
- `evaluate(trigger, record, executionContext)` — Check if trigger condition met
- `evaluateMany(trigger, records, executionContext)` — Filter records matching trigger
- `describe(trigger)` — Human-readable trigger description
- `validate(trigger)` — Check trigger syntax validity

**Trigger Examples:**
```javascript
// Simple conditions
'data.status == "open"'
'data.priority != "low"'
'data.daysOpen > 2'

// Complex expressions
'data.status != "closed" AND data.daysOpen > 2'
'data.priority == "urgent" OR data.severity > 8'
'data.status == "open" AND (data.assigned TO == user.userId OR user.roles == "manager")'
```

**Features:**
- Uses ExpressionEvaluator from Phase 3 (safe, no dynamic code)
- Supports AND, OR, NOT operators
- Supports comparison operators: ==, !=, >, <, >=, <=
- References: user.field, data.field
- Graceful error handling
- Validation of syntax

### 4. Cron Scheduler

**File:** `backend/src/domains/agent/cron-scheduler.js`

Manages cron job scheduling for scheduled agents using BullMQ:

**Methods:**
- `schedule(agent)` — Register repeatable BullMQ job
- `unschedule(agentId)` — Remove repeatable job
- `reschedule(agentId, updatedAgent)` — Update schedule
- `scheduleMany(agents)` — Schedule multiple agents
- `unscheduleMany(agentIds)` — Unschedule multiple agents
- `getScheduled()` — Get all scheduled agents
- `isScheduled(agentId)` — Check if agent scheduled
- `clearAll()` — Unschedule all agents

**Features:**
- BullMQ repeatable job integration
- Graceful fallback if QueueManager unavailable
- Job ID tracking per agent
- Batch operations support

### 5. Test Coverage

**Unit Tests:**

**`backend/tests/unit/agent-executor.test.js`** (15+ tests)
- Escalate action execution
- Workflow action execution
- Mutate action execution
- Error handling (missing runtime, unknown action types)
- Async execution and queueing
- Fallback to sync mode

**`backend/tests/unit/agent-store.test.js`** (20+ tests)
- Agent registration and retrieval
- Get by entity, by event
- Get scheduled agents
- Update with re-validation
- Unregister and clear
- Comprehensive validation rules
- Multiple entities management
- Event-specific filtering

**`backend/tests/unit/trigger-evaluator.test.js`** (25+ tests)
- Simple conditions (==, !=, >, <)
- Complex expressions (AND, OR)
- User context references
- No trigger execution
- Evaluate many records
- Trigger description
- Trigger validation
- Real-world scenarios
- Error handling

**Integration Tests:**

**`backend/tests/integration/agent-system.test.js`** (10+ scenarios)
- Auto-escalation workflow
- Event-triggered agents (onCreate, onUpdate, onDelete)
- Multiple agents on same event
- Disabled agent filtering
- Conditional agent execution
- Scheduled agent retrieval
- Agent lifecycle (register → update → unregister)
- Comprehensive ticket management scenario
- Action type execution (escalate, workflow, mutate)

## Architecture

### Agent Execution Flow

```
Entity Operation (CREATE/UPDATE/DELETE)
    ↓
[Stage 80] EventEmitterInterceptor
    ↓
Extract entity.agents[] matching operation event
    ↓
For each matching enabled agent:
  ├─ Check if trigger condition met: TriggerEvaluator.evaluate()
  ├─ If trigger true:
  │  ├─ AgentExecutor.executeSync() for immediate agents
  │  └─ AgentExecutor.executeAsync() for background agents
  │
  ├─ Escalate: Update record via runtime.execute()
  ├─ Workflow: Queue workflow via workflowExecutor
  └─ Mutate: Update record via runtime.execute()
    ↓
Response
```

### Scheduled Agent Execution

```
Cron Trigger (via BullMQ repeatable job)
    ↓
QueueProcessor: agents queue
    ↓
Retrieve scheduled agent definition
    ↓
Get all records for entity (batch)
    ↓
Filter via TriggerEvaluator.evaluateMany()
    ↓
Execute agent on matching records
    ↓
Update database with results
```

## Usage Examples

### Define Agents in Entity

```javascript
const Ticket = defineEntity({
  slug: 'ticket',
  fields: [
    defineField('title', 'text'),
    defineField('status', 'select'),
    defineField('priority', 'select'),
    defineField('daysOpen', 'number', { computed: true })
  ],
  agents: [
    // Auto-escalate old open tickets
    {
      id: 'auto_escalate',
      triggerEvent: 'scheduled',
      schedule: '0 * * * *', // Hourly
      trigger: 'data.status != "closed" && data.daysOpen > 2',
      action: {
        type: 'escalate',
        config: {
          updates: {
            priority: 'urgent'
          }
        }
      }
    },
    
    // Notify on creation
    {
      id: 'notify_on_create',
      triggerEvent: 'onCreate',
      action: {
        type: 'workflow',
        config: {
          workflowId: 'ticket_notify_customer'
        }
      }
    },
    
    // Update metrics on completion
    {
      id: 'update_metrics_on_close',
      triggerEvent: 'onUpdate',
      trigger: 'data.status == "closed"',
      action: {
        type: 'mutate',
        config: {
          updates: {
            closedAt: 'now',
            daysToClose: 'now - createdAt'
          }
        }
      }
    }
  ]
});
```

### Register Agent Manually

```javascript
const escalateAgent = {
  id: 'critical_priority',
  slug: 'ticket',
  triggerEvent: 'onUpdate',
  trigger: 'data.priority == "critical"',
  enabled: true,
  action: {
    type: 'escalate',
    config: {
      updates: {
        assignedTo: 'manager_id',
        escalationLevel: 2
      }
    }
  },
  description: 'Auto-escalate critical tickets to management'
};

await agentStore.register(escalateAgent);
```

### List Available Agents

```javascript
// Get all agents for ticket entity
const agents = await agentStore.getByEntity('ticket');

// Get onCreate agents (what fires when creating new ticket)
const createAgents = await agentStore.getByEvent('ticket', 'onCreate');

// Get scheduled agents
const scheduledAgents = await agentStore.getScheduled();
```

### Evaluate Trigger on Batch

```javascript
// Get all urgent open tickets
const tickets = [...];

// Filter only those matching escalation criteria
const toEscalate = await TriggerEvaluator.evaluateMany(
  'data.status != "closed" AND data.daysOpen > 2',
  tickets,
  executionContext
);

// Execute agent on matching records
for (const ticket of toEscalate) {
  await agentExecutor.executeSync(escalateAgent, {
    record: ticket,
    entity: { slug: 'ticket' }
  }, executionContext);
}
```

## Integration with Event Emitter

The existing **EventEmitterInterceptor** (Stage 80) is extended to:
1. Extract entity.agents[] array
2. Filter agents by triggerEvent (onCreate, onUpdate, onDelete)
3. For each enabled agent:
   - Evaluate trigger condition if present
   - Execute matching agents via AgentExecutor
4. Queue scheduled agents to BullMQ agents queue

## Real-World Scenarios

### Ticket Auto-Escalation
```
Agent: auto_escalate
Trigger: Open for > 2 days
Action: Set priority to urgent, assign to manager
Schedule: Every hour
Effect: Old tickets automatically escalated without human intervention
```

### Customer Notification
```
Agent: notify_on_create
Trigger: None (always execute)
Action: Queue workflow "send_confirmation_email"
Event: onCreate
Effect: Customer automatically notified on ticket creation
```

### Compliance Check
```
Agent: sla_check
Trigger: Priority > 5 OR assignedTo is null
Action: Mutate to add compliance_flag = true
Schedule: Every 30 minutes
Effect: Non-compliant tickets flagged for review
```

## Key Design Decisions

1. **Safe Expression Evaluation**: Uses AST-based evaluator from Phase 3 — no dynamic code execution
2. **Conditional Execution**: Optional trigger expression refines when agents execute
3. **Multiple Action Types**: Escalate (field update), Workflow (trigger), Mutate (arbitrary)
4. **Event-Based**: Agents fire on CRUD operations via EventEmitterInterceptor
5. **Scheduled Agents**: Cron-based via BullMQ repeatable jobs
6. **Batch Operations**: TriggerEvaluator.evaluateMany() for efficient scheduled runs
7. **Enabled Flag**: Agents can be disabled without removal
8. **Registry Integration**: Auto-registers to MetadataRegistry for central management

## Next Phase (Phase 7: Performance & Scalability)

Phase 7 will optimize the entire system with:
- 5-layer caching (in-process, Redis, query cache, HTTP ETags, CDN)
- Auto-index creation for high-query fields
- Query optimization (pagination, projection, eager loading)
- Connection pooling
- Rate limiting

## Testing Instructions

Run Phase 6 tests:
```bash
npm test -- agent-executor.test.js
npm test -- agent-store.test.js
npm test -- trigger-evaluator.test.js
npm test -- --testPathPattern=integration/agent-system
```

Expected: 60+ passing tests covering:
- Agent execution (all action types)
- Agent store operations
- Trigger evaluation (simple and complex)
- Scheduled agent management
- Real-world scenarios
- Error handling
- Event triggering

All tests should pass with >90% code coverage.
