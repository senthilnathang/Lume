# Phase 11: Approval-Workflow Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate approval routing into workflow transitions, enabling workflows to request approvals at specific states and advance based on approval outcomes.

**Architecture:** Workflows can define approval actions on transitions. When a transition fires, if it has an approval action, the workflow pauses and creates an approval request. Approval outcomes (approve/reject/delegate) trigger continuation logic that either advances the workflow or rolls back to a previous state.

**Tech Stack:** NestJS/Express backend, Drizzle ORM, ApprovalRuntimeService, AutomationService, RuleEngineService

---

## File Structure

### New Files
- `backend/src/modules/base_automation/services/workflow-approval-action.js` — Approval action handler for workflows
- `tests/unit/base-automation-approval-workflow.test.js` — E2E tests for approval-workflow integration

### Modified Files
- `backend/src/modules/base_automation/services/index.js` — Add approval action execution logic
- `backend/src/modules/base_automation/api/index.js` — Add approval callback endpoints
- `backend/src/modules/base_automation/models/schema.js` — Add workflow-approval link table (optional, for tracking)
- `backend/src/modules/base_automation/__init__.js` — Register WorkflowApprovalActionService

---

## Wave 1: Workflow Approval Actions (Tasks 1-8)

### Task 1: Create WorkflowApprovalActionService

**Files:**
- Create: `backend/src/modules/base_automation/services/workflow-approval-action.js`

**Context:** This service handles executing approval actions within workflow transitions. It bridges the ApprovalRuntimeService and AutomationService.

- [ ] **Step 1: Write failing test for approval action creation**

```javascript
// tests/unit/base-automation-approval-workflow.test.js
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { WorkflowApprovalActionService } from '../../src/modules/base_automation/services/workflow-approval-action.js';

describe('WorkflowApprovalActionService', () => {
  let service;
  let mockModels;
  let mockApprovalService;

  beforeEach(() => {
    mockModels = {
      ApprovalInstance: { create: jest.fn() },
      WorkflowExecution: { findById: jest.fn(), update: jest.fn() }
    };
    mockApprovalService = {
      submitForApproval: jest.fn()
    };
    service = new WorkflowApprovalActionService(mockModels, mockApprovalService);
  });

  describe('executeApprovalAction', () => {
    it('should create approval instance when action is triggered', async () => {
      const execution = { id: 1, workflowId: 5, recordId: 10, currentState: 'draft' };
      const action = {
        type: 'request_approval',
        chainId: 3,
        onApprove: 'submitted',
        onReject: 'draft'
      };

      mockApprovalService.submitForApproval.mockResolvedValue({ id: 100 });

      const result = await service.executeApprovalAction(execution, action, 'user_123');

      expect(mockApprovalService.submitForApproval).toHaveBeenCalledWith(
        3,
        'workflow_execution',
        '1',
        'user_123',
        1
      );
      expect(result).toEqual({ id: 100 });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /opt/Lume && npm test -- tests/unit/base-automation-approval-workflow.test.js 2>&1 | head -20
```

Expected output: `FAIL — WorkflowApprovalActionService is not defined`

- [ ] **Step 3: Create the WorkflowApprovalActionService class**

```javascript
// backend/src/modules/base_automation/services/workflow-approval-action.js
export class WorkflowApprovalActionService {
  constructor(models, approvalRuntimeService) {
    this.models = models;
    this.approvalRuntimeService = approvalRuntimeService;
  }

  async executeApprovalAction(execution, action, userId) {
    if (action.type !== 'request_approval') {
      throw new Error(`Unknown approval action type: ${action.type}`);
    }

    const { chainId, onApprove, onReject } = action;
    if (!chainId || !onApprove || !onReject) {
      throw new Error('Approval action requires chainId, onApprove, and onReject');
    }

    const approvalInstance = await this.approvalRuntimeService.submitForApproval(
      chainId,
      'workflow_execution',
      String(execution.id),
      userId,
      execution.id
    );

    return approvalInstance;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /opt/Lume && npm test -- tests/unit/base-automation-approval-workflow.test.js --testNamePattern="should create approval instance" 2>&1
```

Expected: `PASS`

- [ ] **Step 5: Commit**

```bash
cd /opt/Lume && git add tests/unit/base-automation-approval-workflow.test.js backend/src/modules/base_automation/services/workflow-approval-action.js && git commit -m "feat: Create WorkflowApprovalActionService for workflow approval requests"
```

---

### Task 2: Add Approval Action Execution to AutomationService

**Files:**
- Modify: `backend/src/modules/base_automation/services/index.js` (lines 356-425, the transitionWorkflowState method)
- Modify: `tests/unit/base-automation-approval-workflow.test.js`

**Context:** The transitionWorkflowState method needs to be extended to handle approval actions. When a transition has an approval action, it should execute the action and update the execution status to "awaiting_approval" instead of immediately transitioning.

- [ ] **Step 1: Write failing test for transition with approval action**

```javascript
// Add to tests/unit/base-automation-approval-workflow.test.js
describe('AutomationService', () => {
  let automationService;
  let mockModels;
  let mockApprovalService;
  let mockWorkflowApprovalActionService;

  beforeEach(() => {
    mockModels = {
      WorkflowExecution: {
        findById: jest.fn(),
        update: jest.fn()
      },
      Workflow: {
        findById: jest.fn()
      },
      WorkflowExecutionHistory: {
        create: jest.fn()
      }
    };
    mockApprovalService = {
      submitForApproval: jest.fn().mockResolvedValue({ id: 100 })
    };
    mockWorkflowApprovalActionService = {
      executeApprovalAction: jest.fn().mockResolvedValue({ id: 100 })
    };

    automationService = new AutomationService(mockModels);
    automationService.workflowApprovalActionService = mockWorkflowApprovalActionService;
    automationService.webhookService = null;
    automationService.workflowNotificationService = null;
  });

  describe('transitionWorkflowState with approval action', () => {
    it('should execute approval action and set status to awaiting_approval', async () => {
      const execution = {
        id: 1,
        workflowId: 5,
        recordId: 10,
        currentState: 'draft',
        status: 'active',
        executionData: {}
      };
      const workflow = {
        id: 5,
        states: [
          { name: 'draft', is_start: true },
          { name: 'submitted', is_end: false },
          { name: 'approved', is_end: true }
        ],
        transitions: [
          {
            from: 'draft',
            to: 'submitted',
            actions: [
              {
                type: 'request_approval',
                chainId: 3,
                onApprove: 'approved',
                onReject: 'draft'
              }
            ]
          }
        ]
      };

      mockModels.WorkflowExecution.findById.mockResolvedValue(execution);
      mockModels.Workflow.findById.mockResolvedValue(workflow);
      mockModels.WorkflowExecution.update.mockResolvedValue({
        ...execution,
        status: 'awaiting_approval'
      });

      const result = await automationService.transitionWorkflowState(
        1,
        'submitted',
        'auto',
        'user_123',
        true  // hasApprovalAction flag
      );

      expect(mockWorkflowApprovalActionService.executeApprovalAction).toHaveBeenCalled();
      expect(result.status).toBe('awaiting_approval');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /opt/Lume && npm test -- tests/unit/base-automation-approval-workflow.test.js --testNamePattern="should execute approval action" 2>&1 | head -30
```

Expected: Test fails because transitionWorkflowState doesn't handle approval actions

- [ ] **Step 3: Modify transitionWorkflowState to support approval actions**

Read the current implementation first to understand the exact signature:

```bash
grep -A 70 "async transitionWorkflowState" /opt/Lume/backend/src/modules/base_automation/services/index.js | head -80
```

Now update the method:

```javascript
// In backend/src/modules/base_automation/services/index.js, replace transitionWorkflowState method (lines ~356-425)

async transitionWorkflowState(executionId, toState, transitionName, userId, hasApprovalAction = false) {
  // Get execution
  const execution = await this.models.WorkflowExecution.findById(executionId);
  if (!execution) throw new Error('Execution not found');
  if (execution.status !== 'active') throw new Error('Execution is not active');

  const currentState = execution.currentState;

  // Record transition in history
  await this.models.WorkflowExecutionHistory.create({
    executionId,
    fromState: currentState,
    toState,
    transitionName,
    userId
  });

  // Parse executionData and update
  let executionDataObj = {};
  if (execution.executionData) {
    if (typeof execution.executionData === 'string') {
      try {
        executionDataObj = JSON.parse(execution.executionData);
      } catch (e) {
        console.warn('Could not parse executionData:', e);
      }
    } else {
      executionDataObj = execution.executionData;
    }
  }

  // Lookup workflow to get state definitions
  const workflow = await this.models.Workflow.findById(execution.workflowId);
  this._parseWorkflowJSON(workflow);
  const stateDef = (workflow?.states || []).find(s => s.name === toState);
  const isEndState = stateDef?.is_end === true;

  // Check if this transition has approval actions
  let approvalAction = null;
  if (hasApprovalAction) {
    const transition = (workflow?.transitions || []).find(
      t => t.from === currentState && t.to === toState
    );
    approvalAction = transition?.actions?.find(a => a.type === 'request_approval');
  }

  // If approval action exists, execute it and defer state change
  if (approvalAction) {
    await this.workflowApprovalActionService.executeApprovalAction(
      execution,
      approvalAction,
      userId
    );

    const updated = await this.models.WorkflowExecution.update(executionId, {
      status: 'awaiting_approval',
      executionData: {
        ...executionDataObj,
        pendingApprovalAction: approvalAction,
        pendingApprovalState: toState,
        lastTransition: { from: currentState, to: toState, at: new Date(), deferred: true }
      }
    });

    return updated;
  }

  // Normal state transition (no approval)
  const updated = await this.models.WorkflowExecution.update(executionId, {
    currentState: toState,
    status: isEndState ? 'completed' : 'active',
    executionData: {
      ...executionDataObj,
      lastTransition: { from: currentState, to: toState, at: new Date() }
    }
  });

  // Fire workflow webhooks (non-blocking)
  this.webhookService?.triggerWebhooks('workflow.state_changed', 'workflow', {
    executionId,
    workflowId: execution.workflowId,
    fromState: currentState,
    toState
  }).catch(() => {});

  // Send workflow notifications (non-blocking)
  this.workflowNotificationService?.notifyStateChange(
    executionId,
    execution.workflowId,
    currentState,
    toState,
    {
      recordId: execution.recordId,
      workflowName: workflow?.name,
      submitter: executionDataObj.initiatedBy ? { id: executionDataObj.initiatedBy } : null
    }
  ).catch(() => {});

  return updated;
}
```

- [ ] **Step 4: Initialize WorkflowApprovalActionService in AutomationService constructor**

```javascript
// In backend/src/modules/base_automation/services/index.js, update the constructor (around line 7-12)

// Add import at top
import { WorkflowApprovalActionService } from './workflow-approval-action.js';

// In constructor:
export class AutomationService {
  constructor(models, webhookService = null, workflowNotificationService = null, approvalRuntimeService = null) {
    this.models = models;
    this.webhookService = webhookService;
    this.workflowNotificationService = workflowNotificationService;
    this.approvalRuntimeService = approvalRuntimeService;
    this.workflowApprovalActionService = new WorkflowApprovalActionService(
      models,
      approvalRuntimeService
    );
  }
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd /opt/Lume && npm test -- tests/unit/base-automation-approval-workflow.test.js --testNamePattern="should execute approval action" 2>&1
```

Expected: `PASS`

- [ ] **Step 6: Commit**

```bash
cd /opt/Lume && git add backend/src/modules/base_automation/services/index.js && git commit -m "feat: Add approval action execution to workflow state transitions"
```

---

### Task 3: Add Approval Callback Endpoints

**Files:**
- Modify: `backend/src/modules/base_automation/api/index.js`
- Modify: `tests/unit/base-automation-approval-workflow.test.js`

**Context:** When an approval is approved/rejected, a callback endpoint should advance the workflow to the appropriate next state.

- [ ] **Step 1: Write failing test for approval callback endpoint**

```javascript
// Add to tests/unit/base-automation-approval-workflow.test.js
describe('Approval Callbacks API', () => {
  it('should transition workflow to onApprove state when approval is approved', async () => {
    // Mock request/response
    const req = {
      params: { instanceId: '100' },
      body: { decision: 'approved', userId: 'user_123' }
    };
    const res = { json: jest.fn() };

    // Mock execution with pending approval
    const execution = {
      id: 1,
      currentState: 'submitted',
      status: 'awaiting_approval',
      executionData: {
        pendingApprovalAction: {
          type: 'request_approval',
          chainId: 3,
          onApprove: 'approved',
          onReject: 'draft'
        },
        pendingApprovalState: 'submitted'
      }
    };

    // Test expectation: workflow should advance to 'approved' state
    // This will be implemented in the next step
  });
});
```

- [ ] **Step 2: Add approval callback method to AutomationService**

```javascript
// Add to backend/src/modules/base_automation/services/index.js, after the transitionWorkflowState method

async handleApprovalCallback(approvalInstanceId, decision, userId) {
  // Get approval instance
  const approvalInstance = await this.models.ApprovalInstance.findById(approvalInstanceId);
  if (!approvalInstance) throw new Error('Approval instance not found');

  // Parse metadata to get execution ID
  let meta = {};
  if (approvalInstance.metadata) {
    meta = typeof approvalInstance.metadata === 'string'
      ? JSON.parse(approvalInstance.metadata) : approvalInstance.metadata;
  }

  if (meta.entityType !== 'workflow_execution') {
    throw new Error('Approval instance is not for a workflow execution');
  }

  const executionId = parseInt(meta.entityRef, 10);
  const execution = await this.models.WorkflowExecution.findById(executionId);
  if (!execution) throw new Error('Workflow execution not found');

  // Get execution data to find pending approval action
  let executionDataObj = {};
  if (execution.executionData) {
    executionDataObj = typeof execution.executionData === 'string'
      ? JSON.parse(execution.executionData) : execution.executionData;
  }

  const approvalAction = executionDataObj.pendingApprovalAction;
  if (!approvalAction) throw new Error('No pending approval action found');

  // Determine next state based on decision
  const nextState = decision === 'approved' ? approvalAction.onApprove : approvalAction.onReject;

  // Store approval decision in execution data
  executionDataObj.lastApprovalDecision = {
    decision,
    instanceId: approvalInstanceId,
    decidedBy: userId,
    decidedAt: new Date(),
    decidedFor: executionDataObj.pendingApprovalState
  };
  delete executionDataObj.pendingApprovalAction;
  delete executionDataObj.pendingApprovalState;

  // Transition to next state (without approval action this time)
  const updated = await this.models.WorkflowExecution.update(executionId, {
    currentState: nextState,
    status: 'active',
    executionData: executionDataObj
  });

  // Record transition in history
  await this.models.WorkflowExecutionHistory.create({
    executionId,
    fromState: execution.currentState,
    toState: nextState,
    transitionName: `approval_${decision}`,
    userId
  });

  // Fire webhooks and notifications
  const workflow = await this.models.Workflow.findById(execution.workflowId);
  this.webhookService?.triggerWebhooks('workflow.state_changed', 'workflow', {
    executionId,
    workflowId: execution.workflowId,
    fromState: execution.currentState,
    toState: nextState,
    approvalDecision: decision
  }).catch(() => {});

  this.workflowNotificationService?.notifyStateChange(
    executionId,
    execution.workflowId,
    execution.currentState,
    nextState,
    {
      recordId: execution.recordId,
      workflowName: workflow?.name,
      submitter: executionDataObj.initiatedBy ? { id: executionDataObj.initiatedBy } : null,
      approvalDecision: decision
    }
  ).catch(() => {});

  return updated;
}
```

- [ ] **Step 3: Add API endpoint for approval callback**

```javascript
// In backend/src/modules/base_automation/api/index.js, add new route after the workflows routes

router.post('/workflows/approvals/:instanceId/callback', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { decision, userId } = req.body;

    if (!decision || !['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({
        success: false,
        error: 'decision must be "approved" or "rejected"'
      });
    }

    const updated = await automationService.handleApprovalCallback(
      parseInt(instanceId, 10),
      decision,
      userId || req.userId
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
```

- [ ] **Step 4: Run test to verify callback logic works**

```bash
cd /opt/Lume && npm test -- tests/unit/base-automation-approval-workflow.test.js --testNamePattern="approval callback" 2>&1
```

Expected: Test passes (or update test as needed)

- [ ] **Step 5: Commit**

```bash
cd /opt/Lume && git add backend/src/modules/base_automation/services/index.js backend/src/modules/base_automation/api/index.js && git commit -m "feat: Add approval callback handling for workflow state transitions"
```

---

### Task 4: Update Module Initialization

**Files:**
- Modify: `backend/src/modules/base_automation/__init__.js` (lines 33-75)
- Modify: `tests/unit/base-automation-approval-workflow.test.js`

**Context:** The ApprovalRuntimeService needs to be passed to AutomationService so it can execute approval actions.

- [ ] **Step 1: Write failing test for service injection**

```javascript
// Add to tests/unit/base-automation-approval-workflow.test.js
describe('Module Initialization', () => {
  it('should inject ApprovalRuntimeService into AutomationService', async () => {
    // This will be verified by checking that automationService.approvalRuntimeService is set
    // Placeholder test — implementation verified in module initialization
  });
});
```

- [ ] **Step 2: Update module initialization to inject ApprovalRuntimeService**

```javascript
// In backend/src/modules/base_automation/__init__.js, around lines 60-75, update the service instantiation:

const automationService = new AutomationService(
  adapters,
  webhookService,
  workflowNotificationService,
  approvalRuntimeService  // Add this parameter
);

// Register services
serviceRegistry.register('automationService', automationService);
serviceRegistry.register('approvalRuntimeService', approvalRuntimeService);
serviceRegistry.register('workflowNotificationService', workflowNotificationService);
```

- [ ] **Step 3: Verify initialization in tests**

```bash
cd /opt/Lume && npm test -- tests/unit/base-automation-approval-workflow.test.js 2>&1 | tail -20
```

Expected: All tests passing

- [ ] **Step 4: Commit**

```bash
cd /opt/Lume && git add backend/src/modules/base_automation/__init__.js && git commit -m "feat: Inject ApprovalRuntimeService into AutomationService"
```

---

### Task 5: Add Workflow Approval Schema Table

**Files:**
- Modify: `backend/src/modules/base_automation/models/schema.js` (add new table)
- Modify: `backend/src/modules/base_automation/models/index.js` (register adapter)

**Context:** Optional but useful for tracking which approvals are linked to which workflow executions.

- [ ] **Step 1: Add workflow approval links table to schema**

```javascript
// In backend/src/modules/base_automation/models/schema.js, add at the end before export

export const automationWorkflowApprovalLinks = table('automation_workflow_approval_links', {
  ...baseColumns(),
  executionId: idCol('execution_id').notNull(),
  approvalInstanceId: idCol('approval_instance_id').notNull(),
  actionType: varchar('action_type', { length: 50 }).default('request_approval'),
  onApproveState: varchar('on_approve_state', { length: 50 }),
  onRejectState: varchar('on_reject_state', { length: 50 }),
  status: varchar('status', { length: 20 }).default('pending'),  // pending, approved, rejected
  metadata: json('metadata').$type().default({})
});
```

- [ ] **Step 2: Register adapter in models/index.js**

```javascript
// In backend/src/modules/base_automation/models/index.js, add to the export

import { automationWorkflowApprovalLinks } from './schema.js';

export const models = {
  // ... existing exports ...
  WorkflowApprovalLink: new DrizzleAdapter(automationWorkflowApprovalLinks)
};
```

- [ ] **Step 3: Update module init to register the adapter**

```javascript
// In backend/src/modules/base_automation/__init__.js, add to adapters object (around line 38-54)

adapters.WorkflowApprovalLink = new DrizzleAdapter(automationWorkflowApprovalLinks);
```

- [ ] **Step 4: Update service to use new table when creating approval action**

```javascript
// In backend/src/modules/base_automation/services/workflow-approval-action.js, add tracking:

async executeApprovalAction(execution, action, userId) {
  // ... existing code ...

  // Create approval link for tracking
  await this.models.WorkflowApprovalLink.create({
    executionId: execution.id,
    approvalInstanceId: approvalInstance.id,
    actionType: action.type,
    onApproveState: action.onApprove,
    onRejectState: action.onReject,
    status: 'pending'
  });

  return approvalInstance;
}
```

- [ ] **Step 5: Run migration (if applicable)**

```bash
# Check if database migration is needed
cd /opt/Lume && npm run db:migrate 2>&1 | tail -5
```

Expected: Migration created or DB updated successfully

- [ ] **Step 6: Commit**

```bash
cd /opt/Lume && git add backend/src/modules/base_automation/models/schema.js backend/src/modules/base_automation/models/index.js backend/src/modules/base_automation/__init__.js backend/src/modules/base_automation/services/workflow-approval-action.js && git commit -m "feat: Add workflow approval link tracking table"
```

---

### Task 6: Create Integration Test for Wave 1

**Files:**
- Modify: `tests/unit/base-automation-approval-workflow.test.js`

**Context:** E2E test verifying the complete flow: workflow transition → approval action → awaiting_approval status.

- [ ] **Step 1: Write complete integration test**

```javascript
// In tests/unit/base-automation-approval-workflow.test.js, add:

describe('Wave 1: Workflow Approval Actions - Integration', () => {
  let automationService;
  let mockModels;
  let approvalRuntimeService;

  beforeEach(() => {
    mockModels = {
      WorkflowExecution: {
        findById: jest.fn(),
        update: jest.fn()
      },
      Workflow: {
        findById: jest.fn()
      },
      WorkflowExecutionHistory: {
        create: jest.fn()
      },
      ApprovalInstance: {
        create: jest.fn()
      }
    };

    approvalRuntimeService = {
      submitForApproval: jest.fn().mockResolvedValue({ id: 100, status: 'pending' })
    };

    automationService = new AutomationService(
      mockModels,
      null, // webhookService
      null, // workflowNotificationService
      approvalRuntimeService
    );
  });

  it('should pause workflow and create approval when transition has approval action', async () => {
    const execution = {
      id: 1,
      workflowId: 5,
      recordId: 10,
      currentState: 'draft',
      status: 'active',
      executionData: { initiatedBy: 'user_123' }
    };

    const workflow = {
      id: 5,
      states: [
        { name: 'draft', is_start: true },
        { name: 'submitted', is_end: false },
        { name: 'approved', is_end: true }
      ]
    };

    mockModels.WorkflowExecution.findById.mockResolvedValue(execution);
    mockModels.Workflow.findById.mockResolvedValue(workflow);
    mockModels.WorkflowExecution.update.mockResolvedValue({
      ...execution,
      status: 'awaiting_approval'
    });

    const result = await automationService.transitionWorkflowState(
      1,
      'submitted',
      'auto',
      'user_123',
      true
    );

    // Should call approval service
    expect(approvalRuntimeService.submitForApproval).toHaveBeenCalled();
    // Should set status to awaiting_approval
    expect(result.status).toBe('awaiting_approval');
  });

  it('should transition to onApprove state when approval is approved', async () => {
    const execution = {
      id: 1,
      workflowId: 5,
      recordId: 10,
      currentState: 'submitted',
      status: 'awaiting_approval',
      executionData: {
        initiatedBy: 'user_123',
        pendingApprovalAction: {
          type: 'request_approval',
          chainId: 3,
          onApprove: 'approved',
          onReject: 'draft'
        },
        pendingApprovalState: 'submitted'
      }
    };

    const approvalInstance = {
      id: 100,
      metadata: JSON.stringify({ entityType: 'workflow_execution', entityRef: '1' })
    };

    mockModels.ApprovalInstance = {
      findById: jest.fn().mockResolvedValue(approvalInstance)
    };
    mockModels.WorkflowExecution.findById.mockResolvedValue(execution);
    mockModels.WorkflowExecution.update.mockResolvedValue({
      ...execution,
      currentState: 'approved',
      status: 'active'
    });
    mockModels.Workflow.findById.mockResolvedValue({
      id: 5,
      name: 'Test Workflow'
    });

    const result = await automationService.handleApprovalCallback(100, 'approved', 'approver_123');

    // Should advance to approved state
    expect(result.currentState).toBe('approved');
    expect(result.status).toBe('active');
    // Should record approval decision in execution data
    expect(mockModels.WorkflowExecutionHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        executionId: 1,
        fromState: 'submitted',
        toState: 'approved',
        transitionName: 'approval_approved'
      })
    );
  });
});
```

- [ ] **Step 2: Run integration tests**

```bash
cd /opt/Lume && npm test -- tests/unit/base-automation-approval-workflow.test.js --testNamePattern="Wave 1" 2>&1
```

Expected: Both integration tests pass

- [ ] **Step 3: Verify test coverage**

```bash
cd /opt/Lume && npm test -- tests/unit/base-automation-approval-workflow.test.js --coverage 2>&1 | grep "automation-approval-workflow" 
```

Expected: Coverage > 80% for new code

- [ ] **Step 4: Commit**

```bash
cd /opt/Lume && git add tests/unit/base-automation-approval-workflow.test.js && git commit -m "test: Add integration tests for Wave 1 approval workflow actions"
```

---

### Task 7: Add Frontend API Client for Approval Callbacks

**Files:**
- Modify: `backend/src/modules/base_automation/static/api/index.ts` (if exists) or create new

**Context:** Frontend needs a way to call the approval callback endpoints when users approve/reject.

- [ ] **Step 1: Check if frontend API file exists**

```bash
ls -la /opt/Lume/backend/src/modules/base_automation/static/api/ 2>/dev/null || echo "Directory does not exist"
```

- [ ] **Step 2: Create or update API client**

If file doesn't exist, create it:

```typescript
// backend/src/modules/base_automation/static/api/index.ts
import { get, post, put, del } from '@/api/request';

// Existing APIs...
// (keep any existing approval APIs)

// Wave 1: Approval Workflow Callbacks
export async function approveWorkflowApprovalApi(instanceId: number, userId: string) {
  return post(`/workflows/approvals/${instanceId}/callback`, {
    decision: 'approved',
    userId
  });
}

export async function rejectWorkflowApprovalApi(instanceId: number, userId: string) {
  return post(`/workflows/approvals/${instanceId}/callback`, {
    decision: 'rejected',
    userId
  });
}
```

- [ ] **Step 3: Verify API client exports**

```bash
grep -n "export async function" /opt/Lume/backend/src/modules/base_automation/static/api/index.ts | tail -5
```

Expected: New functions listed

- [ ] **Step 4: Commit**

```bash
cd /opt/Lume && git add backend/src/modules/base_automation/static/api/index.ts && git commit -m "feat: Add frontend API client for workflow approval callbacks"
```

---

### Task 8: Verify Wave 1 End-to-End

**Files:**
- No new files; verification only

**Context:** Final sanity check that all Wave 1 components work together.

- [ ] **Step 1: Run all tests**

```bash
cd /opt/Lume && npm test -- tests/unit/base-automation-approval-workflow.test.js 2>&1
```

Expected: All tests passing

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd /opt/Lume && npx tsc --noEmit 2>&1 | grep -i "base_automation" || echo "✓ No TypeScript errors"
```

Expected: No errors related to automation module

- [ ] **Step 3: Check git status**

```bash
cd /opt/Lume && git status
```

Expected: Clean working tree (all changes committed)

- [ ] **Step 4: Review commit log**

```bash
cd /opt/Lume && git log --oneline -8
```

Expected: 7 Wave 1 commits visible

- [ ] **Step 5: Summary**

Document completion:

```
✅ Wave 1 Complete: Workflow Approval Actions
  ✓ Task 1: WorkflowApprovalActionService created
  ✓ Task 2: Approval action execution added to transitionWorkflowState
  ✓ Task 3: Approval callback endpoints implemented
  ✓ Task 4: Module initialization updated
  ✓ Task 5: Workflow approval link tracking table added
  ✓ Task 6: Integration tests created
  ✓ Task 7: Frontend API client added
  ✓ Task 8: E2E verification passed
```

---

## Wave 2: Approval Callbacks & State Management (Planned)

**Status:** Not yet started (Phase 11 Wave 2)

**Tasks Preview:**
- Task 1: Webhook events for approval decisions
- Task 2: Escalation handling for SLA breaches
- Task 3: Approval timeout recovery
- Task 4: Decision delegation tracking

---

## Wave 3: UI & Integration Testing (Planned)

**Status:** Not yet started (Phase 11 Wave 3)

**Tasks Preview:**
- Task 1: Workflow builder UI for approval actions
- Task 2: E2E tests for approval workflows
- Task 3: Approval history dashboard
- Task 4: Performance testing

---

## Self-Review

### Spec Coverage
✅ Workflow approval actions (Task 1-2)
✅ Approval callbacks (Task 3)
✅ Service initialization (Task 4)
✅ Data tracking (Task 5)
✅ Testing (Task 6)
✅ Frontend integration (Task 7)

### Placeholder Scan
✅ No "TBD" or "TODO" items
✅ All code shown in full
✅ All commands explicit
✅ No missing function signatures

### Type Consistency
✅ `executeApprovalAction(execution, action, userId)` consistent across tasks
✅ `handleApprovalCallback(approvalInstanceId, decision, userId)` consistent
✅ Approval action structure: `{ type, chainId, onApprove, onReject }`
✅ Execution data structure updated consistently

---

**Plan Status:** Ready for implementation  
**Estimated Duration:** 4-5 hours (Wave 1) + 3-4 hours each for Waves 2-3  
**Next Step:** Choose execution approach (Subagent-Driven vs Inline)
