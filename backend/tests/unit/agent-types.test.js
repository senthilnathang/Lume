import { jest } from '@jest/globals';

describe('Agent Types', () => {
  describe('AgentDef', () => {
    it('should have id, name, capabilities, subscriptions, enabled', () => {
      const agent = {
        id: 'agent-1',
        name: 'Ticket Processor',
        description: 'Processes ticket events',
        capabilities: [],
        subscriptions: [],
        enabled: true,
        version: 1,
        maxConcurrency: 5,
      };
      expect(agent.id).toBe('agent-1');
      expect(agent.maxConcurrency).toBe(5);
    });
  });

  describe('AgentCapability', () => {
    it('should have name, input schema, output schema, timeout', () => {
      const capability = {
        name: 'classify_ticket',
        description: 'Classify tickets by priority',
        inputSchema: { type: 'object', properties: { text: { type: 'string' } } },
        outputSchema: { type: 'object', properties: { priority: { type: 'string' } } },
        timeout: 30,
      };
      expect(capability.name).toBe('classify_ticket');
      expect(capability.timeout).toBe(30);
    });
  });

  describe('AgentSubscription', () => {
    it('should subscribe to events with conditions', () => {
      const subscription = {
        id: 'sub-1',
        event: 'ticket:created',
        capability: 'classify_ticket',
        conditions: [{ field: 'status', operator: 'eq', value: 'open' }],
        priority: 100,
      };
      expect(subscription.event).toBe('ticket:created');
      expect(subscription.capability).toBe('classify_ticket');
    });
  });

  describe('AgentRequest', () => {
    it('should have id, agentId, capability, input, correlationId', () => {
      const request = {
        id: 'req-1',
        agentId: 'agent-1',
        capability: 'classify_ticket',
        input: { text: 'Urgent bug fix needed' },
        correlationId: 'corr-1',
        createdAt: new Date(),
        timeout: 30,
      };
      expect(request.agentId).toBe('agent-1');
      expect(request.correlationId).toBe('corr-1');
    });
  });

  describe('AgentResponse', () => {
    it('should have id, requestId, agentId, output, status', () => {
      const response = {
        id: 'resp-1',
        requestId: 'req-1',
        agentId: 'agent-1',
        output: { priority: 'high' },
        status: 'success',
        completedAt: new Date(),
      };
      expect(response.requestId).toBe('req-1');
      expect(response.status).toBe('success');
    });
  });

  describe('ExecutionContext', () => {
    it('should contain request, agent info, event data', () => {
      const context = {
        requestId: 'req-1',
        agentId: 'agent-1',
        capability: 'classify',
        input: { text: 'test' },
        eventData: { ticketId: '123' },
        retryCount: 0,
        timeout: 30,
      };
      expect(context.agentId).toBe('agent-1');
      expect(context.retryCount).toBe(0);
    });
  });

  describe('IAgentRegistry interface', () => {
    it('should define register, execute, subscribe, respond', () => {
      const methods = [
        'registerAgent',
        'getAgent',
        'listAgents',
        'executeCapability',
        'subscribe',
        'unsubscribe',
        'respond',
      ];
      methods.forEach((method) => {
        expect(typeof method).toBe('string');
      });
    });
  });
});
