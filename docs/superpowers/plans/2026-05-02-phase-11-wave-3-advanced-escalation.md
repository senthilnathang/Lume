# Phase 11 Wave 3: Advanced Escalation & Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-level escalation chains, timeout recovery, role-based notifications, and approval analytics dashboard.

**Architecture:** Escalation chains allow tasks to escalate through multiple levels (approver → manager → director). Timeouts trigger recovery actions (reassign, auto-approve). Notifications are sent to role-based recipients (all managers, all directors). Analytics service tracks approval metrics: SLA compliance, average approval time, bottleneck detection.

**Tech Stack:** NestJS/Express backend, Drizzle ORM, ApprovalEscalationService, NotificationService, BullMQ, TypeScript frontend

---

## File Structure

### New Files
- `backend/src/modules/base_automation/services/escalation-chain-handler.js` — Multi-level escalation logic
- `backend/src/modules/base_automation/services/approval-analytics.js` — Metrics and reporting
- `tests/unit/base-automation-escalation-chain.test.js` — Chain escalation tests

### Modified Files
- `backend/src/modules/base_automation/models/schema.js` — Add escalation chain config table
- `backend/src/modules/base_automation/models/index.js` — Register adapters
- `backend/src/modules/base_automation/services/approval-escalation.js` — Integrate chain handler + timeout recovery
- `backend/src/modules/base_automation/__init__.js` — Register new services
- `backend/src/modules/base_automation/api/index.js` — Add analytics endpoints
- `backend/src/modules/base_automation/static/api/index.ts` — Add frontend client

---

## Wave 3: Advanced Escalation & Analytics (Tasks 1-4)

### Task 1: Add Escalation Chain Configuration Table

**Files:**
- Modify: `backend/src/modules/base_automation/models/schema.js`
- Modify: `backend/src/modules/base_automation/models/index.js`
- Modify: `backend/src/modules/base_automation/__init__.js`
- Test: `tests/unit/base-automation-escalation-chain.test.js`

**Context:** Escalation chains define multi-level escalation rules. Each level specifies: who to escalate to, how many hours at that level before escalating further, what notification action to take.

- [ ] **Step 1: Write failing test**

```javascript
// tests/unit/base-automation-escalation-chain.test.js
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('Escalation Chain Configuration', () => {
  let mockModels;

  beforeEach(() => {
    mockModels = {
      ApprovalEscalationChain: { create: jest.fn() }
    };
  });

  it('should create escalation chain with multiple levels', async () => {
    const chain = {
      approvalChainId: 5,
      level: 1,
      escalateToRole: 'manager',
      escalateAfterHours: 2,
      maxEscalations: 3,
      notificationTemplate: 'escalation_level_1'
    };

    mockModels.ApprovalEscalationChain.create.mockResolvedValue(chain);
    const result = await mockModels.ApprovalEscalationChain.create(chain);

    expect(result.level).toBe(1);
    expect(result.escalateToRole).toBe('manager');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /opt/Lume && npm test -- tests/unit/base-automation-escalation-chain.test.js 2>&1 | head -20
```

Expected: Test fails because table doesn't exist

- [ ] **Step 3: Add table to schema.js**

```javascript
// In backend/src/modules/base_automation/models/schema.js

export const automationApprovalEscalationChains = table('automation_approval_escalation_chains', {
  ...baseColumns(),
  approvalChainId: idCol('approval_chain_id').notNull(),
  level: int('level').notNull(),  // 1, 2, 3, ... (escalation level)
  escalateToRole: varchar('escalate_to_role', { length: 100 }).notNull(),  // 'manager', 'director', etc
  escalateAfterHours: int('escalate_after_hours').notNull(),  // Hours at this level before escalating to next
  maxEscalations: int('max_escalations').default(3),  // Max times this level can be escalated
  notificationTemplate: varchar('notification_template', { length: 100 }),  // Email template to use
  metadata: json('metadata').$type().default({})
});
```

- [ ] **Step 4: Register adapter**

In `models/index.js`:
```javascript
ApprovalEscalationChain: new DrizzleAdapter(automationApprovalEscalationChains)
```

In `__init__.js`:
```javascript
adapters.ApprovalEscalationChain = new DrizzleAdapter(automationApprovalEscalationChains);
```

- [ ] **Step 5: Run tests**

```bash
cd /opt/Lume && npm test -- tests/unit/base-automation-escalation-chain.test.js 2>&1
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /opt/Lume && git add backend/src/modules/base_automation/models/schema.js backend/src/modules/base_automation/models/index.js backend/src/modules/base_automation/__init__.js tests/unit/base-automation-escalation-chain.test.js && git commit -m "feat: Add escalation chain configuration table"
```

---

### Task 2: Create EscalationChainHandler Service

**Files:**
- Create: `backend/src/modules/base_automation/services/escalation-chain-handler.js`
- Modify: `tests/unit/base-automation-escalation-chain.test.js`
- Modify: `backend/src/modules/base_automation/__init__.js`

**Context:** This service handles multi-level escalation. When a task at level 1 exceeds its SLA, it escalates to level 2. Repeats until max level reached or task resolved.

- [ ] **Step 1: Write failing test**

```javascript
describe('EscalationChainHandler', () => {
  let handler;
  let mockModels;

  beforeEach(() => {
    mockModels = {
      ApprovalEscalationChain: { findAll: jest.fn() },
      ApprovalEscalation: { create: jest.fn() }
    };
    handler = new EscalationChainHandler(mockModels);
  });

  it('should escalate to next level when SLA exceeded at current level', async () => {
    const currentEscalation = {
      id: 1,
      taskId: 1,
      escalatedTo: 'manager',
      level: 1
    };

    const chainLevels = [
      { level: 1, escalateToRole: 'manager', escalateAfterHours: 2 },
      { level: 2, escalateToRole: 'director', escalateAfterHours: 4 }
    ];

    mockModels.ApprovalEscalationChain.findAll.mockResolvedValue({ rows: chainLevels });
    mockModels.ApprovalEscalation.create.mockResolvedValue({
      id: 2,
      taskId: 1,
      escalatedTo: 'director',
      level: 2
    });

    const nextEscalation = await handler.escalateToNextLevel(currentEscalation);

    expect(nextEscalation.escalatedTo).toBe('director');
    expect(nextEscalation.level).toBe(2);
  });
});
```

- [ ] **Step 2-6: Implement service, tests, registration, commit**

Service should have:
- `escalateToNextLevel(currentEscalation)` — Create next-level escalation record
- `getChainLevels(approvalChainId)` — Fetch all levels for a chain, ordered by level
- `isMaxLevelReached(taskId, chainId)` — Check if escalated beyond max

---

### Task 3: Create ApprovalAnalyticsService

**Files:**
- Create: `backend/src/modules/base_automation/services/approval-analytics.js`
- Modify: `tests/unit/base-automation-escalation-chain.test.js`
- Modify: `backend/src/modules/base_automation/__init__.js`

**Context:** Track approval metrics: average approval time, SLA compliance rate, bottleneck tasks (longest pending).

- [ ] **Step 1: Create service with methods**

```javascript
export class ApprovalAnalyticsService {
  constructor(models) {
    this.models = models;
  }

  async getApprovalMetrics(filters = {}) {
    // Get all completed approvals in timeframe
    // Calculate: avgApprovalTime, slaBreachers, slaBreachers/total
    // Return: { totalApprovals, avgTime, slaBreachers, breachRate }
  }

  async getBottlenecks(limit = 10) {
    // Find longest-pending approval tasks
    // Order by (now - createdAt) DESC
    // Return: [{ taskId, pendingFor, assignedTo, instanceId }, ...]
  }

  async getEscalationMetrics() {
    // Count escalations by level, reason
    // Return: { totalEscalations, byLevel: {}, byReason: {} }
  }

  async getApprovalTimeByRole(role) {
    // Average approval time per role
    // Helps identify slow approvers
  }
}
```

- [ ] **Step 2-6: Write tests, implement, register, commit**

Tests should cover:
- Metrics calculation with sample data
- Bottleneck detection
- Escalation statistics
- Role-based performance

---

### Task 4: Add Analytics API Endpoints & Frontend

**Files:**
- Modify: `backend/src/modules/base_automation/api/index.js`
- Modify: `backend/src/modules/base_automation/static/api/index.ts`
- Modify: `tests/unit/base-automation-escalation-chain.test.js`

**Context:** Expose analytics via REST API for dashboard display.

- [ ] **Step 1: Add endpoints**

```javascript
router.get('/approvals/analytics/metrics', async (req, res) => {
  const metrics = await approvalAnalyticsService.getApprovalMetrics(req.query);
  res.json({ success: true, data: metrics });
});

router.get('/approvals/analytics/bottlenecks', async (req, res) => {
  const bottlenecks = await approvalAnalyticsService.getBottlenecks();
  res.json({ success: true, data: bottlenecks });
});

router.get('/approvals/analytics/escalations', async (req, res) => {
  const escalations = await approvalAnalyticsService.getEscalationMetrics();
  res.json({ success: true, data: escalations });
});

router.get('/approvals/analytics/roles/:role', async (req, res) => {
  const metrics = await approvalAnalyticsService.getApprovalTimeByRole(req.params.role);
  res.json({ success: true, data: metrics });
});
```

- [ ] **Step 2: Add frontend client functions**

```typescript
export async function getApprovalMetricsApi(filters?: any) {
  return get('/approvals/analytics/metrics', { params: filters });
}

export async function getApprovalBottlenecksApi() {
  return get('/approvals/analytics/bottlenecks');
}

export async function getEscalationMetricsApi() {
  return get('/approvals/analytics/escalations');
}

export async function getRoleApprovalMetricsApi(role: string) {
  return get(`/approvals/analytics/roles/${role}`);
}
```

- [ ] **Step 3-6: Add tests, commit**

---

## Wave 3 Summary

### Deliverables
- ✅ Multi-level escalation chain configuration
- ✅ Chain escalation handler (level-by-level escalation)
- ✅ Approval analytics service (metrics, bottlenecks, performance)
- ✅ Analytics API endpoints (4 endpoints)
- ✅ Frontend client (4 functions)
- ✅ Comprehensive tests (12+ tests)

### Architecture Flow
1. Create escalation chain with 3+ levels (approver → manager → director)
2. Task escalates level-by-level if SLA exceeded at each level
3. Analytics tracks: avg approval time, SLA breach rate, bottleneck tasks, role performance
4. Dashboard displays metrics and identifies slow approvers/approvals

### Key Files
- Schema: +1 table (automationApprovalEscalationChains)
- Services: +2 services (EscalationChainHandler, ApprovalAnalyticsService)
- API: +4 endpoints
- Tests: +12 test cases

---

**Plan Status:** Ready for implementation  
**Estimated Duration:** 4-5 hours for Wave 3  
**Next Step:** Execute with Subagent-Driven Development
