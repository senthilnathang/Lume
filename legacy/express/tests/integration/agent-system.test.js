/**
 * @fileoverview Integration tests for agent system end-to-end
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import AgentExecutor from '../../src/domains/agent/agent-executor.js';
import AgentStore from '../../src/domains/agent/agent-store.js';
import TriggerEvaluator from '../../src/domains/agent/trigger-evaluator.js';
import CronScheduler from '../../src/domains/agent/cron-scheduler.js';

describe('Agent System Integration', () => {
  let store;
  let executor;
  let scheduler;

  const userContext = {
    userId: 1,
    orgId: 1,
    roles: ['admin'],
  };

  beforeEach(() => {
    store = new AgentStore(null);
    executor = new AgentExecutor({
      runtime: {
        execute: async (req) => ({
          success: true,
          result: { id: req.data.id, ...req.data },
        }),
      },
      workflowExecutor: null,
      queueManager: null,
    });
    scheduler = new CronScheduler(null);
  });

  describe('Auto-Escalation Workflow', () => {
    it('should escalate overdue tickets', async () => {
      // Define escalation agent
      const escalateAgent = {
        id: 'auto_escalate',
        slug: 'ticket',
        triggerEvent: 'manual', // Would be 'scheduled' in production
        trigger: 'data.status != "closed" AND data.daysOpen > 2',
        action: {
          type: 'escalate',
          config: {
            updates: {
              priority: 'urgent',
              escalatedAt: new Date().toISOString(),
            },
          },
        },
      };

      await store.register(escalateAgent);

      // Get tickets
      const tickets = [
        { id: 1, status: 'open', daysOpen: 1 },
        { id: 2, status: 'open', daysOpen: 5 },
        { id: 3, status: 'in_progress', daysOpen: 3 },
        { id: 4, status: 'closed', daysOpen: 10 },
      ];

      // Find tickets that match trigger
      const toEscalate = await TriggerEvaluator.evaluateMany(
        escalateAgent.trigger,
        tickets,
        userContext
      );

      expect(toEscalate).toHaveLength(2);
      expect(toEscalate.map(t => t.id)).toEqual([2, 3]);

      // Execute agent on matching tickets
      const results = [];
      for (const ticket of toEscalate) {
        const result = await executor.executeSync(escalateAgent, {
          record: ticket,
          entity: { slug: 'ticket' },
        }, userContext);
        results.push(result);
      }

      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('Event-Triggered Agents', () => {
    it('should trigger notification on new ticket creation', async () => {
      const notifyAgent = {
        id: 'notify_on_create',
        slug: 'ticket',
        triggerEvent: 'onCreate',
        action: {
          type: 'workflow',
          config: {
            workflowId: 'notify_customer',
          },
        },
      };

      await store.register(notifyAgent);

      // Verify agent is registered and retrieves for onCreate
      const createAgents = await store.getByEvent('ticket', 'onCreate');

      expect(createAgents).toHaveLength(1);
      expect(createAgents[0].id).toBe('notify_on_create');
    });

    it('should execute multiple agents on same event', async () => {
      const notifyAgent = {
        id: 'notify',
        slug: 'ticket',
        triggerEvent: 'onCreate',
        action: { type: 'escalate', config: { updates: {} } },
      };

      const logAgent = {
        id: 'log',
        slug: 'ticket',
        triggerEvent: 'onCreate',
        action: { type: 'escalate', config: { updates: {} } },
      };

      await store.register(notifyAgent);
      await store.register(logAgent);

      const agents = await store.getByEvent('ticket', 'onCreate');

      expect(agents).toHaveLength(2);
    });

    it('should not execute disabled agents', async () => {
      const disabledAgent = {
        id: 'disabled',
        slug: 'ticket',
        triggerEvent: 'onCreate',
        enabled: false,
        action: { type: 'escalate', config: { updates: {} } },
      };

      await store.register(disabledAgent);

      const agents = await store.getByEvent('ticket', 'onCreate');

      expect(agents).toHaveLength(0);
    });
  });

  describe('Conditional Agent Execution', () => {
    it('should only execute agent if trigger condition met', async () => {
      const priorityAgent = {
        id: 'high_priority_action',
        slug: 'ticket',
        triggerEvent: 'onUpdate',
        trigger: 'data.priority == "urgent"',
        action: {
          type: 'escalate',
          config: { updates: { escalatedAt: 'now' } },
        },
      };

      await store.register(priorityAgent);

      // Test with urgent ticket
      const urgentTicket = { id: 1, priority: 'urgent', status: 'open' };
      const shouldExecute = await TriggerEvaluator.evaluate(
        priorityAgent.trigger,
        urgentTicket,
        userContext
      );

      expect(shouldExecute).toBe(true);

      // Test with low priority ticket
      const lowTicket = { id: 2, priority: 'low', status: 'open' };
      const shouldNotExecute = await TriggerEvaluator.evaluate(
        priorityAgent.trigger,
        lowTicket,
        userContext
      );

      expect(shouldNotExecute).toBe(false);
    });
  });

  describe('Scheduled Agents', () => {
    it('should retrieve scheduled agents', async () => {
      const scheduledAgent = {
        id: 'daily_escalate',
        slug: 'ticket',
        triggerEvent: 'scheduled',
        schedule: '0 8 * * *', // Daily at 8am
        action: {
          type: 'escalate',
          config: { updates: { priority: 'high' } },
        },
      };

      await store.register(scheduledAgent);

      const scheduled = await store.getScheduled();

      expect(scheduled).toHaveLength(1);
      expect(scheduled[0].schedule).toBe('0 8 * * *');
    });

    it('should not include non-scheduled agents in scheduled list', async () => {
      const eventAgent = {
        id: 'on_create',
        slug: 'ticket',
        triggerEvent: 'onCreate',
        action: { type: 'escalate', config: { updates: {} } },
      };

      const scheduledAgent = {
        id: 'hourly_check',
        slug: 'ticket',
        triggerEvent: 'scheduled',
        schedule: '0 * * * *',
        action: { type: 'escalate', config: { updates: {} } },
      };

      await store.register(eventAgent);
      await store.register(scheduledAgent);

      const scheduled = await store.getScheduled();

      expect(scheduled).toHaveLength(1);
      expect(scheduled[0].id).toBe('hourly_check');
    });
  });

  describe('Agent Lifecycle', () => {
    it('should register, update, and unregister agent', async () => {
      const agent = {
        id: 'lifecycle_agent',
        slug: 'ticket',
        triggerEvent: 'onUpdate',
        trigger: 'data.status == "open"',
        action: { type: 'escalate', config: { updates: {} } },
      };

      // Register
      await store.register(agent);
      expect(store.has('lifecycle_agent')).toBe(true);

      // Update
      const updated = await store.update('lifecycle_agent', {
        trigger: 'data.status == "urgent"',
      });
      expect(updated.trigger).toBe('data.status == "urgent"');

      // Unregister
      await store.unregister('lifecycle_agent');
      expect(store.has('lifecycle_agent')).toBe(false);
    });
  });

  describe('Real-World Ticket Management Scenario', () => {
    it('should execute comprehensive ticket agent workflow', async () => {
      // Define multiple agents for a ticket system
      const agents = [
        {
          id: 'notify_on_create',
          slug: 'ticket',
          triggerEvent: 'onCreate',
          action: {
            type: 'workflow',
            config: { workflowId: 'notify_customer' },
          },
        },
        {
          id: 'auto_escalate_old',
          slug: 'ticket',
          triggerEvent: 'scheduled',
          schedule: '0 * * * *', // Hourly
          trigger: 'data.status != "closed" AND data.daysOpen > 2',
          action: {
            type: 'escalate',
            config: { updates: { priority: 'urgent' } },
          },
        },
        {
          id: 'notify_urgent',
          slug: 'ticket',
          triggerEvent: 'onUpdate',
          trigger: 'data.priority == "urgent"',
          action: {
            type: 'workflow',
            config: { workflowId: 'notify_manager' },
          },
        },
      ];

      // Register all agents
      for (const agent of agents) {
        await store.register(agent);
      }

      // Verify registration
      const createAgents = await store.getByEvent('ticket', 'onCreate');
      const updateAgents = await store.getByEvent('ticket', 'onUpdate');
      const scheduled = await store.getScheduled();

      expect(createAgents).toHaveLength(1);
      expect(updateAgents).toHaveLength(1);
      expect(scheduled).toHaveLength(1);

      // Simulate ticket lifecycle
      const newTicket = { id: 1, status: 'open', priority: 'low', daysOpen: 0 };

      // On create: notify customer
      const createAgentMatches = await TriggerEvaluator.evaluateMany(
        createAgents[0].trigger,
        [newTicket],
        userContext
      );
      expect(createAgentMatches).toHaveLength(1);

      // After 3 days: auto-escalate
      const oldTicket = { ...newTicket, daysOpen: 5 };
      const shouldEscalate = await TriggerEvaluator.evaluate(
        scheduled[0].trigger,
        oldTicket,
        userContext
      );
      expect(shouldEscalate).toBe(true);

      // Execute escalate
      const escalateResult = await executor.executeSync(scheduled[0], {
        record: oldTicket,
        entity: { slug: 'ticket' },
      }, userContext);
      expect(escalateResult.success).toBe(true);

      // On urgent update: notify manager
      const urgentTicket = { ...oldTicket, priority: 'urgent' };
      const shouldNotifyManager = await TriggerEvaluator.evaluate(
        updateAgents[0].trigger,
        urgentTicket,
        userContext
      );
      expect(shouldNotifyManager).toBe(true);
    });
  });

  describe('Agent Action Types', () => {
    it('should execute escalate action', async () => {
      const escalateAgent = {
        id: 'test_escalate',
        slug: 'ticket',
        triggerEvent: 'manual',
        action: {
          type: 'escalate',
          config: {
            updates: { priority: 'urgent', assignedTo: 5 },
          },
        },
      };

      const result = await executor.executeSync(escalateAgent, {
        record: { id: 1, priority: 'low' },
        entity: { slug: 'ticket' },
      }, userContext);

      expect(result.success).toBe(true);
      expect(result.data.action).toBe('escalate');
    });

    it('should execute mutate action', async () => {
      const mutateAgent = {
        id: 'test_mutate',
        slug: 'ticket',
        triggerEvent: 'manual',
        action: {
          type: 'mutate',
          config: {
            updates: { lastReviewedAt: 'now', reviewCount: 1 },
          },
        },
      };

      const result = await executor.executeSync(mutateAgent, {
        record: { id: 1, lastReviewedAt: null, reviewCount: 0 },
        entity: { slug: 'ticket' },
      }, userContext);

      expect(result.success).toBe(true);
      expect(result.data.action).toBe('mutate');
    });
  });
});
