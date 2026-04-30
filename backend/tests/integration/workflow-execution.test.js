/**
 * @fileoverview Integration tests for workflow execution end-to-end
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

describe('Workflow Execution Integration', () => {
  let executor;
  let store;

  beforeEach(() => {
    store = new WorkflowStore(null);
    executor = new WorkflowExecutor({
      stepRunners: new Map(),
      queueManager: null,
      runtime: null,
    });

    executor.registerRunner('send_email', EmailStep);
    executor.registerRunner('send_notification', NotifyStep);
    executor.registerRunner('mutate', MutateStep);
    executor.registerRunner('if', ConditionStep);
    executor.registerRunner('wait', WaitStep);
    executor.registerRunner('log', LogStep);
  });

  describe('Ticket Workflow Scenarios', () => {
    it('should execute complete ticket creation workflow', async () => {
      const workflow = {
        id: 'ticket_notify_on_create',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [
          {
            id: 'log_creation',
            type: 'log',
            config: {
              level: 'info',
              message: 'New ticket created',
            },
          },
          {
            id: 'send_confirmation',
            type: 'send_email',
            config: {
              to: 'customer@example.com',
              subject: 'Your support ticket has been created',
              template: 'ticket_confirmation',
            },
          },
          {
            id: 'notify_support',
            type: 'send_notification',
            config: {
              type: 'in_app',
              title: 'New Support Ticket',
              message: 'A customer has created a new support request',
              recipient: 'user.userId',
            },
          },
        ],
      };

      await store.register(workflow);

      const result = await executor.executeSync(workflow, {
        record: { id: 1, title: 'Login issue', status: 'open' },
        action: 'create',
        entity: { slug: 'ticket' },
      }, {
        userId: 5,
        orgId: 1,
        roles: ['support_agent'],
      });

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(3);
      expect(result.steps[0].type).toBe('log');
      expect(result.steps[1].type).toBe('send_email');
      expect(result.steps[2].type).toBe('send_notification');
    });

    it('should execute conditional escalation workflow', async () => {
      const workflow = {
        id: 'ticket_escalation',
        slug: 'ticket',
        trigger: 'onUpdate',
        steps: [
          {
            id: 'check_priority',
            type: 'if',
            config: {
              expression: 'data.priority == "urgent"',
              ifTrue: 'escalate_step',
              ifFalse: 'log_step',
            },
          },
          {
            id: 'escalate_step',
            type: 'mutate',
            config: {
              entity: 'ticket',
              recordId: 'data.id',
              updates: { assignedTo: 'manager_id', status: 'escalated' },
            },
          },
          {
            id: 'log_step',
            type: 'log',
            config: {
              message: 'Ticket priority is not urgent',
            },
          },
        ],
      };

      const record = {
        id: 1,
        title: 'Critical issue',
        priority: 'urgent',
        status: 'open',
      };

      const result = await executor.executeSync(workflow, {
        record,
        action: 'update',
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
        roles: ['admin'],
      });

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(3);
      // Condition step should indicate true
      expect(result.steps[0].data.conditionResult).toBe(true);
    });

    it('should execute workflow with sequential operations', async () => {
      const workflow = {
        id: 'ticket_workflow_sequence',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [
          {
            id: 'log_start',
            type: 'log',
            config: { message: 'Starting workflow' },
          },
          {
            id: 'wait_a_bit',
            type: 'wait',
            config: { seconds: 1 }, // 1 second wait
          },
          {
            id: 'notify_finish',
            type: 'send_notification',
            config: {
              type: 'in_app',
              title: 'Workflow Complete',
              message: 'Setup complete',
              recipient: 'user.userId',
            },
          },
        ],
      };

      const startTime = Date.now();

      const result = await executor.executeSync(workflow, {
        record: { id: 1, title: 'Test' },
        action: 'create',
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
        roles: ['admin'],
      });

      const elapsed = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(3);
      expect(elapsed).toBeGreaterThanOrEqual(1000); // Should wait at least 1 second
    });
  });

  describe('Workflow Store Integration', () => {
    it('should retrieve and execute registered workflow', async () => {
      const workflow = {
        id: 'stored_workflow',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [
          {
            id: 'log_execution',
            type: 'log',
            config: { message: 'Executing stored workflow' },
          },
        ],
      };

      await store.register(workflow);

      const retrieved = await store.get('stored_workflow');
      expect(retrieved).toBeDefined();

      const result = await executor.executeSync(retrieved, {
        record: { id: 1 },
        action: 'create',
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
      });

      expect(result.success).toBe(true);
    });

    it('should execute all workflows for a trigger', async () => {
      const wf1 = {
        id: 'on_create_1',
        slug: 'ticket',
        trigger: 'onCreate',
        enabled: true,
        steps: [{ id: 's1', type: 'log', config: { message: 'WF1' } }],
      };

      const wf2 = {
        id: 'on_create_2',
        slug: 'ticket',
        trigger: 'onCreate',
        enabled: true,
        steps: [{ id: 's1', type: 'log', config: { message: 'WF2' } }],
      };

      await store.register(wf1);
      await store.register(wf2);

      const workflows = await store.getByTrigger('ticket', 'onCreate');

      expect(workflows).toHaveLength(2);

      // Execute both
      const results = await Promise.all(
        workflows.map(wf =>
          executor.executeSync(wf, {
            record: { id: 1 },
            action: 'create',
            entity: { slug: 'ticket' },
          }, {
            userId: 1,
            orgId: 1,
          })
        )
      );

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Complex Multi-Step Scenarios', () => {
    it('should handle email with variable interpolation', async () => {
      const workflow = {
        id: 'email_with_vars',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [
          {
            id: 'send_email',
            type: 'send_email',
            config: {
              to: 'admin@example.com',
              subject: 'New ticket from user',
              template: 'ticket_created',
              variables: {
                ticketId: 'data.id',
                title: 'data.title',
                userId: 'user.userId',
              },
            },
          },
        ],
      };

      const result = await executor.executeSync(workflow, {
        record: { id: 123, title: 'Database error' },
        action: 'create',
        entity: { slug: 'ticket' },
      }, {
        userId: 42,
        orgId: 1,
      });

      expect(result.success).toBe(true);
      expect(result.steps[0].data).toBeDefined();
    });

    it('should handle mutate with nested updates', async () => {
      const workflow = {
        id: 'mutate_workflow',
        slug: 'ticket',
        trigger: 'onUpdate',
        steps: [
          {
            id: 'mutate_record',
            type: 'mutate',
            config: {
              entity: 'ticket',
              recordId: 'data.id',
              updates: {
                status: 'in_progress',
                assignedTo: 'user.userId',
                lastUpdated: 'now',
              },
            },
          },
        ],
      };

      const result = await executor.executeSync(workflow, {
        record: { id: 1, status: 'open' },
        action: 'update',
        entity: { slug: 'ticket' },
      }, {
        userId: 5,
        orgId: 1,
      });

      expect(result.success).toBe(true);
      expect(result.steps[0].data.updates.assignedTo).toBeDefined();
    });

    it('should handle multi-condition branching', async () => {
      const workflow = {
        id: 'multi_condition',
        slug: 'ticket',
        trigger: 'onUpdate',
        steps: [
          {
            id: 'check_critical',
            type: 'if',
            config: {
              expression: 'data.priority == "urgent" AND data.status == "open"',
              ifTrue: 'critical_handler',
              ifFalse: 'normal_handler',
            },
          },
          {
            id: 'critical_handler',
            type: 'log',
            config: { message: 'Critical ticket detected' },
          },
          {
            id: 'normal_handler',
            type: 'log',
            config: { message: 'Normal priority ticket' },
          },
        ],
      };

      const result = await executor.executeSync(workflow, {
        record: {
          id: 1,
          priority: 'urgent',
          status: 'open',
        },
        action: 'update',
        entity: { slug: 'ticket' },
      }, {
        userId: 1,
        orgId: 1,
      });

      expect(result.success).toBe(true);
      expect(result.steps[0].data.conditionResult).toBe(true);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing required fields gracefully', async () => {
      const workflow = {
        id: 'missing_fields',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [
          {
            id: 'bad_email',
            type: 'send_email',
            config: {
              // Missing 'to' and 'subject'
              template: 'test',
            },
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

      // Email step should still try to execute with undefined values
      expect(result.steps).toHaveLength(1);
    });

    it('should handle malformed workflow structure', async () => {
      const result = await executor.executeSync(
        { id: 'malformed', slug: 'test', trigger: 'onCreate' }, // Missing steps
        { record: { id: 1 }, action: 'create', entity: { slug: 'test' } },
        { userId: 1, orgId: 1 }
      );

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(0);
    });

    it('should report step errors without crashing', async () => {
      const workflow = {
        id: 'error_handling',
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
            type: 'unknown_step_type',
            config: {},
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
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Workflow Metadata', () => {
    it('should preserve workflow execution metadata', async () => {
      const workflow = {
        id: 'metadata_test',
        slug: 'ticket',
        trigger: 'onCreate',
        description: 'Test workflow for metadata',
        steps: [
          {
            id: 'step1',
            type: 'log',
            config: { message: 'Test' },
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

      expect(result.success).toBe(true);
      expect(result.workflowData).toBeDefined();
      expect(typeof result.workflowData).toBe('object');
    });

    it('should track all executed steps', async () => {
      const workflow = {
        id: 'step_tracking',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [
          { id: 'step1', type: 'log', config: { message: '1' } },
          { id: 'step2', type: 'log', config: { message: '2' } },
          { id: 'step3', type: 'log', config: { message: '3' } },
          { id: 'step4', type: 'log', config: { message: '4' } },
          { id: 'step5', type: 'log', config: { message: '5' } },
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

      expect(result.steps).toHaveLength(5);
      expect(result.steps.every(s => s.type === 'log')).toBe(true);
      expect(result.steps.every(s => s.success === true)).toBe(true);
    });
  });
});
