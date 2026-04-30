/**
 * @fileoverview Unit tests for WorkflowEngine
 * Tests workflow orchestration, instance management, and lifecycle
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WorkflowEngine } from '../../src/core/workflows/workflow-engine.js';

describe('WorkflowEngine', () => {
  let engine;
  let entityStore;

  beforeEach(() => {
    // Mock entityStore for ActionExecutor
    entityStore = {
      create: jest.fn().mockResolvedValue({ id: '1', name: 'created' }),
      update: jest.fn().mockResolvedValue({ id: '1', name: 'updated' }),
      delete: jest.fn().mockResolvedValue({ id: '1', deleted: true })
    };

    // Initialize engine
    engine = new WorkflowEngine(entityStore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // WORKFLOW REGISTRATION TESTS
  // ============================================================================

  describe('registerWorkflow', () => {
    it('should register and retrieve a workflow', () => {
      const workflow = {
        id: 'workflow-1',
        name: 'Test Workflow',
        description: 'A test workflow',
        enabled: true,
        version: 1,
        triggers: [
          {
            type: 'manual',
            label: 'Trigger Test'
          }
        ],
        actions: [
          {
            id: 'action-1',
            type: 'create-entity',
            target: 'ticket',
            payload: { title: 'Test' }
          }
        ]
      };

      engine.registerWorkflow(workflow);

      const retrieved = engine.getWorkflow('workflow-1');
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe('workflow-1');
      expect(retrieved.name).toBe('Test Workflow');
      expect(retrieved.enabled).toBe(true);
    });
  });

  // ============================================================================
  // WORKFLOW EXECUTION TESTS
  // ============================================================================

  describe('executeWorkflow', () => {
    it('should execute a registered workflow successfully', async () => {
      const workflow = {
        id: 'workflow-1',
        name: 'Execute Test',
        enabled: true,
        version: 1,
        triggers: [{ type: 'manual' }],
        actions: [
          {
            id: 'action-1',
            type: 'create-entity',
            target: 'ticket',
            payload: { title: 'Test' }
          }
        ]
      };

      engine.registerWorkflow(workflow);

      const instance = await engine.executeWorkflow('workflow-1', { userId: 'user-1' });

      expect(instance).toBeDefined();
      expect(instance.id).toMatch(/^inst-/);
      expect(instance.workflowId).toBe('workflow-1');
      expect(instance.status).toBe('success');
      expect(instance.triggeredBy).toBe('manual');
      expect(instance.startedAt).toBeInstanceOf(Date);
      expect(instance.completedAt).toBeInstanceOf(Date);
      expect(instance.error).toBeUndefined();
    });

    it('should not execute a disabled workflow', async () => {
      const workflow = {
        id: 'workflow-2',
        name: 'Disabled Workflow',
        enabled: false,
        version: 1,
        triggers: [{ type: 'manual' }],
        actions: []
      };

      engine.registerWorkflow(workflow);

      await expect(engine.executeWorkflow('workflow-2')).rejects.toThrow('Workflow is disabled');
    });

    it('should throw error for non-existent workflow', async () => {
      await expect(engine.executeWorkflow('non-existent')).rejects.toThrow('Workflow not found');
    });
  });

  // ============================================================================
  // ENABLE/DISABLE WORKFLOW TESTS
  // ============================================================================

  describe('enableWorkflow', () => {
    it('should enable a workflow', () => {
      const workflow = {
        id: 'workflow-3',
        name: 'Enable Test',
        enabled: false,
        version: 1,
        triggers: [{ type: 'manual' }],
        actions: []
      };

      engine.registerWorkflow(workflow);
      engine.enableWorkflow('workflow-3');

      const retrieved = engine.getWorkflow('workflow-3');
      expect(retrieved.enabled).toBe(true);
    });
  });

  describe('disableWorkflow', () => {
    it('should disable a workflow', () => {
      const workflow = {
        id: 'workflow-4',
        name: 'Disable Test',
        enabled: true,
        version: 1,
        triggers: [{ type: 'manual' }],
        actions: []
      };

      engine.registerWorkflow(workflow);
      engine.disableWorkflow('workflow-4');

      const retrieved = engine.getWorkflow('workflow-4');
      expect(retrieved.enabled).toBe(false);
    });
  });

  // ============================================================================
  // LIST WORKFLOWS TESTS
  // ============================================================================

  describe('listWorkflows', () => {
    beforeEach(() => {
      // Register multiple workflows
      engine.registerWorkflow({
        id: 'workflow-5',
        name: 'Enabled 1',
        enabled: true,
        version: 1,
        triggers: [{ type: 'manual' }],
        actions: []
      });

      engine.registerWorkflow({
        id: 'workflow-6',
        name: 'Disabled 1',
        enabled: false,
        version: 1,
        triggers: [{ type: 'manual' }],
        actions: []
      });

      engine.registerWorkflow({
        id: 'workflow-7',
        name: 'Enabled 2',
        enabled: true,
        version: 1,
        triggers: [{ type: 'manual' }],
        actions: []
      });
    });

    it('should list all workflows', () => {
      const workflows = engine.listWorkflows();

      expect(workflows).toHaveLength(3);
      expect(workflows.map(w => w.id)).toContain('workflow-5');
      expect(workflows.map(w => w.id)).toContain('workflow-6');
      expect(workflows.map(w => w.id)).toContain('workflow-7');
    });

    it('should filter workflows by enabled status', () => {
      const enabledWorkflows = engine.listWorkflows(true);
      const disabledWorkflows = engine.listWorkflows(false);

      expect(enabledWorkflows).toHaveLength(2);
      expect(enabledWorkflows.every(w => w.enabled)).toBe(true);

      expect(disabledWorkflows).toHaveLength(1);
      expect(disabledWorkflows.every(w => !w.enabled)).toBe(true);
    });
  });

  // ============================================================================
  // INSTANCE RETRIEVAL TESTS
  // ============================================================================

  describe('getInstance', () => {
    it('should retrieve a workflow instance after execution', async () => {
      const workflow = {
        id: 'workflow-8',
        name: 'Instance Test',
        enabled: true,
        version: 1,
        triggers: [{ type: 'manual' }],
        actions: [
          {
            id: 'action-1',
            type: 'create-entity',
            target: 'ticket',
            payload: { title: 'Test' }
          }
        ]
      };

      engine.registerWorkflow(workflow);
      const executedInstance = await engine.executeWorkflow('workflow-8');

      const retrieved = engine.getInstance(executedInstance.id);
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(executedInstance.id);
      expect(retrieved.status).toBe('success');
      expect(retrieved.workflowId).toBe('workflow-8');
    });

    it('should return undefined for non-existent instance', () => {
      const instance = engine.getInstance('non-existent-instance');
      expect(instance).toBeUndefined();
    });
  });

  // ============================================================================
  // TRIGGER EVALUATION TESTS
  // ============================================================================

  describe('evaluateTrigger', () => {
    it('should evaluate a manual trigger', () => {
      const trigger = {
        type: 'manual',
        label: 'Trigger Now'
      };

      const result = engine.evaluateTrigger(trigger, {});

      expect(result.triggered).toBe(true);
      expect(result.reason).toContain('Manual trigger');
    });

    it('should evaluate an event trigger with matching event', () => {
      const trigger = {
        type: 'event',
        event: 'ticket:created',
        conditions: []
      };

      const data = { event: 'ticket:created', ticketId: '123' };

      const result = engine.evaluateTrigger(trigger, data);

      expect(result.triggered).toBe(true);
      expect(result.reason).toContain('matched');
    });

    it('should evaluate an event trigger without matching event', () => {
      const trigger = {
        type: 'event',
        event: 'ticket:created',
        conditions: []
      };

      const data = { event: 'ticket:updated', ticketId: '123' };

      const result = engine.evaluateTrigger(trigger, data);

      expect(result.triggered).toBe(false);
    });
  });

  // ============================================================================
  // JOB QUEUE ACCESS TESTS
  // ============================================================================

  describe('getJobQueue', () => {
    it('should return the job queue instance', () => {
      const queue = engine.getJobQueue();

      expect(queue).toBeDefined();
      expect(queue).toHaveProperty('enqueue');
      expect(queue).toHaveProperty('dequeue');
      expect(queue).toHaveProperty('getStats');
    });
  });

  // ============================================================================
  // COMPLEX EXECUTION SCENARIOS
  // ============================================================================

  describe('Complex Execution Scenarios', () => {
    it('should execute workflow with multiple actions in sequence', async () => {
      const workflow = {
        id: 'workflow-multi',
        name: 'Multi-action Workflow',
        enabled: true,
        version: 1,
        triggers: [{ type: 'manual' }],
        actions: [
          {
            id: 'action-1',
            type: 'create-entity',
            target: 'ticket',
            payload: { title: 'Test 1' }
          },
          {
            id: 'action-2',
            type: 'create-entity',
            target: 'comment',
            payload: { content: 'Test comment' }
          }
        ]
      };

      engine.registerWorkflow(workflow);
      const instance = await engine.executeWorkflow('workflow-multi');

      expect(instance.status).toBe('success');
      expect(instance.actionResults.size).toBe(2);
      expect(entityStore.create).toHaveBeenCalledTimes(2);
    });

    it('should handle workflow execution with trigger data', async () => {
      const workflow = {
        id: 'workflow-data',
        name: 'Workflow with Data',
        enabled: true,
        version: 1,
        triggers: [{ type: 'event', event: 'ticket:created' }],
        actions: [
          {
            id: 'action-1',
            type: 'create-entity',
            target: 'ticket',
            payload: { title: 'Test' }
          }
        ]
      };

      engine.registerWorkflow(workflow);
      const triggerData = { event: 'ticket:created', ticketId: '123' };
      const instance = await engine.executeWorkflow('workflow-data', triggerData);

      expect(instance.status).toBe('success');
      expect(instance.triggeredBy).toBe('event');
    });

    it('should capture error from failed action', async () => {
      // Mock action executor to return failure
      entityStore.create.mockRejectedValueOnce(new Error('Database error'));

      const workflow = {
        id: 'workflow-error',
        name: 'Error Workflow',
        enabled: true,
        version: 1,
        triggers: [{ type: 'manual' }],
        actions: [
          {
            id: 'action-fail',
            type: 'create-entity',
            target: 'ticket',
            payload: { title: 'Test' }
          }
        ]
      };

      engine.registerWorkflow(workflow);
      const instance = await engine.executeWorkflow('workflow-error');

      expect(instance.status).toBe('failed');
      expect(instance.error).toBeDefined();
      expect(instance.error).toContain('Database error');
    });
  });

  // ============================================================================
  // INSTANCE COUNTER TESTS
  // ============================================================================

  describe('Instance ID Generation', () => {
    it('should generate unique instance IDs with incrementing counter', async () => {
      const workflow = {
        id: 'workflow-counter',
        name: 'Counter Test',
        enabled: true,
        version: 1,
        triggers: [{ type: 'manual' }],
        actions: []
      };

      engine.registerWorkflow(workflow);

      const instance1 = await engine.executeWorkflow('workflow-counter');
      const instance2 = await engine.executeWorkflow('workflow-counter');

      expect(instance1.id).not.toBe(instance2.id);
      expect(instance1.id).toMatch(/^inst-\d+$/);
      expect(instance2.id).toMatch(/^inst-\d+$/);

      // Parse instance numbers
      const num1 = parseInt(instance1.id.split('-')[1]);
      const num2 = parseInt(instance2.id.split('-')[1]);
      expect(num2).toBeGreaterThan(num1);
    });
  });
});
