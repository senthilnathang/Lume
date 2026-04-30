export type AgentStatus = 'registered' | 'active' | 'paused' | 'failed' | 'removed';
export type ResponseStatus = 'pending' | 'processing' | 'success' | 'failed' | 'timeout';
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

/** Subscription condition for filtering events */
export interface SubscriptionCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'in' | 'contains';
  value: any;
}

/** Agent capability (like a skill or function) */
export interface AgentCapability {
  name: string;
  description?: string;
  inputSchema?: Record<string, any>; // JSON Schema
  outputSchema?: Record<string, any>;
  timeout?: number; // Execution timeout in seconds
  maxRetries?: number;
}

/** Agent event subscription */
export interface AgentSubscription {
  id: string;
  event: string; // e.g., "ticket:created", "order:*"
  capability: string; // Capability name to invoke
  conditions?: SubscriptionCondition[]; // Optional filter conditions
  priority?: number; // Higher priority agents execute first
  async?: boolean; // Execute async (fire-and-forget)
}

/** Agent definition */
export interface AgentDef {
  id: string;
  name: string;
  description?: string;
  capabilities: AgentCapability[];
  subscriptions: AgentSubscription[];
  enabled: boolean;
  version: number;
  maxConcurrency?: number; // Max concurrent executions (default 5)
  circuitBreakerThreshold?: number; // Failure threshold before opening circuit
  created_at?: Date;
  updated_at?: Date;
}

/** Agent execution request */
export interface AgentRequest {
  id: string;
  agentId: string;
  capability: string;
  input: Record<string, any>;
  correlationId?: string; // For request tracing
  createdAt: Date;
  timeout?: number; // Override default timeout
  retryCount?: number; // Current retry attempt
}

/** Agent execution response */
export interface AgentResponse {
  id: string;
  requestId: string;
  agentId: string;
  output?: Record<string, any>;
  status: ResponseStatus;
  error?: string;
  executionTimeMs?: number;
  completedAt?: Date;
}

/** Job for async agent execution */
export interface AgentJob {
  id: string;
  agentId: string;
  capability: string;
  input: Record<string, any>;
  status: 'queued' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: Date;
}

/** Execution context passed to agent */
export interface ExecutionContext {
  requestId: string;
  agentId: string;
  capability: string;
  input: Record<string, any>;
  eventData?: Record<string, any>; // Original event that triggered
  retryCount: number;
  timeout: number;
  circuitBreakerState?: CircuitBreakerState;
}

/** Result of agent execution */
export interface RequestResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTimeMs?: number;
}

/** Agent event emitted during lifecycle */
export interface AgentEvent {
  event: 'agent:registered' | 'agent:subscribed' | 'agent:executed' | 'agent:failed' | 'agent:circuit-opened';
  agentId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/** Agent registry interface */
export interface IAgentRegistry {
  registerAgent(agent: AgentDef): void;
  getAgent(agentId: string): AgentDef | undefined;
  listAgents(enabled?: boolean): AgentDef[];
  executeCapability(agentId: string, capability: string, input: Record<string, any>): Promise<RequestResult>;
  subscribe(agentId: string, subscription: AgentSubscription): void;
  unsubscribe(agentId: string, subscriptionId: string): void;
  respond(response: AgentResponse): Promise<void>;
  getResponse(requestId: string): AgentResponse | undefined;
}
