/**
 * WorkflowApprovalActionService Unit Tests
 * Tests approval action execution within workflow transitions
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { WorkflowApprovalActionService } from '../../src/modules/base_automation/services/workflow-approval-action.js';

describe('WorkflowApprovalActionService', () => {
  let service;
  let mockApprovalService;

  beforeEach(() => {
    mockApprovalService = {
      submitForApproval: jest.fn()
    };
    service = new WorkflowApprovalActionService(mockApprovalService);
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

    it('should throw error for unknown approval action type', async () => {
      const execution = { id: 1, workflowId: 5, recordId: 10, currentState: 'draft' };
      const action = {
        type: 'unknown_action',
        chainId: 3,
        onApprove: 'submitted',
        onReject: 'draft'
      };

      await expect(
        service.executeApprovalAction(execution, action, 'user_123')
      ).rejects.toThrow('Unsupported approval action type: "unknown_action". Expected "request_approval".');
    });

    it('should throw error if chainId is missing', async () => {
      const execution = { id: 1, workflowId: 5, recordId: 10, currentState: 'draft' };
      const action = {
        type: 'request_approval',
        onApprove: 'submitted',
        onReject: 'draft'
      };

      await expect(
        service.executeApprovalAction(execution, action, 'user_123')
      ).rejects.toThrow('Approval action requires chainId, onApprove, and onReject');
    });

    it('should throw error if onApprove is missing', async () => {
      const execution = { id: 1, workflowId: 5, recordId: 10, currentState: 'draft' };
      const action = {
        type: 'request_approval',
        chainId: 3,
        onReject: 'draft'
      };

      await expect(
        service.executeApprovalAction(execution, action, 'user_123')
      ).rejects.toThrow('Approval action requires chainId, onApprove, and onReject');
    });

    it('should throw error if onReject is missing', async () => {
      const execution = { id: 1, workflowId: 5, recordId: 10, currentState: 'draft' };
      const action = {
        type: 'request_approval',
        chainId: 3,
        onApprove: 'submitted'
      };

      await expect(
        service.executeApprovalAction(execution, action, 'user_123')
      ).rejects.toThrow('Approval action requires chainId, onApprove, and onReject');
    });

    it('should convert execution id to string for entityRef', async () => {
      const execution = { id: 42, workflowId: 5, recordId: 10, currentState: 'draft' };
      const action = {
        type: 'request_approval',
        chainId: 7,
        onApprove: 'approved_state',
        onReject: 'rejected_state'
      };

      mockApprovalService.submitForApproval.mockResolvedValue({ id: 200 });

      await service.executeApprovalAction(execution, action, 'user_456');

      expect(mockApprovalService.submitForApproval).toHaveBeenCalledWith(
        7,
        'workflow_execution',
        '42',
        'user_456',
        42
      );
    });

    it('should pass execution id as executionId to submitForApproval', async () => {
      const execution = { id: 99, workflowId: 5, recordId: 10, currentState: 'draft' };
      const action = {
        type: 'request_approval',
        chainId: 3,
        onApprove: 'submitted',
        onReject: 'draft'
      };

      mockApprovalService.submitForApproval.mockResolvedValue({ id: 100 });

      await service.executeApprovalAction(execution, action, 'user_123');

      expect(mockApprovalService.submitForApproval).toHaveBeenCalledWith(
        3,
        'workflow_execution',
        '99',
        'user_123',
        99
      );
    });

    it('should throw error if execution is null', async () => {
      const action = {
        type: 'request_approval',
        chainId: 3,
        onApprove: 'submitted',
        onReject: 'draft'
      };

      await expect(
        service.executeApprovalAction(null, action, 'user_123')
      ).rejects.toThrow('Workflow execution must have a valid ID');
    });

    it('should throw error if execution has no id', async () => {
      const execution = { workflowId: 5, recordId: 10 };
      const action = {
        type: 'request_approval',
        chainId: 3,
        onApprove: 'submitted',
        onReject: 'draft'
      };

      await expect(
        service.executeApprovalAction(execution, action, 'user_123')
      ).rejects.toThrow('Workflow execution must have a valid ID');
    });
  });
});

// ── AutomationService Approval Action Tests ──────────────────

import { AutomationService } from '../../src/modules/base_automation/services/index.js';

describe('AutomationService - transitionWorkflowState with approval action', () => {
  let automationService;
  let mockModels;
  let mockApprovalService;

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

    automationService = new AutomationService(mockModels, null, null, mockApprovalService);
    automationService.webhookService = null;
    automationService.workflowNotificationService = null;
  });

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
      states: JSON.stringify([
        { name: 'draft', is_start: true, is_end: false },
        { name: 'submitted', is_start: false, is_end: false },
        { name: 'approved', is_start: false, is_end: true }
      ]),
      transitions: JSON.stringify([
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
      ])
    };

    mockModels.WorkflowExecution.findById.mockResolvedValue(execution);
    mockModels.Workflow.findById.mockResolvedValue(workflow);
    mockModels.WorkflowExecution.update.mockResolvedValue({
      ...execution,
      status: 'awaiting_approval'
    });
    mockModels.WorkflowExecutionHistory.create.mockResolvedValue({});

    // Spy on the approval action service method
    jest.spyOn(automationService.workflowApprovalActionService, 'executeApprovalAction')
      .mockResolvedValue({ id: 100 });

    const result = await automationService.transitionWorkflowState(
      1,
      'submitted',
      'auto',
      'user_123',
      true  // hasApprovalAction flag
    );

    expect(automationService.workflowApprovalActionService.executeApprovalAction).toHaveBeenCalled();
    expect(result.status).toBe('awaiting_approval');
  });

  it('should perform normal transition when hasApprovalAction is false', async () => {
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
      states: JSON.stringify([
        { name: 'draft', is_start: true, is_end: false },
        { name: 'submitted', is_start: false, is_end: true }
      ]),
      transitions: JSON.stringify([
        {
          from: 'draft',
          to: 'submitted',
          actions: []
        }
      ])
    };

    mockModels.WorkflowExecution.findById.mockResolvedValue(execution);
    mockModels.Workflow.findById.mockResolvedValue(workflow);
    mockModels.WorkflowExecution.update.mockResolvedValue({
      ...execution,
      currentState: 'submitted',
      status: 'completed'
    });
    mockModels.WorkflowExecutionHistory.create.mockResolvedValue({});

    const result = await automationService.transitionWorkflowState(
      1,
      'submitted',
      'auto',
      'user_123',
      false
    );

    expect(result.currentState).toBe('submitted');
    expect(result.status).toBe('completed');
  });

  it('should store pending approval action in executionData', async () => {
    const execution = {
      id: 1,
      workflowId: 5,
      recordId: 10,
      currentState: 'draft',
      status: 'active',
      executionData: JSON.stringify({ initiatedBy: 'user_123' })
    };
    const workflow = {
      id: 5,
      states: JSON.stringify([
        { name: 'draft', is_start: true, is_end: false },
        { name: 'submitted', is_start: false, is_end: false }
      ]),
      transitions: JSON.stringify([
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
      ])
    };

    mockModels.WorkflowExecution.findById.mockResolvedValue(execution);
    mockModels.Workflow.findById.mockResolvedValue(workflow);
    mockModels.WorkflowExecution.update.mockResolvedValue({
      ...execution,
      status: 'awaiting_approval'
    });
    mockModels.WorkflowExecutionHistory.create.mockResolvedValue({});

    await automationService.transitionWorkflowState(
      1,
      'submitted',
      'auto',
      'user_123',
      true
    );

    const updateCall = mockModels.WorkflowExecution.update.mock.calls[0];
    expect(updateCall[1].status).toBe('awaiting_approval');
    expect(updateCall[1].executionData.pendingApprovalAction).toBeDefined();
    expect(updateCall[1].executionData.pendingApprovalState).toBe('submitted');
  });
});

// ── AutomationService handleApprovalCallback Tests ──────────────

describe('AutomationService - handleApprovalCallback', () => {
  let automationService;
  let mockModels;

  beforeEach(() => {
    mockModels = {
      ApprovalInstance: {
        findById: jest.fn()
      },
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

    automationService = new AutomationService(mockModels, null, null, null);
    automationService.webhookService = null;
    automationService.workflowNotificationService = null;
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

    mockModels.ApprovalInstance.findById.mockResolvedValue(approvalInstance);
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
    mockModels.WorkflowExecutionHistory.create.mockResolvedValue({});

    const result = await automationService.handleApprovalCallback(100, 'approved', 'approver_123');

    expect(result.currentState).toBe('approved');
    expect(result.status).toBe('active');
    expect(mockModels.WorkflowExecutionHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        executionId: 1,
        fromState: 'submitted',
        toState: 'approved',
        transitionName: 'approval_approved'
      })
    );
  });

  it('should transition to onReject state when approval is rejected', async () => {
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

    mockModels.ApprovalInstance.findById.mockResolvedValue(approvalInstance);
    mockModels.WorkflowExecution.findById.mockResolvedValue(execution);
    mockModels.WorkflowExecution.update.mockResolvedValue({
      ...execution,
      currentState: 'draft',
      status: 'active'
    });
    mockModels.Workflow.findById.mockResolvedValue({
      id: 5,
      name: 'Test Workflow'
    });
    mockModels.WorkflowExecutionHistory.create.mockResolvedValue({});

    const result = await automationService.handleApprovalCallback(100, 'rejected', 'approver_123');

    expect(result.currentState).toBe('draft');
    expect(result.status).toBe('active');
    expect(mockModels.WorkflowExecutionHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        toState: 'draft',
        transitionName: 'approval_rejected'
      })
    );
  });

  it('should throw error for invalid decision', async () => {
    const approvalInstance = {
      id: 100,
      metadata: JSON.stringify({ entityType: 'workflow_execution', entityRef: '1' })
    };

    mockModels.ApprovalInstance.findById.mockResolvedValue(approvalInstance);

    await expect(
      automationService.handleApprovalCallback(100, 'invalid', 'approver_123')
    ).rejects.toThrow('Decision must be "approved" or "rejected"');
  });

  it('should throw error if approval instance not found', async () => {
    mockModels.ApprovalInstance.findById.mockResolvedValue(null);

    await expect(
      automationService.handleApprovalCallback(100, 'approved', 'approver_123')
    ).rejects.toThrow('Approval instance not found');
  });

  it('should throw error if approval is not for workflow execution', async () => {
    const approvalInstance = {
      id: 100,
      metadata: JSON.stringify({ entityType: 'document', entityRef: '5' })
    };

    mockModels.ApprovalInstance.findById.mockResolvedValue(approvalInstance);

    await expect(
      automationService.handleApprovalCallback(100, 'approved', 'approver_123')
    ).rejects.toThrow('Approval instance is not for a workflow execution');
  });

  it('should throw error if workflow execution not found', async () => {
    const approvalInstance = {
      id: 100,
      metadata: JSON.stringify({ entityType: 'workflow_execution', entityRef: '1' })
    };

    mockModels.ApprovalInstance.findById.mockResolvedValue(approvalInstance);
    mockModels.WorkflowExecution.findById.mockResolvedValue(null);

    await expect(
      automationService.handleApprovalCallback(100, 'approved', 'approver_123')
    ).rejects.toThrow('Workflow execution not found');
  });

  it('should throw error if no pending approval action', async () => {
    const execution = {
      id: 1,
      workflowId: 5,
      recordId: 10,
      currentState: 'submitted',
      status: 'awaiting_approval',
      executionData: {
        initiatedBy: 'user_123'
      }
    };

    const approvalInstance = {
      id: 100,
      metadata: JSON.stringify({ entityType: 'workflow_execution', entityRef: '1' })
    };

    mockModels.ApprovalInstance.findById.mockResolvedValue(approvalInstance);
    mockModels.WorkflowExecution.findById.mockResolvedValue(execution);

    await expect(
      automationService.handleApprovalCallback(100, 'approved', 'approver_123')
    ).rejects.toThrow('No pending approval action found');
  });

  it('should store approval decision in executionData', async () => {
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

    mockModels.ApprovalInstance.findById.mockResolvedValue(approvalInstance);
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
    mockModels.WorkflowExecutionHistory.create.mockResolvedValue({});

    await automationService.handleApprovalCallback(100, 'approved', 'approver_123');

    const updateCall = mockModels.WorkflowExecution.update.mock.calls[0];
    expect(updateCall[1].executionData.lastApprovalDecision).toBeDefined();
    expect(updateCall[1].executionData.lastApprovalDecision.decision).toBe('approved');
    expect(updateCall[1].executionData.lastApprovalDecision.instanceId).toBe(100);
    expect(updateCall[1].executionData.pendingApprovalAction).toBeUndefined();
    expect(updateCall[1].executionData.pendingApprovalState).toBeUndefined();
  });

  it('should clear pending approval action after callback', async () => {
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

    mockModels.ApprovalInstance.findById.mockResolvedValue(approvalInstance);
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
    mockModels.WorkflowExecutionHistory.create.mockResolvedValue({});

    await automationService.handleApprovalCallback(100, 'rejected', 'approver_123');

    const updateCall = mockModels.WorkflowExecution.update.mock.calls[0];
    expect(updateCall[1].executionData.pendingApprovalAction).toBeUndefined();
    expect(updateCall[1].executionData.pendingApprovalState).toBeUndefined();
  });
});

// ── Wave 1: Workflow Approval Actions - End-to-End Integration ────

describe('Wave 1: Workflow Approval Actions - End-to-End Integration', () => {
  let automationService;
  let mockModels;
  let mockApprovalService;

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
        findById: jest.fn()
      },
      WorkflowApprovalLink: {
        create: jest.fn(),
        findAll: jest.fn()
      }
    };

    mockApprovalService = {
      submitForApproval: jest.fn().mockResolvedValue({ id: 100, status: 'pending' })
    };

    automationService = new AutomationService(
      mockModels,
      null,
      null,
      mockApprovalService
    );
    automationService.webhookService = null;
    automationService.workflowNotificationService = null;
  });

  it('should complete full workflow: normal transition → approval action → decision → state advancement', async () => {
    // Step 1: Transition with approval action
    const execution1 = {
      id: 1,
      workflowId: 5,
      recordId: 10,
      currentState: 'draft',
      status: 'active',
      executionData: { initiatedBy: 'user_123' }
    };

    const workflow = {
      id: 5,
      name: 'Change Request',
      states: JSON.stringify([
        { name: 'draft', is_start: true, is_end: false },
        { name: 'submitted', is_start: false, is_end: false },
        { name: 'approved', is_start: false, is_end: true },
        { name: 'rejected', is_start: false, is_end: false }
      ]),
      transitions: JSON.stringify([
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
      ])
    };

    mockModels.WorkflowExecution.findById.mockResolvedValue(execution1);
    mockModels.Workflow.findById.mockResolvedValue(workflow);
    mockModels.WorkflowExecution.update.mockResolvedValueOnce({
      ...execution1,
      status: 'awaiting_approval',
      currentState: 'submitted',
      executionData: {
        ...execution1.executionData,
        pendingApprovalAction: {
          type: 'request_approval',
          chainId: 3,
          onApprove: 'approved',
          onReject: 'draft'
        },
        pendingApprovalState: 'submitted'
      }
    });

    jest.spyOn(automationService.workflowApprovalActionService, 'executeApprovalAction')
      .mockResolvedValue({ id: 100 });

    const result1 = await automationService.transitionWorkflowState(
      1,
      'submitted',
      'manual',
      'user_123',
      true
    );

    expect(result1.status).toBe('awaiting_approval');
    expect(automationService.workflowApprovalActionService.executeApprovalAction).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      'user_123'
    );

    // Step 2: Approval decision
    const approvalInstance = {
      id: 100,
      metadata: JSON.stringify({ entityType: 'workflow_execution', entityRef: '1' })
    };

    const execution2 = {
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

    mockModels.ApprovalInstance.findById.mockResolvedValue(approvalInstance);
    mockModels.WorkflowExecution.findById.mockResolvedValue(execution2);
    mockModels.WorkflowExecution.update.mockResolvedValueOnce({
      ...execution2,
      currentState: 'approved',
      status: 'active',
      executionData: {
        initiatedBy: 'user_123',
        lastApprovalDecision: {
          decision: 'approved',
          instanceId: 100,
          decidedBy: 'approver_123',
          decidedAt: new Date(),
          decidedFor: 'submitted'
        }
      }
    });

    const result2 = await automationService.handleApprovalCallback(
      100,
      'approved',
      'approver_123'
    );

    expect(result2.currentState).toBe('approved');
    expect(result2.status).toBe('active');
    expect(mockModels.WorkflowExecutionHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        executionId: 1,
        fromState: 'submitted',
        toState: 'approved',
        transitionName: 'approval_approved'
      })
    );
  });

  it('should handle approval rejection and return to start state', async () => {
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

    mockModels.ApprovalInstance.findById.mockResolvedValue(approvalInstance);
    mockModels.WorkflowExecution.findById.mockResolvedValue(execution);
    mockModels.Workflow.findById.mockResolvedValue({
      id: 5,
      name: 'Change Request',
      states: JSON.stringify([
        { name: 'draft', is_start: true, is_end: false },
        { name: 'submitted', is_start: false, is_end: false },
        { name: 'approved', is_start: false, is_end: true }
      ]),
      transitions: JSON.stringify([])
    });
    mockModels.WorkflowExecution.update.mockResolvedValue({
      ...execution,
      currentState: 'draft',
      status: 'active'
    });
    mockModels.WorkflowExecutionHistory.create.mockResolvedValue({});

    const result = await automationService.handleApprovalCallback(
      100,
      'rejected',
      'approver_123'
    );

    expect(result.currentState).toBe('draft');
    expect(mockModels.WorkflowExecutionHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        toState: 'draft',
        transitionName: 'approval_rejected'
      })
    );
  });

  it('should preserve existing execution data while adding approval decision', async () => {
    const execution = {
      id: 1,
      workflowId: 5,
      recordId: 10,
      currentState: 'submitted',
      status: 'awaiting_approval',
      executionData: {
        initiatedBy: 'user_123',
        customField: 'custom_value',
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

    mockModels.ApprovalInstance.findById.mockResolvedValue(approvalInstance);
    mockModels.WorkflowExecution.findById.mockResolvedValue(execution);
    mockModels.Workflow.findById.mockResolvedValue({
      id: 5,
      name: 'Change Request',
      states: JSON.stringify([]),
      transitions: JSON.stringify([])
    });

    let capturedUpdateData = null;
    mockModels.WorkflowExecution.update.mockImplementation((id, data) => {
      capturedUpdateData = data;
      return Promise.resolve({ ...execution, ...data });
    });

    mockModels.WorkflowExecutionHistory.create.mockResolvedValue({});

    await automationService.handleApprovalCallback(100, 'approved', 'approver_123');

    expect(capturedUpdateData.executionData.customField).toBe('custom_value');
    expect(capturedUpdateData.executionData.initiatedBy).toBe('user_123');
    expect(capturedUpdateData.executionData.pendingApprovalAction).toBeUndefined();
    expect(capturedUpdateData.executionData.pendingApprovalState).toBeUndefined();
    expect(capturedUpdateData.executionData.lastApprovalDecision).toBeDefined();
    expect(capturedUpdateData.executionData.lastApprovalDecision.decision).toBe('approved');
  });

  it('should maintain workflow state consistency across approval lifecycle', async () => {
    const workflow = {
      id: 5,
      name: 'Multi-Step Approval',
      states: JSON.stringify([
        { name: 'draft', is_start: true, is_end: false },
        { name: 'review', is_start: false, is_end: false },
        { name: 'approved', is_start: false, is_end: true },
        { name: 'published', is_start: false, is_end: true }
      ]),
      transitions: JSON.stringify([
        {
          from: 'draft',
          to: 'review',
          actions: [
            {
              type: 'request_approval',
              chainId: 1,
              onApprove: 'approved',
              onReject: 'draft'
            }
          ]
        }
      ])
    };

    const execution = {
      id: 2,
      workflowId: 5,
      recordId: 20,
      currentState: 'review',
      status: 'awaiting_approval',
      executionData: {
        initiatedBy: 'user_456',
        processedAt: '2026-05-02T10:00:00Z',
        pendingApprovalAction: {
          type: 'request_approval',
          chainId: 1,
          onApprove: 'approved',
          onReject: 'draft'
        },
        pendingApprovalState: 'review'
      }
    };

    const approvalInstance = {
      id: 200,
      metadata: JSON.stringify({ entityType: 'workflow_execution', entityRef: '2' })
    };

    mockModels.WorkflowExecution.findById.mockResolvedValue(execution);
    mockModels.ApprovalInstance.findById.mockResolvedValue(approvalInstance);
    mockModels.Workflow.findById.mockResolvedValue(workflow);

    let finalState = null;
    mockModels.WorkflowExecution.update.mockImplementation((id, data) => {
      finalState = {
        ...execution,
        ...data,
        currentState: data.currentState || execution.currentState,
        status: data.status || execution.status
      };
      return Promise.resolve(finalState);
    });

    mockModels.WorkflowExecutionHistory.create.mockResolvedValue({});

    const result = await automationService.handleApprovalCallback(200, 'approved', 'approver_456');

    expect(result.currentState).toBe('approved');
    expect(result.status).toBe('active');
    expect(result.executionData.initiatedBy).toBe('user_456');
    expect(result.executionData.processedAt).toBe('2026-05-02T10:00:00Z');
    expect(result.executionData.lastApprovalDecision.decidedBy).toBe('approver_456');
  });
});
