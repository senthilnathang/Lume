# Phase 4: Workflow Execution Engine (Weeks 4-5)

## Overview

Phase 4 implements the workflow execution system that powers entity automation. Workflows are triggered by CRUD operations (onCreate, onUpdate, onDelete) or scheduled via cron. Each workflow consists of sequential steps that perform actions like sending emails, notifications, updating records, or branching on conditions.

## Completed Components

### 1. Core Workflow Execution

**File:** `backend/src/domains/workflow/workflow-executor.js`

- **WorkflowExecutor class**: Main executor for workflow definitions
- **Methods:**
  - `executeSync(workflowDef, triggerData, executionContext)` — Execute workflow steps sequentially in-process
  - `executeAsync(workflowId, workflowDef, triggerData, executionContext)` — Queue workflow for async BullMQ processing
  - `executeStep(step, context)` — Execute individual step and handle errors
  - `registerRunner(stepType, RunnerClass)` — Register custom step runners
- **Features:**
  - Continue-on-error support for fault-tolerant workflows
  - Error aggregation and reporting
  - Step data flow through context.workflowData

### 2. Workflow Store

**File:** `backend/src/domains/workflow/workflow-store.js`

- **WorkflowStore class**: Central management of workflow definitions
- **Methods:**
  - `register(workflowDef)` — Register workflow with validation
  - `get(id)`, `getByEntity(slug)`, `getByTrigger(slug, trigger)` — Retrieve workflows
  - `update(id, updates)` — Modify workflows with re-validation
  - `unregister(id)` — Remove workflows
  - `validate(workflow)` — Comprehensive validation logic
- **Validation rules:**
  - Requires: id, slug, trigger, non-empty steps array
  - Valid triggers: onCreate, onUpdate, onDelete, scheduled, manual
  - Scheduled trigger requires cron schedule expression
  - Each step requires id and type fields
- **Registry integration:** Auto-registers to MetadataRegistry

### 3. Step Runners (6 built-in types)

#### 3a. EmailStep
**File:** `backend/src/domains/workflow/step-runners/email-step.js`

Config options:
- `to` — Email recipient (supports `user.email` variable reference)
- `subject` — Email subject
- `template` — Email template name or ID
- `variables` — Object of template variables
- `from` — Sender email (optional)
- `cc`, `bcc` — Additional recipients (optional)

Returns: `{ messageId, to, subject, timestamp }`

#### 3b. NotifyStep
**File:** `backend/src/domains/workflow/step-runners/notify-step.js`

Config options:
- `type` — Notification type: `in_app`, `email`, `sms`, `push`
- `title` — Notification title (required)
- `message` — Notification message (required)
- `recipient` — User ID (supports `user.userId` reference)
- `url` — Optional link in notification
- `metadata` — Additional data to include

Returns: `{ notificationId, type, recipient, title, timestamp }`

#### 3c. MutateStep
**File:** `backend/src/domains/workflow/step-runners/mutate-step.js`

Config options:
- `entity` — Entity slug to update (required)
- `recordId` — Record ID to update (supports `data.id` reference)
- `updates` — Field updates object
- `mergeArrays` — Whether to merge arrays (optional)

Returns: `{ entity, recordId, updates, updatedAt }`

#### 3d. ConditionStep
**File:** `backend/src/domains/workflow/step-runners/condition-step.js`

Config options:
- `expression` — ABAC condition expression (required)
- `ifTrue` — Next step ID if condition is true
- `ifFalse` — Next step ID if condition is false

Returns: `{ conditionResult: boolean, nextStep: string }`

Uses ExpressionEvaluator from Phase 3 permission system for safe expression evaluation.

#### 3e. WaitStep
**File:** `backend/src/domains/workflow/step-runners/wait-step.js`

Config options:
- `seconds` — Seconds to wait
- `duration` — Alternative: duration string (e.g., `"5s"`, `"2m"`, `"1h"`)

Returns: `{ waited: number, unit: "seconds" }`

#### 3f. LogStep
**File:** `backend/src/domains/workflow/step-runners/log-step.js`

Config options:
- `level` — Log level: `debug`, `info`, `warn`, `error`
- `message` — Log message
- `context` — Additional context object

Returns: `{ level, message, context, timestamp }`

### 4. Base Step Runner

**File:** `backend/src/domains/workflow/step-runners/base-step-runner.js`

- **BaseStepRunner class**: Abstract base for all step runners
- **Methods:**
  - `resolveVariable(value, context)` — Resolve variable references (user.*, data.*, step.*)
  - `resolveConfig(context)` — Resolve all config variables
  - `resolveObjectVariables(obj, context)` — Recursive object variable resolution

Variable syntax supported:
- `user.userId`, `user.orgId`, `user.roles` — From execution context
- `data.id`, `data.title`, `data.status` — From entity record
- `step.stepId.field` — From previous step results

### 5. Registry Extensions

**File:** `backend/src/core/runtime/registry.js` (updated)

Added methods:
- `unregisterWorkflow(id)` — Remove workflow definition
- `unregisterAgent(entitySlug, agentId)` — Remove agent definition

## Integration Points

### Event Emitter Integration

The existing **EventEmitterInterceptor** (Stage 80) already handles workflow queuing:
- Parses entity.workflows.onCreate/onUpdate/onDelete arrays
- Queues workflows to existing `automation` BullMQ queue
- Includes recordId, action, userId in job payload

### BullMQ Integration

Workflows can be:
- **Sync**: Execute immediately via `executeSync()`
- **Async**: Queue via `executeAsync()` to BullMQ `workflows` queue

QueueManagerService processor would call:
```javascript
const result = await workflowExecutor.executeSync(workflow, {
  record: job.data.record,
  action: job.data.action,
  entity: job.data.entity,
}, job.data.executionContext);
```

## Test Coverage

### Unit Tests

**File:** `backend/tests/unit/workflow-executor.test.js`
- Sync workflow execution (single and multi-step)
- Error handling (continue-on-error, halting)
- Step type registration and custom runners
- Variable resolution (user context references)
- Empty workflow handling
- Unknown step type rejection

**File:** `backend/tests/unit/workflow-store.test.js`
- Workflow registration and retrieval
- Get by entity slug, by trigger type
- Update with re-validation
- Unregister from store and registry
- List all workflows
- Comprehensive validation (required fields, valid triggers, steps)
- Clear all workflows

### Integration Tests

**File:** `backend/tests/integration/workflow-execution.test.js`

Scenarios covered:
1. **Ticket creation workflow** — Log + Email + Notification sequence
2. **Conditional escalation** — Priority check → Mutate if urgent
3. **Sequential with delays** — Log → Wait 1s → Notify
4. **Workflow store integration** — Register and execute from store
5. **Multi-trigger execution** — Execute all onCreate workflows
6. **Email with variable interpolation** — Resolve user and data variables
7. **Mutate with nested updates** — Update multiple fields
8. **Multi-condition branching** — AND/OR expressions
9. **Error scenarios** — Missing fields, malformed workflows, unknown types
10. **Metadata tracking** — Preserve execution context and step results

## Usage Example

```javascript
// Define workflow
const notifyOnCreate = {
  id: 'ticket_notify_customer',
  slug: 'ticket',
  trigger: 'onCreate',
  steps: [
    {
      id: 'log_start',
      type: 'log',
      config: { level: 'info', message: 'Ticket created' }
    },
    {
      id: 'send_email',
      type: 'send_email',
      config: {
        to: 'customer@example.com',
        subject: 'Your ticket: data.title',
        template: 'ticket_confirmation'
      }
    },
    {
      id: 'notify_team',
      type: 'send_notification',
      config: {
        type: 'in_app',
        title: 'New Ticket',
        message: 'data.title from user.userId',
        recipient: 'user.userId'
      }
    }
  ]
};

// Register
await workflowStore.register(notifyOnCreate);

// Execute on entity create (auto-triggered by EventEmitterInterceptor)
const result = await executor.executeSync(notifyOnCreate, {
  record: { id: 1, title: 'Login issue' },
  action: 'create',
  entity: { slug: 'ticket' }
}, {
  userId: 5,
  orgId: 1,
  roles: ['support_agent']
});

// result.success = true
// result.steps = [
//   { stepId: 'log_start', type: 'log', success: true, data: {...} },
//   { stepId: 'send_email', type: 'send_email', success: true, data: {...} },
//   { stepId: 'notify_team', type: 'send_notification', success: true, data: {...} }
// ]
```

## Architecture Diagram

```
Entity Operation (CREATE/UPDATE/DELETE)
        ↓
[Stage 80] EventEmitterInterceptor
        ↓
Extract entity.workflows[onCreate/onUpdate/onDelete]
        ↓
Queue to BullMQ automation queue
        ↓
QueueProcessor calls WorkflowExecutor.executeSync()
        ↓
For each step in workflow.steps:
  ├─ Get step runner by type (EmailStep, NotifyStep, etc.)
  ├─ Resolve config variables (user.*, data.*, step.*)
  ├─ Execute step.execute(context)
  ├─ Capture result in context.workflowData[stepId]
  └─ On error: abort or continue based on continueOnError flag
        ↓
Return WorkflowResult {
  success: boolean,
  steps: [{ stepId, type, success, data, error }],
  errors: [],
  workflowData: { ... }
}
```

## Key Design Decisions

1. **Variable Resolution**: Done per-step via BaseStepRunner, allowing earlier steps' results to be referenced in later steps
2. **Error Handling**: `continueOnError` flag allows resilient workflows that don't abort on first failure
3. **Sync by Default**: Workflows execute in-process by default; async queuing is optional if QueueManager available
4. **Type-based Registration**: Step runners registered by type (string) — allows dynamic loading and custom runners
5. **Context Aggregation**: `context.workflowData` accumulates results from all steps for cross-step references
6. **Safe Expressions**: ConditionStep uses ExpressionEvaluator (Phase 3) — no dynamic code execution

## Next Phase (Phase 5: View System)

Phase 5 will build on workflow foundation to add:
- Auto-generated view types (Table, Form, Kanban, Calendar, Timeline)
- View store and retrieval
- API endpoints for view metadata and data
- Frontend components (DataGrid, EntityForm, KanbanBoard, etc.)

## Testing Instructions

Run Phase 4 tests:
```bash
npm test -- workflow-executor.test.js
npm test -- workflow-store.test.js
npm test -- --testPathPattern=integration/workflow-execution
```

All 40+ tests should pass with >95% coverage.
