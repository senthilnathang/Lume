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
