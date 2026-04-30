/**
 * AgentRegistry manages agent registration, capabilities, subscriptions, and execution.
 * Central coordinator for agent lifecycle.
 */
export class AgentRegistry {
  constructor() {
    this.agents = new Map(); // agentId → AgentDef
    this.responses = new Map(); // requestId → AgentResponse
    this.eventIndex = new Map(); // event → SubscriberInfo[]
  }

  /**
   * Registers an agent or updates existing agent.
   */
  registerAgent(agent) {
    this.agents.set(agent.id, agent);
    // Update event index
    this.indexSubscriptions(agent);
  }

  /**
   * Retrieves an agent by ID.
   */
  getAgent(agentId) {
    return this.agents.get(agentId);
  }

  /**
   * Lists all registered agents, optionally filtered by enabled status.
   */
  listAgents(enabled) {
    let agents = Array.from(this.agents.values());
    if (enabled !== undefined) {
      agents = agents.filter((a) => a.enabled === enabled);
    }
    return agents;
  }

  /**
   * Executes an agent capability.
   * Placeholder - actual execution delegated to executor.
   */
  async executeCapability(agentId, capability, input) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return { success: false, error: `Agent '${agentId}' not found` };
    }

    const cap = agent.capabilities.find((c) => c.name === capability);
    if (!cap) {
      return { success: false, error: `Capability '${capability}' not found` };
    }

    // Actual execution happens in executor
    return { success: true, data: { executed: true } };
  }

  /**
   * Subscribes an agent to an event.
   */
  subscribe(agentId, subscription) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent '${agentId}' not found`);
    }

    agent.subscriptions.push(subscription);
    this.indexSubscriptions(agent);
  }

  /**
   * Unsubscribes an agent from an event.
   */
  unsubscribe(agentId, subscriptionId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent '${agentId}' not found`);
    }

    agent.subscriptions = agent.subscriptions.filter((s) => s.id !== subscriptionId);
    this.rebuildEventIndex();
  }

  /**
   * Stores an agent response.
   */
  async respond(response) {
    this.responses.set(response.requestId, response);
  }

  /**
   * Retrieves a response by request ID.
   */
  getResponse(requestId) {
    return this.responses.get(requestId);
  }

  /**
   * Finds agents subscribed to an event.
   * Returns sorted by priority (higher first).
   */
  getSubscribersFor(event) {
    const subscribers = [];

    for (const agent of this.agents.values()) {
      if (!agent.enabled) continue;

      for (const sub of agent.subscriptions) {
        if (this.eventMatches(sub.event, event)) {
          subscribers.push({
            agentId: agent.id,
            subscriptionId: sub.id,
            event: sub.event,
            capability: sub.capability,
            priority: sub.priority || 0,
          });
        }
      }
    }

    // Sort by priority (descending)
    return subscribers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Rebuilds event index from all agents.
   */
  rebuildEventIndex() {
    this.eventIndex.clear();
    for (const agent of this.agents.values()) {
      this.indexSubscriptions(agent);
    }
  }

  /**
   * Updates event index for an agent's subscriptions.
   */
  indexSubscriptions(agent) {
    for (const sub of agent.subscriptions) {
      if (!this.eventIndex.has(sub.event)) {
        this.eventIndex.set(sub.event, []);
      }

      const subscribers = this.eventIndex.get(sub.event);
      subscribers.push({
        agentId: agent.id,
        subscriptionId: sub.id,
        event: sub.event,
        capability: sub.capability,
        priority: sub.priority || 0,
      });

      // Sort by priority
      subscribers.sort((a, b) => b.priority - a.priority);
    }
  }

  /**
   * Checks if event pattern matches an event name.
   */
  eventMatches(pattern, eventName) {
    if (pattern === '*') return true;
    if (pattern === eventName) return true;
    if (pattern.endsWith(':*')) {
      const prefix = pattern.slice(0, -2);
      return eventName.startsWith(prefix + ':');
    }
    return false;
  }
}
