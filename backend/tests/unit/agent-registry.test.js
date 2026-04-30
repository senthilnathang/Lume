import { describe, it, expect, beforeEach } from '@jest/globals';
import { AgentRegistry } from '../../src/core/agents/registry.js';

describe('AgentRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  describe('registerAgent', () => {
    it('should register an agent', () => {
      const agent = {
        id: 'agent-1',
        name: 'Classifier',
        capabilities: [{ name: 'classify' }],
        subscriptions: [],
        enabled: true,
        version: 1,
      };
      registry.registerAgent(agent);
      const retrieved = registry.getAgent('agent-1');
      expect(retrieved?.id).toBe('agent-1');
    });

    it('should update existing agent', () => {
      const agent1 = {
        id: 'agent-1',
        name: 'Classifier v1',
        capabilities: [],
        subscriptions: [],
        enabled: true,
        version: 1,
      };
      const agent2 = {
        id: 'agent-1',
        name: 'Classifier v2',
        capabilities: [],
        subscriptions: [],
        enabled: true,
        version: 2,
      };
      registry.registerAgent(agent1);
      registry.registerAgent(agent2);

      const retrieved = registry.getAgent('agent-1');
      expect(retrieved?.name).toBe('Classifier v2');
    });
  });

  describe('getAgent', () => {
    it('should retrieve agent by id', () => {
      const agent = {
        id: 'agent-1',
        name: 'Test',
        capabilities: [],
        subscriptions: [],
        enabled: true,
        version: 1,
      };
      registry.registerAgent(agent);
      const retrieved = registry.getAgent('agent-1');
      expect(retrieved).toEqual(agent);
    });

    it('should return undefined for unknown agent', () => {
      const agent = registry.getAgent('unknown');
      expect(agent).toBeUndefined();
    });
  });

  describe('listAgents', () => {
    it('should list all agents', () => {
      const agent1 = {
        id: 'agent-1',
        name: 'Agent 1',
        capabilities: [],
        subscriptions: [],
        enabled: true,
        version: 1,
      };
      const agent2 = {
        id: 'agent-2',
        name: 'Agent 2',
        capabilities: [],
        subscriptions: [],
        enabled: false,
        version: 1,
      };
      registry.registerAgent(agent1);
      registry.registerAgent(agent2);

      const agents = registry.listAgents();
      expect(agents).toHaveLength(2);
    });

    it('should filter by enabled status', () => {
      const agent1 = {
        id: 'agent-1',
        name: 'Agent 1',
        capabilities: [],
        subscriptions: [],
        enabled: true,
        version: 1,
      };
      const agent2 = {
        id: 'agent-2',
        name: 'Agent 2',
        capabilities: [],
        subscriptions: [],
        enabled: false,
        version: 1,
      };
      registry.registerAgent(agent1);
      registry.registerAgent(agent2);

      const enabled = registry.listAgents(true);
      expect(enabled).toHaveLength(1);
      expect(enabled[0].id).toBe('agent-1');
    });
  });

  describe('subscribe', () => {
    it('should subscribe agent to event', () => {
      const agent = {
        id: 'agent-1',
        name: 'Test',
        capabilities: [{ name: 'classify' }],
        subscriptions: [],
        enabled: true,
        version: 1,
      };
      registry.registerAgent(agent);

      const subscription = {
        id: 'sub-1',
        event: 'ticket:created',
        capability: 'classify',
      };
      registry.subscribe('agent-1', subscription);

      const updated = registry.getAgent('agent-1');
      expect(updated?.subscriptions).toHaveLength(1);
      expect(updated?.subscriptions[0].event).toBe('ticket:created');
    });
  });

  describe('unsubscribe', () => {
    it('should remove subscription', () => {
      const agent = {
        id: 'agent-1',
        name: 'Test',
        capabilities: [],
        subscriptions: [
          {
            id: 'sub-1',
            event: 'ticket:created',
            capability: 'classify',
          },
        ],
        enabled: true,
        version: 1,
      };
      registry.registerAgent(agent);

      registry.unsubscribe('agent-1', 'sub-1');
      const updated = registry.getAgent('agent-1');
      expect(updated?.subscriptions).toHaveLength(0);
    });
  });

  describe('getSubscribersFor', () => {
    it('should find agents subscribed to event', () => {
      const agent = {
        id: 'agent-1',
        name: 'Test',
        capabilities: [{ name: 'classify' }],
        subscriptions: [
          {
            id: 'sub-1',
            event: 'ticket:created',
            capability: 'classify',
            priority: 100,
          },
        ],
        enabled: true,
        version: 1,
      };
      registry.registerAgent(agent);

      const subscribers = registry.getSubscribersFor('ticket:created');
      expect(subscribers).toHaveLength(1);
      expect(subscribers[0].agentId).toBe('agent-1');
    });

    it('should match wildcard subscriptions', () => {
      const agent = {
        id: 'agent-1',
        name: 'Test',
        capabilities: [{ name: 'handle' }],
        subscriptions: [
          {
            id: 'sub-1',
            event: 'ticket:*',
            capability: 'handle',
          },
        ],
        enabled: true,
        version: 1,
      };
      registry.registerAgent(agent);

      const subscribers = registry.getSubscribersFor('ticket:created');
      expect(subscribers).toHaveLength(1);
    });

    it('should sort by priority', () => {
      const agent1 = {
        id: 'agent-1',
        name: 'Test 1',
        capabilities: [{ name: 'handle' }],
        subscriptions: [
          {
            id: 'sub-1',
            event: 'ticket:created',
            capability: 'handle',
            priority: 10,
          },
        ],
        enabled: true,
        version: 1,
      };
      const agent2 = {
        id: 'agent-2',
        name: 'Test 2',
        capabilities: [{ name: 'handle' }],
        subscriptions: [
          {
            id: 'sub-2',
            event: 'ticket:created',
            capability: 'handle',
            priority: 100,
          },
        ],
        enabled: true,
        version: 1,
      };
      registry.registerAgent(agent1);
      registry.registerAgent(agent2);

      const subscribers = registry.getSubscribersFor('ticket:created');
      expect(subscribers[0].agentId).toBe('agent-2'); // Higher priority first
    });
  });
});
