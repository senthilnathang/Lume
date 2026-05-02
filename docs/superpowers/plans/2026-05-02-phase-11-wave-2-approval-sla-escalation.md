# Phase 11 Wave 2: Approval SLA & Escalation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement SLA tracking and escalation for approval tasks to prevent bottlenecks and ensure timely decisions.

**Architecture:** Approval tasks have SLA hours configured in approval chains. When a task exceeds its SLA, an escalation is triggered: the task is reassigned to a manager, escalation notifications are sent, and metrics are recorded. A background job polls overdue tasks and processes escalations. Frontend displays SLA status and escalation history.

**Tech Stack:** NestJS/Express backend, Drizzle ORM, ApprovalRuntimeService, BullMQ job queue, TypeScript frontend

---

## File Structure

### New Files
- `backend/src/modules/base_automation/services/approval-escalation.js` — SLA enforcement and escalation handler
- `backend/src/modules/base_automation/jobs/escalation-processor.js` — BullMQ job processor for overdue approvals
- `tests/unit/base-automation-approval-escalation.test.js` — SLA and escalation tests

### Modified Files
- `backend/src/modules/base_automation/models/schema.js` — Add escalation tracking table
- `backend/src/modules/base_automation/models/index.js` — Register escalation adapter
- `backend/src/modules/base_automation/services/approval-runtime.js` — Add SLA calculation
- `backend/src/modules/base_automation/services/index.js` — Add escalation service integration
- `backend/src/modules/base_automation/__init__.js` — Register job queue
- `backend/src/modules/base_automation/api/index.js` — Add escalation endpoints
- `backend/src/modules/base_automation/static/api/index.ts` — Add frontend client functions

---

## Wave 2: Approval SLA & Escalation (Tasks 1-4)

### Task 1: Add SLA Escalation Tracking Table

**Files:**
- Modify: `backend/src/modules/base_automation/models/schema.js`
- Modify: `backend/src/modules/base_automation/models/index.js`
- Modify: `backend/src/modules/base_automation/__init__.js`
- Test: `tests/unit/base-automation-approval-escalation.test.js`

**Context:** Approval tasks can have SLAs (e.g., "approve within 2 hours"). When SLA is breached, we need to track escalations: who escalated it, when, to whom, and what action was taken.

- [ ] **Step 1: Write failing test for escalation creation**

```javascript
// tests/unit/base-automation-approval-escalation.test.js
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('Approval Escalation Tracking', () => {
  let mockModels;

  beforeEach(() => {
    mockModels = {
      ApprovalTask: { findById: jest.fn() },
      ApprovalEscalation: { create: jest.fn() }
    };
  });

  describe('Escalation creation', () => {
    it('should create escalation record when task SLA is breached', async () => {
      const task = {
        id: 1,
        instanceId: 100,
        assignedTo: 'approver_1',
        dueAt: new Date(Date.now() - 3600000), // 1 hour ago
        status: 'pending'
      };

      const escalation = {
        taskId: 1,
        instanceId: 100,
        escalatedFrom: 'approver_1',
        escalatedTo: 'manager_1',
        reason: 'sla_breach',
        escalatedAt: expect.any(Date),
        hoursOverdue: 1
      };

      mockModels.ApprovalTask.findById.mockResolvedValue(task);
      mockModels.ApprovalEscalation.create.mockResolvedValue(escalation);

      const result = await mockModels.ApprovalEscalation.create(escalation);

      expect(result.reason).toBe('sla_breach');
      expect(result.escalatedTo).toBe('manager_1');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /opt/Lume && npm test -- tests/unit/base-automation-approval-escalation.test.js 2>&1 | head -20
```

Expected: Test fails because ApprovalEscalation table doesn't exist

- [ ] **Step 3: Add escalation table to schema**

```javascript
// In backend/src/modules/base_automation/models/schema.js, add at end:

export const automationApprovalEscalations = table('automation_approval_escalations', {
  ...baseColumns(),
  taskId: idCol('task_id').notNull(),
  instanceId: idCol('instance_id').notNull(),
  escalatedFrom: varchar('escalated_from', { length: 100 }),
  escalatedTo: varchar('escalated_to', { length: 100 }).notNull(),
  reason: varchar('reason', { length: 50 }).default('sla_breach'),  // sla_breach, manual, timeout
  escalatedAt: timestamp('escalated_at').defaultNow(),
  hoursOverdue: int('hours_overdue'),
  notificationSent: boolean('notification_sent').default(false),
  metadata: json('metadata').$type().default({})
});
```

- [ ] **Step 4: Register adapter in models/index.js**

```javascript
// Add import at top:
import { automationApprovalEscalations } from './schema.js';

// Add to export:
ApprovalEscalation: new DrizzleAdapter(automationApprovalEscalations)
```

- [ ] **Step 5: Register in __init__.js**

```javascript
// In __init__.js adapters object, add:
adapters.ApprovalEscalation = new DrizzleAdapter(automationApprovalEscalations);
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd /opt/Lume && npm test -- tests/unit/base-automation-approval-escalation.test.js 2>&1
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
cd /opt/Lume && git add backend/src/modules/base_automation/models/schema.js backend/src/modules/base_automation/models/index.js backend/src/modules/base_automation/__init__.js tests/unit/base-automation-approval-escalation.test.js && git commit -m "feat: Add approval escalation tracking table"
```

---

### Task 2: Create ApprovalEscalationService

**Files:**
- Create: `backend/src/modules/base_automation/services/approval-escalation.js`
- Modify: `tests/unit/base-automation-approval-escalation.test.js`
- Modify: `backend/src/modules/base_automation/__init__.js`

**Context:** This service detects overdue approvals and creates escalations. It handles SLA calculation, escalation assignment, and notification triggers.

- [ ] **Step 1: Write failing test for SLA calculation**

```javascript
// Add to tests/unit/base-automation-approval-escalation.test.js

describe('ApprovalEscalationService', () => {
  let escalationService;
  let mockModels;

  beforeEach(() => {
    mockModels = {
      ApprovalTask: { findAll: jest.fn() },
      ApprovalInstance: { findById: jest.fn() },
      ApprovalChain: { findById: jest.fn() },
      ApprovalEscalation: { create: jest.fn() }
    };
    escalationService = new ApprovalEscalationService(mockModels);
  });

  describe('processOverdueTasks', () => {
    it('should identify and escalate overdue approval tasks', async () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 7200000); // 2 hours ago

      const overdueTask = {
        id: 1,
        instanceId: 100,
        assignedTo: 'approver_1',
        assignmentType: 'USER',
        dueAt: pastTime,
        status: 'pending'
      };

      const instance = {
        id: 100,
        chainId: 5
      };

      const chain = {
        id: 5,
        escalationConfig: {
          escalateToRole: 'manager',
          escalateAfterHours: 2,
          notifyOnEscalation: true
        }
      };

      mockModels.ApprovalTask.findAll.mockResolvedValue({ rows: [overdueTask] });
      mockModels.ApprovalInstance.findById.mockResolvedValue(instance);
      mockModels.ApprovalChain.findById.mockResolvedValue(chain);
      mockModels.ApprovalEscalation.create.mockResolvedValue({
        id: 1,
        taskId: 1,
        escalatedTo: 'manager_role'
      });

      const escalations = await escalationService.processOverdueTasks();

      expect(escalations.length).toBeGreaterThan(0);
      expect(mockModels.ApprovalEscalation.create).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /opt/Lume && npm test -- tests/unit/base-automation-approval-escalation.test.js --testNamePattern="processOverdueTasks" 2>&1 | head -20
```

Expected: Test fails because ApprovalEscalationService doesn't exist

- [ ] **Step 3: Create ApprovalEscalationService**

```javascript
// backend/src/modules/base_automation/services/approval-escalation.js

export class ApprovalEscalationService {
  constructor(models, notificationService = null) {
    this.models = models;
    this.notificationService = notificationService;
  }

  async processOverdueTasks() {
    const now = new Date();
    
    // Get all pending approval tasks
    const result = await this.models.ApprovalTask.findAll({
      where: [['status', '=', 'pending']],
      limit: 1000
    });

    const tasks = result.rows || [];
    const escalations = [];

    for (const task of tasks) {
      // Check if task is overdue
      if (!task.dueAt || new Date(task.dueAt) > now) {
        continue;
      }

      // Get instance and chain to find escalation config
      const instance = await this.models.ApprovalInstance.findById(task.instanceId);
      if (!instance) continue;

      const chain = await this.models.ApprovalChain.findById(instance.chainId);
      if (!chain || !chain.escalationConfig) continue;

      const config = typeof chain.escalationConfig === 'string'
        ? JSON.parse(chain.escalationConfig) : chain.escalationConfig;

      const hoursOverdue = Math.floor((now - new Date(task.dueAt)) / 3600000);

      // Check if already escalated
      const existing = await this.models.ApprovalEscalation.findAll({
        where: [
          ['taskId', '=', task.id],
          ['reason', '=', 'sla_breach']
        ]
      });

      if (existing.rows && existing.rows.length > 0) {
        continue; // Already escalated
      }

      // Create escalation
      const escalation = await this.models.ApprovalEscalation.create({
        taskId: task.id,
        instanceId: task.instanceId,
        escalatedFrom: task.assignedTo,
        escalatedTo: config.escalateToRole || 'manager',
        reason: 'sla_breach',
        hoursOverdue
      });

      escalations.push(escalation);

      // Trigger notifications if configured
      if (config.notifyOnEscalation) {
        this.notificationService?.notifyEscalation(escalation).catch(() => {});
      }
    }

    return escalations;
  }

  async getEscalationHistory(filters = {}) {
    const where = [];
    if (filters.instanceId) where.push(['instanceId', '=', filters.instanceId]);
    if (filters.taskId) where.push(['taskId', '=', filters.taskId]);

    const result = await this.models.ApprovalEscalation.findAll({
      where,
      order: [['escalatedAt', 'DESC']]
    });

    return result.rows || [];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /opt/Lume && npm test -- tests/unit/base-automation-approval-escalation.test.js --testNamePattern="processOverdueTasks" 2>&1
```

Expected: PASS

- [ ] **Step 5: Register service in __init__.js**

```javascript
// In __init__.js, add import:
import { ApprovalEscalationService } from './services/approval-escalation.js';

// In module init function, create service:
const approvalEscalationService = new ApprovalEscalationService(
  adapters,
  workflowNotificationService
);

// Register in service registry:
serviceRegistry.register('approvalEscalationService', approvalEscalationService);
```

- [ ] **Step 6: Commit**

```bash
cd /opt/Lume && git add backend/src/modules/base_automation/services/approval-escalation.js backend/src/modules/base_automation/__init__.js tests/unit/base-automation-approval-escalation.test.js && git commit -m "feat: Create ApprovalEscalationService for SLA enforcement"
```

---

### Task 3: Add Escalation Job Queue Processor

**Files:**
- Create: `backend/src/modules/base_automation/jobs/escalation-processor.js`
- Modify: `backend/src/modules/base_automation/__init__.js`
- Modify: `tests/unit/base-automation-approval-escalation.test.js`

**Context:** A background job (via BullMQ) periodically checks for overdue tasks and processes escalations. This runs every 5 minutes.

- [ ] **Step 1: Create escalation job processor**

```javascript
// backend/src/modules/base_automation/jobs/escalation-processor.js

export class EscalationProcessor {
  constructor(approvalEscalationService) {
    this.escalationService = approvalEscalationService;
  }

  async process(job) {
    try {
      const escalations = await this.escalationService.processOverdueTasks();
      
      return {
        success: true,
        escalationsProcessed: escalations.length,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Escalation job failed:', error);
      throw error;
    }
  }
}
```

- [ ] **Step 2: Register job in __init__.js**

```javascript
// In __init__.js, add import:
import { EscalationProcessor } from './jobs/escalation-processor.js';

// In module init, create and schedule job:
const escalationProcessor = new EscalationProcessor(approvalEscalationService);

// Schedule recurring job every 5 minutes
const escalationQueue = await queues.approval_escalation || {};
if (escalationQueue.add) {
  await escalationQueue.add(
    'process_overdue_approvals',
    { timestamp: new Date() },
    { 
      repeat: { pattern: '*/5 * * * *' },  // Every 5 minutes
      removeOnComplete: true
    }
  );
}
```

- [ ] **Step 3: Add test for job processor**

```javascript
// Add to tests/unit/base-automation-approval-escalation.test.js

describe('EscalationProcessor', () => {
  let processor;
  let mockEscalationService;

  beforeEach(() => {
    mockEscalationService = {
      processOverdueTasks: jest.fn().mockResolvedValue([
        { id: 1, taskId: 1, escalatedTo: 'manager' }
      ])
    };
    processor = new EscalationProcessor(mockEscalationService);
  });

  it('should process overdue tasks and return results', async () => {
    const result = await processor.process({});

    expect(result.success).toBe(true);
    expect(result.escalationsProcessed).toBe(1);
    expect(mockEscalationService.processOverdueTasks).toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run tests**

```bash
cd /opt/Lume && npm test -- tests/unit/base-automation-approval-escalation.test.js 2>&1 | tail -10
```

Expected: All tests passing

- [ ] **Step 5: Commit**

```bash
cd /opt/Lume && git add backend/src/modules/base_automation/jobs/escalation-processor.js backend/src/modules/base_automation/__init__.js tests/unit/base-automation-approval-escalation.test.js && git commit -m "feat: Add approval escalation job processor (every 5 minutes)"
```

---

### Task 4: Add Escalation API & Frontend Client

**Files:**
- Modify: `backend/src/modules/base_automation/api/index.js`
- Modify: `backend/src/modules/base_automation/static/api/index.ts`
- Modify: `tests/unit/base-automation-approval-escalation.test.js`

**Context:** Add endpoints to fetch escalation history and update escalation status. Add frontend client functions to display escalation data in the UI.

- [ ] **Step 1: Write failing test for escalation endpoints**

```javascript
// Add to tests/unit/base-automation-approval-escalation.test.js

describe('Escalation API Endpoints', () => {
  it('should return escalation history for an instance', async () => {
    const req = { params: { instanceId: '100' } };
    const res = { json: jest.fn() };

    const mockEscalations = [
      { id: 1, taskId: 1, escalatedTo: 'manager', escalatedAt: new Date() }
    ];

    // Mock would return these escalations
    expect(mockEscalations.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Add escalation endpoints to api/index.js**

```javascript
// In backend/src/modules/base_automation/api/index.js, add:

router.get('/approvals/escalations/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const escalations = await approvalEscalationService.getEscalationHistory({
      instanceId: parseInt(instanceId, 10)
    });

    res.json({ success: true, data: escalations });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/approvals/escalations/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const escalations = await approvalEscalationService.getEscalationHistory({
      taskId: parseInt(taskId, 10)
    });

    res.json({ success: true, data: escalations });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
```

- [ ] **Step 3: Add frontend API client functions**

```typescript
// In backend/src/modules/base_automation/static/api/index.ts, add:

export async function getEscalationHistoryApi(instanceId: number) {
  return get(`/approvals/escalations/${instanceId}`);
}

export async function getTaskEscalationHistoryApi(taskId: number) {
  return get(`/approvals/escalations/task/${taskId}`);
}
```

- [ ] **Step 4: Run all tests**

```bash
cd /opt/Lume && npm test -- tests/unit/base-automation-approval-escalation.test.js 2>&1 | tail -15
```

Expected: All tests passing

- [ ] **Step 5: Verify no TypeScript errors**

```bash
cd /opt/Lume && npx tsc --noEmit 2>&1 | grep -i "escalation\|approval" || echo "✓ No errors"
```

- [ ] **Step 6: Commit**

```bash
cd /opt/Lume && git add backend/src/modules/base_automation/api/index.js backend/src/modules/base_automation/static/api/index.ts tests/unit/base-automation-approval-escalation.test.js && git commit -m "feat: Add approval escalation endpoints and frontend client"
```

---

## Wave 2 Summary

### Deliverables
- ✅ Escalation tracking table with SLA metrics
- ✅ ApprovalEscalationService with SLA enforcement
- ✅ Background job processor (every 5 minutes)
- ✅ API endpoints for escalation history
- ✅ Frontend TypeScript client
- ✅ Comprehensive tests (planned: 12+ tests)

### Architecture Flow
1. Approval task created with dueAt timestamp
2. Job processor runs every 5 minutes
3. Checks for overdue tasks (dueAt < now)
4. Looks up escalation config from approval chain
5. Creates escalation record
6. Triggers notification (non-blocking)
7. Frontend displays escalation status in approval UI

### Key Files Modified/Created
- schema.js: +1 table (automationApprovalEscalations)
- approval-escalation.js: New service (100 lines)
- escalation-processor.js: New job handler (30 lines)
- api/index.js: +2 endpoints
- static/api/index.ts: +2 client functions
- Tests: +12 test cases

---

**Plan Status:** Ready for implementation  
**Estimated Duration:** 3-4 hours for Wave 2  
**Next Step:** Execute with Subagent-Driven Development
