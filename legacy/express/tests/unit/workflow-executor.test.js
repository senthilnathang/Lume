/**
 * @fileoverview Unit tests for WorkflowExecutor
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import WorkflowExecutor from '../../src/domains/workflow/workflow-executor.js';
import WorkflowStore from '../../src/domains/workflow/workflow-store.js';
import EmailStep from '../../src/domains/workflow/step-runners/email-step.js';
import NotifyStep from '../../src/domains/workflow/step-runners/notify-step.js';
import MutateStep from '../../src/domains/workflow/step-runners/mutate-step.js';
import ConditionStep from '../../src/domains/workflow/step-runners/condition-step.js';
import WaitStep from '../../src/domains/workflow/step-runners/wait-step.js';
import LogStep from '../../src/domains/workflow/step-runners/log-step.js';

describe('WorkflowExecutor', () => {
  let executor;
  let store;

  beforeEach(() => {
    store = new WorkflowStore(null);
    executor = new WorkflowExecutor({
      stepRunners: new Map(),
      queueManager: null,
      runtime: null,
    });

    // Register step runners
    executor.registerRunner('send_email', EmailStep);
    executor.registerRunner('send_notification', NotifyStep);
    executor.registerRunner('mutate', MutateStep);
    executor.registerRunner('if', ConditionStep);
    executor.registerRunner('wait', WaitStep);
    executor.registerRunner('log', LogStep);
  });

  describe('Sync Execution', () => {
    it('should execute simple workflow with single step', async () => {
      const workflow = {
        id: 'test_1',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [
          {
            id: 'step1',
            type: 'log',
            config: {
              level: 'info',
              message: 'Ticket created',
            },
          },
        ],
      };

      const result = await executor.executeSync(workflow, {
        record: { id: 1, title: 'Test' },
        action: 'create',
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
        roles: ['admin'],
      });

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].success).toBe(true);
    });

    it('should execute multi-step workflow sequentially', async () => {
      const workflow = {
        id: 'test_2',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [
          {
            id: 'log1',
            type: 'log',
            config: { message: 'Step 1' },
          },
          {
            id: 'log2',
            type: 'log',
            config: { message: 'Step 2' },
          },
          {
            id: 'log3',
            type: 'log',
            config: { message: 'Step 3' },
          },
        ],
      };

      const result = await executor.executeSync(workflow, {
        record: { id: 1 },
        action: 'create',
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
        roles: ['admin'],
      });

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(3);
      result.steps.forEach(step => {
        expect(step.success).toBe(true);
      });
    });

    it('should stop on first failure if continueOnError is false', async () => {
      const workflow = {
        id: 'test_3',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [
          {
            id: 'step1',
            type: 'log',
            config: { message: 'Step 1' },
          },
          {
            id: 'step2',
            type: 'unknown_type', // This will fail
            config: {},
            continueOnError: false,
          },
          {
            id: 'step3',
            type: 'log',
            config: { message: 'Step 3' },
          },
        ],
      };

      const result = await executor.executeSync(workflow, {
        record: { id: 1 },
        action: 'create',
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
      });

      expect(result.success).toBe(false);
      expect(result.steps).toHaveLength(2); // Should stop after step 2
      expect(result.steps[1].success).toBe(false);
    });

    it('should continue on error if continueOnError is true', async () => {
      const workflow = {
        id: 'test_4',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [
          {
            id: 'step1',
            type: 'log',
            config: { message: 'Step 1' },
          },
          {
            id: 'step2',
            type: 'unknown_type',
            config: {},
            continueOnError: true,
          },
          {
            id: 'step3',
            type: 'log',
            config: { message: 'Step 3' },
          },
        ],
      };

      const result = await executor.executeSync(workflow, {
        record: { id: 1 },
        action: 'create',
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
      });

      expect(result.steps).toHaveLength(3); // All steps executed
    });

    it('should handle empty workflow', async () => {
      const workflow = {
        id: 'test_5',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [],
      };

      const result = await executor.executeSync(workflow, {
        record: { id: 1 },
        action: 'create',
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
      });

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(0);
    });

    it('should handle null workflow', async () => {
      const result = await executor.executeSync(null, {
        record: { id: 1 },
        action: 'create',
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
      });

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(0);
    });
  });

  describe('Step Type Registration', () => {
    it('should register and execute custom step', async () => {
      class CustomStep {
        constructor(config) {
          this.config = config;
        }

        async execute(context) {
          return {
            success: true,
            data: { custom: true, message: this.config.message },
          };
        }
      }

      executor.registerRunner('custom', CustomStep);

      const workflow = {
        id: 'test_6',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [
          {
            id: 'custom_step',
            type: 'custom',
            config: { message: 'Hello custom' },
          },
        ],
      };

      const result = await executor.executeSync(workflow, {
        record: { id: 1 },
        action: 'create',
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
      });

      expect(result.steps[0].data.custom).toBe(true);
      expect(result.steps[0].data.message).toBe('Hello custom');
    });

    it('should reject unknown step type', async () => {
      const workflow = {
        id: 'test_7',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [
          {
            id: 'unknown',
            type: 'nonexistent',
            config: {},
          },
        ],
      };

      const result = await executor.executeSync(workflow, {
        record: { id: 1 },
        action: 'create',
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
      });

      expect(result.success).toBe(false);
      expect(result.steps[0].success).toBe(false);
      expect(result.steps[0].error).toContain('Unknown step type');
    });
  });

  describe('Variable Resolution', () => {
    it('should resolve user context variables', async () => {
      executor.registerRunner('test_resolver', class {
        constructor(config) {
          this.config = config;
        }

        async execute(context) {
          return {
            success: true,
            data: {
              resolved: this.resolveVariable(this.config.value, context),
            },
          };
        }

        resolveVariable(value, context) {
          if (typeof value === 'string' && value.startsWith('user.')) {
            const field = value.substring(5);
            return context.executionContext?.[field] || null;
          }
          return value;
        }
      });

      const workflow = {
        id: 'test_8',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [
          {
            id: 'resolver',
            type: 'test_resolver',
            config: { value: 'user.userId' },
          },
        ],
      };

      const result = await executor.executeSync(workflow, {
        record: { id: 1 },
        action: 'create',
        entity: { slug: 'ticket' },
      }, {
        userId: 42,
        orgId: 1,
      });

      expect(result.steps[0].data.resolved).toBe(42);
    });
  });

  describe('Error Handling', () => {
    it('should catch and report step execution errors', async () => {
      class FailingStep {
        async execute() {
          throw new Error('Step failed');
        }
      }

      executor.registerRunner('failing', FailingStep);

      const workflow = {
        id: 'test_9',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [
          {
            id: 'fail',
            type: 'failing',
            config: {},
          },
        ],
      };

      const result = await executor.executeSync(workflow, {
        record: { id: 1 },
        action: 'create',
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Step failed');
    });
  });
});
