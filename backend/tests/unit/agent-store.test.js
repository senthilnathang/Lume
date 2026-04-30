/**
 * @fileoverview Unit tests for AgentStore
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import AgentStore from '../../src/domains/agent/agent-store.js';

describe('AgentStore', () => {
  let store;

  beforeEach(() => {
    store = new AgentStore(null);
  });

  describe('Registration', () => {
    it('should register an agent', async () => {
      const agent = {
        id: 'escalate_agent',
        slug: 'ticket',
        triggerEvent: 'onUpdate',
        trigger: 'status != "closed" && daysOpen > 2',
        action: {
          type: 'escalate',
          config: { updates: { priority: 'urgent' } },
        },
      };

      const registered = await store.register(agent);

      expect(registered.id).toBe('escalate_agent');
      expect(store.has('escalate_agent')).toBe(true);
    });

    it('should retrieve agent by ID', async () => {
      const agent = {
        id: 'test_agent',
        slug: 'ticket',
        triggerEvent: 'onCreate',
        action: { type: 'escalate', config: {} },
      };

      await store.register(agent);
      const retrieved = await store.get('test_agent');

      expect(retrieved.id).toBe('test_agent');
      expect(retrieved.slug).toBe('ticket');
    });

    it('should get all agents for an entity', async () => {
      const agent1 = {
        id: 'agent1',
        slug: 'ticket',
        triggerEvent: 'onCreate',
        action: { type: 'escalate', config: {} },
      };

      const agent2 = {
        id: 'agent2',
        slug: 'ticket',
        triggerEvent: 'onUpdate',
        action: { type: 'workflow', config: { workflowId: 'test' } },
      };

      await store.register(agent1);
      await store.register(agent2);

      const agents = await store.getByEntity('ticket');

      expect(agents).toHaveLength(2);
      expect(agents.map(a => a.id)).toContain('agent1');
      expect(agents.map(a => a.id)).toContain('agent2');
    });

    it('should get agents by event', async () => {
      const onCreate = {
        id: 'on_create',
        slug: 'ticket',
        triggerEvent: 'onCreate',
        enabled: true,
        action: { type: 'escalate', config: {} },
      };

      const onUpdate = {
        id: 'on_update',
        slug: 'ticket',
        triggerEvent: 'onUpdate',
        enabled: true,
        action: { type: 'escalate', config: {} },
      };

      const disabled = {
        id: 'disabled',
        slug: 'ticket',
        triggerEvent: 'onCreate',
        enabled: false,
        action: { type: 'escalate', config: {} },
      };

      await store.register(onCreate);
      await store.register(onUpdate);
      await store.register(disabled);

      const createAgents = await store.getByEvent('ticket', 'onCreate');

      expect(createAgents).toHaveLength(1); // Only enabled agents
      expect(createAgents[0].id).toBe('on_create');
    });

    it('should get scheduled agents', async () => {
      const scheduled = {
        id: 'scheduled_agent',
        slug: 'ticket',
        triggerEvent: 'scheduled',
        schedule: '0 * * * *',
        enabled: true,
        action: { type: 'escalate', config: {} },
      };

      const eventTriggered = {
        id: 'event_agent',
        slug: 'ticket',
        triggerEvent: 'onCreate',
        enabled: true,
        action: { type: 'escalate', config: {} },
      };

      await store.register(scheduled);
      await store.register(eventTriggered);

      const scheduled_agents = await store.getScheduled();

      expect(scheduled_agents).toHaveLength(1);
      expect(scheduled_agents[0].id).toBe('scheduled_agent');
    });
  });

  describe('Update', () => {
    it('should update agent definition', async () => {
      const agent = {
        id: 'update_test',
        slug: 'ticket',
        triggerEvent: 'onUpdate',
        action: { type: 'escalate', config: { updates: { priority: 'high' } } },
      };

      await store.register(agent);

      const updated = await store.update('update_test', {
        action: {
          type: 'escalate',
          config: { updates: { priority: 'urgent' } },
        },
      });

      expect(updated.action.config.updates.priority).toBe('urgent');
    });

    it('should throw on update of non-existent agent', async () => {
      try {
        await store.update('nonexistent', {});
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('not found');
      }
    });

    it('should validate on update', async () => {
      const agent = {
        id: 'validate_test',
        slug: 'ticket',
        triggerEvent: 'onUpdate',
        action: { type: 'escalate', config: {} },
      };

      await store.register(agent);

      try {
        await store.update('validate_test', {
          triggerEvent: 'invalid_event',
        });
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('validation failed');
      }
    });
  });

  describe('Unregister', () => {
    it('should unregister an agent', async () => {
      const agent = {
        id: 'delete_test',
        slug: 'ticket',
        triggerEvent: 'onUpdate',
        action: { type: 'escalate', config: {} },
      };

      await store.register(agent);
      expect(store.has('delete_test')).toBe(true);

      await store.unregister('delete_test');

      expect(store.has('delete_test')).toBe(false);
    });

    it('should throw on unregister non-existent agent', async () => {
      try {
        await store.unregister('nonexistent');
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('not found');
      }
    });

    it('should remove from entity agents list', async () => {
      const agent1 = {
        id: 'agent1',
        slug: 'ticket',
        triggerEvent: 'onCreate',
        action: { type: 'escalate', config: {} },
      };

      const agent2 = {
        id: 'agent2',
        slug: 'ticket',
        triggerEvent: 'onUpdate',
        action: { type: 'escalate', config: {} },
      };

      await store.register(agent1);
      await store.register(agent2);

      expect(await store.getByEntity('ticket')).toHaveLength(2);

      await store.unregister('agent1');

      expect(await store.getByEntity('ticket')).toHaveLength(1);
      expect((await store.getByEntity('ticket'))[0].id).toBe('agent2');
    });
  });

  describe('Validation', () => {
    it('should reject agent without id', async () => {
      const agent = {
        slug: 'ticket',
        triggerEvent: 'onUpdate',
        action: { type: 'escalate', config: {} },
      };

      try {
        await store.register(agent);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('validation failed');
      }
    });

    it('should reject agent without slug', async () => {
      const agent = {
        id: 'test',
        triggerEvent: 'onUpdate',
        action: { type: 'escalate', config: {} },
      };

      try {
        await store.register(agent);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('validation failed');
      }
    });

    it('should reject agent without triggerEvent', async () => {
      const agent = {
        id: 'test',
        slug: 'ticket',
        action: { type: 'escalate', config: {} },
      };

      try {
        await store.register(agent);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('validation failed');
      }
    });

    it('should reject invalid triggerEvent', async () => {
      const agent = {
        id: 'test',
        slug: 'ticket',
        triggerEvent: 'invalid_event',
        action: { type: 'escalate', config: {} },
      };

      try {
        await store.register(agent);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('triggerEvent must be one of');
      }
    });

    it('should require schedule for scheduled trigger', async () => {
      const agent = {
        id: 'test',
        slug: 'ticket',
        triggerEvent: 'scheduled',
        // Missing schedule
        action: { type: 'escalate', config: {} },
      };

      try {
        await store.register(agent);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('schedule is required');
      }
    });

    it('should reject agent without action', async () => {
      const agent = {
        id: 'test',
        slug: 'ticket',
        triggerEvent: 'onUpdate',
        // Missing action
      };

      try {
        await store.register(agent);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('action is required');
      }
    });

    it('should reject invalid action type', async () => {
      const agent = {
        id: 'test',
        slug: 'ticket',
        triggerEvent: 'onUpdate',
        action: { type: 'invalid_action', config: {} },
      };

      try {
        await store.register(agent);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('action.type must be one of');
      }
    });
  });

  describe('Listing', () => {
    it('should list all agents', async () => {
      const agent1 = {
        id: 'a1',
        slug: 'ticket',
        triggerEvent: 'onCreate',
        action: { type: 'escalate', config: {} },
      };

      const agent2 = {
        id: 'a2',
        slug: 'user',
        triggerEvent: 'onUpdate',
        action: { type: 'workflow', config: { workflowId: 'test' } },
      };

      await store.register(agent1);
      await store.register(agent2);

      const all = await store.list();

      expect(all).toHaveLength(2);
    });
  });

  describe('Clear', () => {
    it('should clear all agents', async () => {
      const agent1 = {
        id: 'a1',
        slug: 'ticket',
        triggerEvent: 'onCreate',
        action: { type: 'escalate', config: {} },
      };

      const agent2 = {
        id: 'a2',
        slug: 'user',
        triggerEvent: 'onUpdate',
        action: { type: 'escalate', config: {} },
      };

      await store.register(agent1);
      await store.register(agent2);

      expect(await store.list()).toHaveLength(2);

      await store.clear();

      expect(await store.list()).toHaveLength(0);
      expect(store.has('a1')).toBe(false);
    });
  });
});
