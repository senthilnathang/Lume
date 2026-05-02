/**
 * AutomationService Execution Unit Tests
 * Tests workflow execution, transitions, and auto-transition scheduling
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AutomationService } from '../../src/modules/base_automation/services/index.js';

describe('AutomationService - Execution Methods', () => {
  let service;
  let mockModels;

  beforeEach(() => {
    mockModels = {
      Workflow: {
        findById: jest.fn()
      },
      WorkflowExecution: {
        create: jest.fn(),
        findById: jest.fn(),
        update: jest.fn()
      },
      WorkflowExecutionHistory: {
        create: jest.fn(),
        findAll: jest.fn()
      },
      AutoTransition: {
        create: jest.fn(),
        findById: jest.fn(),
        findAll: jest.fn(),
        update: jest.fn()
      }
    };

    service = new AutomationService(mockModels);
  });

  describe('startWorkflowExecution', () => {
    it('should throw error if workflow not found', async () => {
      mockModels.Workflow.findById.mockResolvedValue(null);

      await expect(
        service.startWorkflowExecution(999, 'record-1', 'user-1')
      ).rejects.toThrow('Workflow not found');
    });

    it('should throw error if workflow has no states', async () => {
      mockModels.Workflow.findById.mockResolvedValue({
        id: 1,
        states: '[]'
      });

      await expect(
        service.startWorkflowExecution(1, 'record-1', 'user-1')
      ).rejects.toThrow('Workflow has no states');
    });

    it('should use is_start state as initial state', async () => {
      mockModels.Workflow.findById.mockResolvedValue({
        id: 1,
        states: JSON.stringify([
          { name: 'draft', is_start: true, is_end: false },
          { name: 'review', is_start: false, is_end: false }
        ])
      });

      mockModels.WorkflowExecution.create.mockResolvedValue({
        id: 'exec-1',
        workflowId: 1,
        currentState: 'draft'
      });

      mockModels.WorkflowExecutionHistory.create.mockResolvedValue({});

      const result = await service.startWorkflowExecution(1, 'record-1', 'user-1');

      expect(result.currentState).toBe('draft');
      expect(mockModels.WorkflowExecution.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 1,
          recordId: 'record-1',
          currentState: 'draft',
          status: 'active'
        })
      );
    });

    it('should create history entry for START', async () => {
      mockModels.Workflow.findById.mockResolvedValue({
        id: 1,
        states: JSON.stringify([
          { name: 'draft', is_start: true, is_end: false }
        ])
      });

      mockModels.WorkflowExecution.create.mockResolvedValue({
        id: 'exec-1',
        currentState: 'draft'
      });

      mockModels.WorkflowExecutionHistory.create.mockResolvedValue({});

      await service.startWorkflowExecution(1, 'record-1', 'user-1');

      expect(mockModels.WorkflowExecutionHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId: 'exec-1',
          fromState: null,
          toState: 'draft',
          transitionName: 'START',
          userId: 'user-1'
        })
      );
    });

    it('should use first state as fallback if no is_start state', async () => {
      mockModels.Workflow.findById.mockResolvedValue({
        id: 1,
        states: JSON.stringify([
          { name: 'draft', is_start: false, is_end: false },
          { name: 'review', is_start: false, is_end: false }
        ])
      });

      mockModels.WorkflowExecution.create.mockResolvedValue({
        id: 'exec-1',
        currentState: 'draft'
      });

      mockModels.WorkflowExecutionHistory.create.mockResolvedValue({});

      await service.startWorkflowExecution(1, 'record-1', 'user-1');

      expect(mockModels.WorkflowExecution.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currentState: 'draft'
        })
      );
    });
  });

  describe('transitionWorkflowState', () => {
    it('should throw error if execution not found', async () => {
      mockModels.WorkflowExecution.findById.mockResolvedValue(null);

      await expect(
        service.transitionWorkflowState('exec-1', 'review', 'Submit for Review', 'user-1')
      ).rejects.toThrow('Execution not found');
    });

    it('should throw error if execution is not active', async () => {
      mockModels.WorkflowExecution.findById.mockResolvedValue({
        id: 'exec-1',
        status: 'completed'
      });

      await expect(
        service.transitionWorkflowState('exec-1', 'review', 'Submit for Review', 'user-1')
      ).rejects.toThrow('Execution is not active');
    });

    it('should create history entry for transition', async () => {
      mockModels.WorkflowExecution.findById.mockResolvedValue({
        id: 'exec-1',
        status: 'active',
        currentState: 'draft',
        workflowId: 1,
        executionData: '{}'
      });

      mockModels.Workflow.findById.mockResolvedValue({
        id: 1,
        states: JSON.stringify([
          { name: 'draft', is_start: true, is_end: false },
          { name: 'review', is_start: false, is_end: false }
        ])
      });

      mockModels.WorkflowExecutionHistory.create.mockResolvedValue({});
      mockModels.WorkflowExecution.update.mockResolvedValue({});

      await service.transitionWorkflowState('exec-1', 'review', 'Submit', 'user-1');

      expect(mockModels.WorkflowExecutionHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId: 'exec-1',
          fromState: 'draft',
          toState: 'review',
          transitionName: 'Submit',
          userId: 'user-1'
        })
      );
    });

    it('should set status to completed for is_end states', async () => {
      mockModels.WorkflowExecution.findById.mockResolvedValue({
        id: 'exec-1',
        status: 'active',
        currentState: 'approved',
        workflowId: 1,
        executionData: '{}'
      });

      mockModels.Workflow.findById.mockResolvedValue({
        id: 1,
        states: JSON.stringify([
          { name: 'approved', is_start: false, is_end: false },
          { name: 'completed', is_start: false, is_end: true }
        ])
      });

      mockModels.WorkflowExecutionHistory.create.mockResolvedValue({});
      mockModels.WorkflowExecution.update.mockResolvedValue({});

      await service.transitionWorkflowState('exec-1', 'completed', 'Complete', 'user-1');

      expect(mockModels.WorkflowExecution.update).toHaveBeenCalledWith(
        'exec-1',
        expect.objectContaining({
          status: 'completed'
        })
      );
    });

    it('should set status to active for non-end states', async () => {
      mockModels.WorkflowExecution.findById.mockResolvedValue({
        id: 'exec-1',
        status: 'active',
        currentState: 'draft',
        workflowId: 1,
        executionData: '{}'
      });

      mockModels.Workflow.findById.mockResolvedValue({
        id: 1,
        states: JSON.stringify([
          { name: 'draft', is_start: true, is_end: false },
          { name: 'review', is_start: false, is_end: false }
        ])
      });

      mockModels.WorkflowExecutionHistory.create.mockResolvedValue({});
      mockModels.WorkflowExecution.update.mockResolvedValue({});

      await service.transitionWorkflowState('exec-1', 'review', 'Submit', 'user-1');

      expect(mockModels.WorkflowExecution.update).toHaveBeenCalledWith(
        'exec-1',
        expect.objectContaining({
          status: 'active'
        })
      );
    });
  });

  describe('scheduleAutoTransition', () => {
    it('should compute scheduledFor from delaySeconds', async () => {
      const execId = 'exec-1';
      const now = Date.now();
      jest.setSystemTime(new Date(now));

      mockModels.WorkflowExecution.findById.mockResolvedValue({
        workflowId: 1
      });

      mockModels.AutoTransition.create.mockResolvedValue({
        id: 'auto-1',
        scheduledFor: new Date(now + 5000)
      });

      await service.scheduleAutoTransition(
        execId,
        'draft',
        'review',
        'timer',
        { delaySeconds: 5 }
      );

      expect(mockModels.AutoTransition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId: execId,
          triggerType: 'timer',
          delaySeconds: 5,
          status: 'pending'
        })
      );

      const scheduledFor = mockModels.AutoTransition.create.mock.calls[0][0].scheduledFor;
      expect(scheduledFor.getTime()).toBeGreaterThanOrEqual(now + 5000);
    });

    it('should use provided scheduledFor if no delaySeconds', async () => {
      const scheduledTime = new Date(Date.now() + 10000);

      mockModels.WorkflowExecution.findById.mockResolvedValue({
        workflowId: 1
      });

      mockModels.AutoTransition.create.mockResolvedValue({
        id: 'auto-1'
      });

      await service.scheduleAutoTransition(
        'exec-1',
        'draft',
        'review',
        'webhook',
        { scheduledFor: scheduledTime }
      );

      expect(mockModels.AutoTransition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledFor: scheduledTime
        })
      );
    });

    it('should store webhookUrl and conditionData when provided', async () => {
      mockModels.WorkflowExecution.findById.mockResolvedValue({
        workflowId: 1
      });

      mockModels.AutoTransition.create.mockResolvedValue({
        id: 'auto-1'
      });

      await service.scheduleAutoTransition(
        'exec-1',
        'draft',
        'review',
        'webhook',
        {
          webhookUrl: 'https://example.com/hook',
          conditionData: { field: 'status', operator: 'eq', value: 'approved' }
        }
      );

      expect(mockModels.AutoTransition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          webhookUrl: 'https://example.com/hook',
          conditionData: { field: 'status', operator: 'eq', value: 'approved' }
        })
      );
    });
  });

  describe('executeAutoTransition', () => {
    it('should throw error if auto-transition not found', async () => {
      mockModels.AutoTransition.findById.mockResolvedValue(null);

      await expect(
        service.executeAutoTransition('auto-1')
      ).rejects.toThrow('Auto-transition not found');
    });

    it('should throw error if auto-transition is not pending', async () => {
      mockModels.AutoTransition.findById.mockResolvedValue({
        id: 'auto-1',
        status: 'executed'
      });

      await expect(
        service.executeAutoTransition('auto-1')
      ).rejects.toThrow('Auto-transition is not pending');
    });

    it('should throw error if execution not found', async () => {
      mockModels.AutoTransition.findById.mockResolvedValue({
        id: 'auto-1',
        status: 'pending',
        executionId: 'exec-1'
      });

      mockModels.WorkflowExecution.findById.mockResolvedValue(null);

      await expect(
        service.executeAutoTransition('auto-1')
      ).rejects.toThrow('Execution not found');
    });

    it('should cancel if execution state has changed', async () => {
      mockModels.AutoTransition.findById.mockResolvedValue({
        id: 'auto-1',
        status: 'pending',
        executionId: 'exec-1',
        fromState: 'draft',
        toState: 'review'
      });

      mockModels.WorkflowExecution.findById.mockResolvedValue({
        id: 'exec-1',
        currentState: 'review' // Different from expected 'draft'
      });

      mockModels.AutoTransition.update.mockResolvedValue({});

      await expect(
        service.executeAutoTransition('auto-1')
      ).rejects.toThrow('Execution state has changed, auto-transition cancelled');

      expect(mockModels.AutoTransition.update).toHaveBeenCalledWith('auto-1', {
        status: 'cancelled'
      });
    });

    it('should execute transition and mark as executed', async () => {
      mockModels.AutoTransition.findById.mockResolvedValue({
        id: 'auto-1',
        status: 'pending',
        executionId: 'exec-1',
        fromState: 'draft',
        toState: 'review'
      });

      mockModels.WorkflowExecution.findById.mockResolvedValue({
        id: 'exec-1',
        status: 'active',
        currentState: 'draft',
        workflowId: 1,
        executionData: '{}'
      });

      mockModels.Workflow.findById.mockResolvedValue({
        id: 1,
        states: JSON.stringify([
          { name: 'draft', is_start: true, is_end: false },
          { name: 'review', is_start: false, is_end: false }
        ])
      });

      mockModels.WorkflowExecutionHistory.create.mockResolvedValue({});
      mockModels.WorkflowExecution.update.mockResolvedValue({
        id: 'exec-1',
        currentState: 'review'
      });

      await service.executeAutoTransition('auto-1');

      // Should mark as executed
      expect(mockModels.AutoTransition.update).toHaveBeenCalledWith(
        'auto-1',
        expect.objectContaining({
          status: 'executed'
        })
      );

      // Should execute the transition
      expect(mockModels.WorkflowExecution.update).toHaveBeenCalledWith(
        'exec-1',
        expect.objectContaining({
          currentState: 'review'
        })
      );
    });

    it('should record auto-transition in history with Auto: prefix', async () => {
      mockModels.AutoTransition.findById.mockResolvedValue({
        id: 'auto-1',
        status: 'pending',
        executionId: 'exec-1',
        fromState: 'draft',
        toState: 'review'
      });

      mockModels.WorkflowExecution.findById.mockResolvedValue({
        id: 'exec-1',
        status: 'active',
        currentState: 'draft',
        workflowId: 1,
        executionData: '{}'
      });

      mockModels.Workflow.findById.mockResolvedValue({
        id: 1,
        states: JSON.stringify([
          { name: 'draft', is_start: true, is_end: false },
          { name: 'review', is_start: false, is_end: false }
        ])
      });

      mockModels.WorkflowExecutionHistory.create.mockResolvedValue({});
      mockModels.WorkflowExecution.update.mockResolvedValue({});

      await service.executeAutoTransition('auto-1');

      expect(mockModels.WorkflowExecutionHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          transitionName: 'Auto: review'
        })
      );
    });
  });
});
