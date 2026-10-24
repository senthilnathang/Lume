/**
 * @fileoverview Unit tests for AgentExecutor
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import AgentExecutor from '../../src/domains/agent/agent-executor.js';

describe('AgentExecutor', () => {
  let executor;

  beforeEach(() => {
    executor = new AgentExecutor({
      runtime: null,
      workflowExecutor: null,
      queueManager: null,
    });
  });

  describe('Escalate Action', () => {
    it('should execute escalate action with updates', async () => {
      const mockRuntime = {
        execute: async (request) => ({
          success: true,
          result: { id: 1, status: 'escalated', priority: 'urgent' },
        }),
      };

      executor.runtime = mockRuntime;

      const agent = {
        id: 'escalate_agent',
        slug: 'ticket',
        triggerEvent: 'onUpdate',
        action: {
          type: 'escalate',
          config: {
            updates: {
              status: 'escalated',
              priority: 'urgent',
            },
          },
        },
      };

      const result = await executor.executeSync(agent, {
        record: { id: 1, status: 'open' },
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
      });

      expect(result.success).toBe(true);
      expect(result.data.action).toBe('escalate');
      expect(result.data.updates.priority).toBe('urgent');
    });

    it('should handle escalate without runtime', async () => {
      const agent = {
        id: 'escalate_agent',
        slug: 'ticket',
        triggerEvent: 'onUpdate',
        action: {
          type: 'escalate',
          config: {
            updates: { status: 'escalated' },
          },
        },
      };

      const result = await executor.executeSync(agent, {
        record: { id: 1 },
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Runtime not configured');
    });
  });

  describe('Workflow Action', () => {
    it('should execute workflow action', async () => {
      const mockWorkflowExecutor = {
        executeAsync: async () => ({
          queued: true,
          jobId: 'job_123',
        }),
      };

      executor.workflowExecutor = mockWorkflowExecutor;

      const agent = {
        id: 'workflow_agent',
        slug: 'ticket',
        triggerEvent: 'onCreate',
        action: {
          type: 'workflow',
          config: {
            workflowId: 'notify_customer',
            workflow: {
              id: 'notify_customer',
              steps: [],
            },
          },
        },
      };

      const result = await executor.executeSync(agent, {
        record: { id: 1, title: 'New ticket' },
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
      });

      expect(result.success).toBe(true);
      expect(result.data.action).toBe('workflow');
      expect(result.data.result.queued).toBe(true);
    });

    it('should reject workflow action without workflowId', async () => {
      const agent = {
        id: 'workflow_agent',
        slug: 'ticket',
        triggerEvent: 'onCreate',
        action: {
          type: 'workflow',
          config: {}, // Missing workflowId
        },
      };

      const result = await executor.executeSync(agent, {
        record: { id: 1 },
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('workflowId is required');
    });

    it('should handle missing workflow executor', async () => {
      const agent = {
        id: 'workflow_agent',
        slug: 'ticket',
        triggerEvent: 'onCreate',
        action: {
          type: 'workflow',
          config: { workflowId: 'test' },
        },
      };

      const result = await executor.executeSync(agent, {
        record: { id: 1 },
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('WorkflowExecutor not configured');
    });
  });

  describe('Mutate Action', () => {
    it('should execute mutate action', async () => {
      const mockRuntime = {
        execute: async (request) => ({
          success: true,
          result: { id: 1, ...request.data },
        }),
      };

      executor.runtime = mockRuntime;

      const agent = {
        id: 'mutate_agent',
        slug: 'ticket',
        triggerEvent: 'onUpdate',
        action: {
          type: 'mutate',
          config: {
            updates: {
              lastChecked: 'now',
              checkCount: 5,
            },
          },
        },
      };

      const result = await executor.executeSync(agent, {
        record: { id: 1, checkCount: 4 },
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
      });

      expect(result.success).toBe(true);
      expect(result.data.action).toBe('mutate');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown action type', async () => {
      const agent = {
        id: 'unknown_agent',
        slug: 'ticket',
        triggerEvent: 'onUpdate',
        action: {
          type: 'unknown_action',
          config: {},
        },
      };

      const result = await executor.executeSync(agent, {
        record: { id: 1 },
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action type');
    });

    it('should handle missing agent definition', async () => {
      const result = await executor.executeSync(null, {
        record: { id: 1 },
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Agent or action not defined');
    });

    it('should handle missing action property', async () => {
      const agent = {
        id: 'bad_agent',
        slug: 'ticket',
        triggerEvent: 'onUpdate',
        // Missing action property
      };

      const result = await executor.executeSync(agent, {
        record: { id: 1 },
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Async Execution', () => {
    it('should queue agent for async execution', async () => {
      const mockQueueManager = {
        enqueueJob: async (queue, data) => ({
          id: 'job_456',
          queue,
          data,
        }),
      };

      executor.queueManager = mockQueueManager;

      const agent = {
        id: 'async_agent',
        slug: 'ticket',
        triggerEvent: 'onUpdate',
        action: {
          type: 'escalate',
          config: { updates: { priority: 'high' } },
        },
      };

      const result = await executor.executeAsync('async_agent', agent, {
        record: { id: 1 },
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
      });

      expect(result.queued).toBe(true);
      expect(result.jobId).toBe('job_456');
    });

    it('should fallback to sync if queue manager unavailable', async () => {
      executor.runtime = {
        execute: async () => ({ success: true, result: {} }),
      };

      const agent = {
        id: 'async_agent',
        slug: 'ticket',
        triggerEvent: 'onUpdate',
        action: {
          type: 'escalate',
          config: { updates: {} },
        },
      };

      const result = await executor.executeAsync('async_agent', agent, {
        record: { id: 1 },
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
      });

      expect(result.success).toBe(true);
    });
  });
});
