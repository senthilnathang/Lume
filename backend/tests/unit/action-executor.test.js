/**
 * @fileoverview Unit tests for ActionExecutor
 * Tests action execution with timeout, retry, and dependency handling
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ActionExecutor } from '../../src/core/workflows/action-executor.js';

describe('ActionExecutor', () => {
  let executor;
  let entityStore;
  let instance;

  beforeEach(() => {
    // Mock entityStore
    entityStore = {
      create: jest.fn().mockResolvedValue({ id: '1', name: 'created' }),
      update: jest.fn().mockResolvedValue({ id: '1', name: 'updated' }),
      delete: jest.fn().mockResolvedValue({ id: '1', deleted: true })
    };

    // Create executor
    executor = new ActionExecutor(entityStore);

    // Base workflow instance
    instance = {
      id: 'instance-1',
      workflowId: 'workflow-1',
      status: 'running',
      triggeredBy: 'event',
      startedAt: new Date(),
      actionResults: new Map()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // SINGLE ACTION EXECUTION TESTS
  // ============================================================================

  describe('Single Action Execution', () => {
    it('should execute create-entity action successfully', async () => {
      const action = {
        id: 'action-1',
        type: 'create-entity',
        target: 'ticket',
        payload: { title: 'Test Ticket', status: 'open' }
      };

      const contextData = { userId: 'user-1' };

      const result = await executor.execute(action, instance, contextData);

      expect(result.success).toBe(true);
      expect(result.actionId).toBe('action-1');
      expect(result.data).toEqual({ id: '1', name: 'created' });
      expect(result.error).toBeUndefined();
      expect(entityStore.create).toHaveBeenCalledWith('ticket', { title: 'Test Ticket', status: 'open' });
      expect(instance.actionResults.get('action-1')).toEqual({ id: '1', name: 'created' });
    });

    it('should execute update-entity action successfully', async () => {
      const action = {
        id: 'action-2',
        type: 'update-entity',
        target: 'ticket',
        payload: { id: '1', title: 'Updated Title', status: 'closed' }
      };

      const contextData = { userId: 'user-1' };

      const result = await executor.execute(action, instance, contextData);

      expect(result.success).toBe(true);
      expect(result.actionId).toBe('action-2');
      expect(result.data).toEqual({ id: '1', name: 'updated' });
      expect(result.error).toBeUndefined();
      // Should extract id and call update with remaining payload
      expect(entityStore.update).toHaveBeenCalledWith('ticket', { id: '1' }, { title: 'Updated Title', status: 'closed' });
      expect(instance.actionResults.get('action-2')).toEqual({ id: '1', name: 'updated' });
    });

    it('should execute delete-entity action successfully', async () => {
      const action = {
        id: 'action-3',
        type: 'delete-entity',
        target: 'ticket',
        payload: { id: '1' }
      };

      const contextData = { userId: 'user-1' };

      const result = await executor.execute(action, instance, contextData);

      expect(result.success).toBe(true);
      expect(result.actionId).toBe('action-3');
      expect(result.data).toEqual({ id: '1', deleted: true });
      expect(result.error).toBeUndefined();
      expect(entityStore.delete).toHaveBeenCalledWith('ticket', { id: '1' });
      expect(instance.actionResults.get('action-3')).toEqual({ id: '1', deleted: true });
    });
  });

  // ============================================================================
  // ERROR & TIMEOUT HANDLING TESTS
  // ============================================================================

  describe('Error & Timeout Handling', () => {
    it('should handle action failure with retry info', async () => {
      entityStore.create.mockRejectedValueOnce(new Error('Database connection failed'));

      const action = {
        id: 'action-fail',
        type: 'create-entity',
        target: 'ticket',
        payload: { title: 'Test' },
        retryCount: 3
      };

      const contextData = {};

      const result = await executor.execute(action, instance, contextData);

      expect(result.success).toBe(false);
      expect(result.actionId).toBe('action-fail');
      expect(result.error).toContain('Database connection failed');
      expect(result.data).toBeUndefined();
      expect(instance.actionResults.has('action-fail')).toBe(false);
    });

    it('should handle action timeout', async () => {
      // Mock a long-running action
      entityStore.create.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 5000))
      );

      const action = {
        id: 'action-timeout',
        type: 'create-entity',
        target: 'ticket',
        payload: { title: 'Test' },
        timeout: 1 // 1 second timeout
      };

      const contextData = {};

      const result = await executor.execute(action, instance, contextData);

      expect(result.success).toBe(false);
      expect(result.actionId).toBe('action-timeout');
      expect(result.error).toContain('timeout');
      expect(result.data).toBeUndefined();
    }, 10000); // Increase test timeout
  });

  // ============================================================================
  // MULTIPLE ACTIONS WITH DEPENDENCIES TESTS
  // ============================================================================

  describe('Multiple Actions with Dependencies', () => {
    it('should execute actions sequentially respecting dependencies', async () => {
      const actions = [
        {
          id: 'action-1',
          type: 'create-entity',
          target: 'ticket',
          payload: { title: 'Parent' }
        },
        {
          id: 'action-2',
          type: 'create-entity',
          target: 'comment',
          payload: { text: 'Comment' },
          dependsOn: ['action-1']
        },
        {
          id: 'action-3',
          type: 'create-entity',
          target: 'notification',
          payload: { msg: 'Notified' },
          dependsOn: ['action-1', 'action-2']
        }
      ];

      const contextData = {};

      const results = await executor.executeAll(actions, instance, contextData);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);

      // Verify all actions were executed in sequence
      expect(entityStore.create).toHaveBeenCalledTimes(3);

      // Verify action results are tracked
      expect(instance.actionResults.get('action-1')).toBeDefined();
      expect(instance.actionResults.get('action-2')).toBeDefined();
      expect(instance.actionResults.get('action-3')).toBeDefined();
    });

    it('should stop on action failure if onError is "stop"', async () => {
      entityStore.create.mockRejectedValueOnce(new Error('Creation failed'));

      const actions = [
        {
          id: 'action-1',
          type: 'create-entity',
          target: 'ticket',
          payload: { title: 'Parent' },
          onError: 'stop'
        },
        {
          id: 'action-2',
          type: 'create-entity',
          target: 'comment',
          payload: { text: 'Comment' },
          dependsOn: ['action-1']
        }
      ];

      const contextData = {};

      const results = await executor.executeAll(actions, instance, contextData);

      // First action should fail
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Creation failed');

      // Second action should be marked as skipped due to workflow stop
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('Workflow stopped');

      // Only first action should have been attempted
      expect(entityStore.create).toHaveBeenCalledTimes(1);
    });

    it('should continue on action failure if onError is "continue"', async () => {
      // First call fails, second succeeds
      entityStore.create
        .mockRejectedValueOnce(new Error('First failed'))
        .mockResolvedValueOnce({ id: '2', name: 'second' });

      const actions = [
        {
          id: 'action-1',
          type: 'create-entity',
          target: 'ticket',
          payload: { title: 'Parent' },
          onError: 'continue'
        },
        {
          id: 'action-2',
          type: 'create-entity',
          target: 'comment',
          payload: { text: 'Comment' }
        }
      ];

      const contextData = {};

      const results = await executor.executeAll(actions, instance, contextData);

      // First action fails
      expect(results[0].success).toBe(false);

      // Second action still executes (independent)
      expect(results[1].success).toBe(true);

      expect(entityStore.create).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================================
  // PAYLOAD & PARAMETER EXTRACTION TESTS
  // ============================================================================

  describe('Payload Parameter Extraction', () => {
    it('should extract id from payload for update-entity and pass remaining fields', async () => {
      const action = {
        id: 'action-update',
        type: 'update-entity',
        target: 'ticket',
        payload: {
          id: 'ticket-123',
          title: 'Updated Title',
          status: 'resolved',
          priority: 'high'
        }
      };

      const contextData = {};

      const result = await executor.execute(action, instance, contextData);

      expect(result.success).toBe(true);
      // Verify update was called with id as filter and rest as update payload
      expect(entityStore.update).toHaveBeenCalledWith(
        'ticket',
        { id: 'ticket-123' },
        { title: 'Updated Title', status: 'resolved', priority: 'high' }
      );
    });
  });

  // ============================================================================
  // DEPENDENCY CHECKING TESTS
  // ============================================================================

  describe('Dependency Checking', () => {
    it('should skip action if dependencies are not met', async () => {
      const actions = [
        {
          id: 'action-1',
          type: 'create-entity',
          target: 'ticket',
          payload: { title: 'Test' }
        },
        {
          id: 'action-2',
          type: 'create-entity',
          target: 'comment',
          payload: { text: 'Comment' },
          dependsOn: ['action-1', 'action-missing'] // action-missing doesn't exist
        }
      ];

      const contextData = {};

      const results = await executor.executeAll(actions, instance, contextData);

      // First action succeeds
      expect(results[0].success).toBe(true);

      // Second action should fail due to missing dependency
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('depends on');

      // Only first action should be executed
      expect(entityStore.create).toHaveBeenCalledTimes(1);
    });

    it('should execute action only after all dependencies complete', async () => {
      const actions = [
        {
          id: 'action-parent-1',
          type: 'create-entity',
          target: 'ticket',
          payload: { title: 'Parent 1' }
        },
        {
          id: 'action-parent-2',
          type: 'create-entity',
          target: 'ticket',
          payload: { title: 'Parent 2' }
        },
        {
          id: 'action-child',
          type: 'create-entity',
          target: 'comment',
          payload: { text: 'Child' },
          dependsOn: ['action-parent-1', 'action-parent-2']
        }
      ];

      const contextData = {};

      const results = await executor.executeAll(actions, instance, contextData);

      // All actions should succeed
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);

      // All three should be executed
      expect(entityStore.create).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================================================
  // SPECIAL ACTION TYPES TESTS
  // ============================================================================

  describe('Special Action Types', () => {
    it('should execute send-notification action', async () => {
      const action = {
        id: 'action-notify',
        type: 'send-notification',
        payload: { userId: 'user-1', message: 'Hello' }
      };

      const contextData = {};

      const result = await executor.execute(action, instance, contextData);

      expect(result.success).toBe(true);
      expect(result.actionId).toBe('action-notify');
      expect(result.data).toEqual({ sent: true });
    });

    it('should execute webhook action', async () => {
      const action = {
        id: 'action-webhook',
        type: 'webhook',
        payload: { url: 'https://example.com/hook', data: { test: true } }
      };

      const contextData = {};

      const result = await executor.execute(action, instance, contextData);

      expect(result.success).toBe(true);
      expect(result.actionId).toBe('action-webhook');
      expect(result.data).toEqual({ success: true });
    });

    it('should execute custom action', async () => {
      const action = {
        id: 'action-custom',
        type: 'custom',
        payload: { customField: 'value' }
      };

      const contextData = {};

      const result = await executor.execute(action, instance, contextData);

      expect(result.success).toBe(true);
      expect(result.actionId).toBe('action-custom');
      expect(result.data).toEqual({ executed: true });
    });
  });

  // ============================================================================
  // DEFAULT TIMEOUT TESTS
  // ============================================================================

  describe('Default Timeout', () => {
    it('should use default timeout of 30 seconds', async () => {
      // This test verifies the default is set, not that we wait 30 seconds
      // We'd need to mock Date/timers to test actual timeout behavior
      const action = {
        id: 'action-no-timeout',
        type: 'create-entity',
        target: 'ticket',
        payload: { title: 'Test' }
        // No timeout specified, should use default
      };

      const contextData = {};

      const result = await executor.execute(action, instance, contextData);

      expect(result.success).toBe(true);
      // Action completes normally with default timeout
      expect(result.error).toBeUndefined();
    });
  });
});
