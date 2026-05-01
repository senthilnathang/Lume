# FlowGrid + AgentGrid Architecture

**Version:** 2.0  
**Status:** Enterprise-Grade Architecture  
**Last Updated:** May 2026

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Concepts](#core-concepts)
3. [Architecture Layers](#architecture-layers)
4. [Node System Design](#node-system-design)
5. [Graph Execution Engine](#graph-execution-engine)
6. [Agent Orchestration Layer](#agent-orchestration-layer)
7. [Plugin Architecture](#plugin-architecture)
8. [Advanced Features](#advanced-features)

---

## System Overview

### Vision

**FlowGrid** is an enterprise-grade, distributed workflow execution engine that orchestrates AI agents, tools, and data transformations through a composable node-based DAG (Directed Acyclic Graph) system.

**AgentGrid** is an autonomous agent orchestration layer that manages multi-agent collaboration, task decomposition, and adaptive strategy selection.

Together, they form **Lume's intelligent automation backbone** — comparable to Temporal (workflow orchestration) + LangChain (agent coordination) + Kubernetes (distributed execution).

### Key Differentiators vs Flowise

| Aspect | Flowise | Lume FlowGrid |
|--------|---------|--------------|
| **Execution Model** | Sequential chaining | Parallel DAG + async streaming |
| **Agent Support** | Basic agent wrapper | Supervisor/worker multi-agent system |
| **Scalability** | Single process | Distributed queue-based + edge execution |
| **Policy Integration** | None | PolicyGrid-aware (field-level auth) |
| **Observability** | Basic logging | Full OpenTelemetry tracing + replay system |
| **State Management** | In-memory | Distributed state with rollback |
| **Node Development** | Manual registration | Hot-reload plugin system |
| **Recovery** | None | Retry/fallback/circuit breaker |
| **AI Reasoning** | None | Semantic routing + self-evolving loops |

---

## Core Concepts

### 1. Node

**Definition**: An executable unit that implements `IWorkflowNode` interface.

**Properties**:
- Unique ID within workflow
- Type (LLM, Tool, Agent, Memory, etc.)
- Input/output schema (JSON Schema)
- Configuration (serializable)
- Async execution method
- Lifecycle hooks (onStart, onData, onError, onComplete)
- Policy constraints
- Observability markers

**Example**:
```
┌─────────────────┐
│  LLM Node       │
├─────────────────┤
│ id: "llm-1"     │
│ type: "llm"     │
│ model: "gpt-4"  │
│ maxTokens: 4000 │
├─────────────────┤
│ inputs:         │
│  - prompt       │
│  - context      │
│ outputs:        │
│  - response     │
│  - tokens_used  │
└─────────────────┘
```

### 2. Edge

**Definition**: A directed connection between two nodes representing data/control flow.

**Types**:
- **Data Edge**: Passes output of one node to input of another
- **Control Edge**: Enforces execution ordering without data passing
- **Conditional Edge**: Routes based on runtime conditions

**Properties**:
- Source node ID
- Target node ID
- Mapping: `sourceOutput.field → targetInput.field`
- Condition (optional): `targetInput.field matches <condition>`
- Transform (optional): Apply function to data

### 3. Graph (Workflow)

**Definition**: A DAG of nodes + edges representing a complete workflow.

**Properties**:
- Nodes: `Map<nodeId, IWorkflowNode>`
- Edges: `Edge[]`
- Entry points: `nodeIds[]` (can have multiple)
- Exit points: `nodeIds[]` (outputs of workflow)
- Metadata: version, author, tags, description
- Policies: authorization rules for execution

### 4. Execution Context

**Definition**: Runtime state and data during workflow execution.

**Tracks**:
- Node outputs: `Map<nodeId, output>`
- Variables: workflow-scoped state
- Secrets: secure credential access
- User context: tenant, roles, permissions
- Trace: execution tree with timing
- Metrics: token usage, latency, etc.

### 5. Agent

**Definition**: An autonomous entity that orchestrates graph execution using reasoning.

**Capabilities**:
- Task decomposition
- Tool selection
- Adaptation (modifying strategy mid-execution)
- Collaboration (multi-agent coordination)
- Learning (updating strategy based on outcomes)

---

## Architecture Layers

```
┌────────────────────────────────────────────────────────┐
│         GraphQL/REST API Layer                         │
│  (Queries: workflows, agents, executions)              │
│  (Mutations: execute, create, update, stop)            │
│  (Subscriptions: real-time execution updates)          │
└────────────┬─────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────┐
│         Orchestration Layer                           │
│  ┌──────────────────────────────────────────────┐    │
│  │ AgentGrid (Multi-agent coordination)         │    │
│  │ - Supervisor agent (task decomposition)      │    │
│  │ - Worker agents (specialized execution)      │    │
│  │ - Memory sharing & negotiation               │    │
│  └──────────────────────────────────────────────┘    │
└────────────┬─────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────┐
│         Execution Layer                               │
│  ┌──────────────────────────────────────────────┐    │
│  │ Graph Execution Engine                       │    │
│  │ - DAG scheduling & execution                 │    │
│  │ - Parallel node execution                    │    │
│  │ - Async/await + streaming support            │    │
│  │ - State management & rollback                │    │
│  │ - Retry/fallback/circuit breaker             │    │
│  └──────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────┐    │
│  │ Node Execution Runtime                       │    │
│  │ - Node lifecycle (setup, execute, teardown)  │    │
│  │ - Context injection (secrets, policies)      │    │
│  │ - Error handling & observability              │    │
│  └──────────────────────────────────────────────┘    │
└────────────┬─────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────┐
│         Plugin Layer                                  │
│  ┌──────────────────────────────────────────────┐    │
│  │ Node Registry                                │    │
│  │ - LLM nodes (OpenAI, Anthropic, Local)       │    │
│  │ - Tool nodes (API, function, DataGrid)       │    │
│  │ - Agent nodes (meta-level orchestration)     │    │
│  │ - Memory nodes (vector, document, cache)     │    │
│  │ - Data nodes (DataGrid read/write)           │    │
│  │ - Policy nodes (authorization, validation)   │    │
│  │ - Flow control nodes (condition, loop)       │    │
│  │ - Event nodes (webhook, scheduler)           │    │
│  └──────────────────────────────────────────────┘    │
└────────────┬─────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────┐
│         Integration Layer                             │
│  ┌──────────────────────────────────────────────┐    │
│  │ DataGrid Integration                         │    │
│  │ - Read rows, write rows, bulk operations     │    │
│  ├──────────────────────────────────────────────┤    │
│  │ PolicyGrid Integration                       │    │
│  │ - Check access before node execution         │    │
│  │ - Field-level authorization                  │    │
│  ├──────────────────────────────────────────────┤    │
│  │ External Services                            │    │
│  │ - LLM APIs (OpenAI, Anthropic, Azure)        │    │
│  │ - Vector DBs (Pinecone, Weaviate, Milvus)    │    │
│  │ - REST APIs (webhooks, integrations)         │    │
│  └──────────────────────────────────────────────┘    │
└────────────┬─────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────┐
│         Infrastructure Layer                          │
│  ┌──────────────────────────────────────────────┐    │
│  │ Queue System (Bull/RabbitMQ/Kafka)           │    │
│  │ - Job distribution                           │    │
│  │ - Priority queuing                           │    │
│  │ - Dead-letter handling                       │    │
│  ├──────────────────────────────────────────────┤    │
│  │ State Store (Redis/Postgres)                 │    │
│  │ - Execution context persistence              │    │
│  │ - Distributed locking                        │    │
│  ├──────────────────────────────────────────────┤    │
│  │ Observability (OpenTelemetry)                │    │
│  │ - Distributed tracing                        │    │
│  │ - Metrics (Prometheus)                       │    │
│  │ - Logs (ELK/CloudWatch)                      │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## Node System Design

### IWorkflowNode Interface (Core)

```typescript
// backend/src/core/flowgrid/types/node.ts

export interface IWorkflowNode {
  // ═══════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════

  /** Unique ID within workflow (e.g., "llm-1", "tool-fetch-data") */
  id: string;

  /** Node type (e.g., "llm", "tool", "agent", "memory", "policy") */
  type: NodeType;

  /** Human-readable label */
  label: string;

  /** Node description */
  description?: string;

  /** Semantic category for UI grouping */
  category: NodeCategory;

  /** Version (for plugin evolution) */
  version: string;

  /** Tags for discovery & filtering */
  tags?: string[];

  // ═══════════════════════════════════════════════════════
  // SCHEMA DEFINITIONS
  // ═══════════════════════════════════════════════════════

  /** Input schema (JSON Schema) */
  inputSchema: JSONSchema;

  /** Output schema (JSON Schema) */
  outputSchema: JSONSchema;

  /** Configuration schema (persistent settings) */
  configSchema?: JSONSchema;

  /** Current configuration */
  config?: Record<string, any>;

  // ═══════════════════════════════════════════════════════
  // EXECUTION BEHAVIOR
  // ═══════════════════════════════════════════════════════

  /** Main execution method */
  execute(
    input: Record<string, any>,
    context: ExecutionContext,
  ): Promise<Record<string, any>> | AsyncIterable<Record<string, any>>;

  /** Validate input against schema */
  validate?(input: Record<string, any>): ValidationResult;

  /** Setup hook (before execution) */
  onSetup?(context: ExecutionContext): Promise<void>;

  /** Error handler */
  onError?(error: Error, context: ExecutionContext): ErrorHandlingStrategy;

  /** Completion hook */
  onComplete?(output: Record<string, any>, context: ExecutionContext): Promise<void>;

  // ═══════════════════════════════════════════════════════
  // ADVANCED FEATURES
  // ═══════════════════════════════════════════════════════

  /** Streaming support (e.g., LLM token streaming) */
  supportsStreaming?: boolean;

  /** Stateful execution (preserves state between runs) */
  stateful?: boolean;

  /** Policy constraints (which policies apply) */
  policies?: PolicyConstraint[];

  /** Retry strategy */
  retryStrategy?: RetryStrategy;

  /** Fallback node IDs (if execution fails) */
  fallbacks?: string[];

  /** Circuit breaker configuration */
  circuitBreaker?: CircuitBreakerConfig;

  // ═══════════════════════════════════════════════════════
  // OBSERVABILITY
  // ═══════════════════════════════════════════════════════

  /** Custom metrics to track */
  metrics?: MetricDefinition[];

  /** Semantic reasoning hooks */
  reasoningHooks?: ReasoningHook[];
}

// ═══════════════════════════════════════════════════════
// SUPPORTING TYPES
// ═══════════════════════════════════════════════════════

export enum NodeType {
  LLM = 'llm',
  AGENT = 'agent',
  TOOL = 'tool',
  MEMORY = 'memory',
  DATA = 'data',
  POLICY = 'policy',
  FLOW_CONTROL = 'flow_control',
  EVENT = 'event',
  CUSTOM = 'custom',
}

export enum NodeCategory {
  // LLM nodes
  LLM_OPENAI = 'llm.openai',
  LLM_ANTHROPIC = 'llm.anthropic',
  LLM_LOCAL = 'llm.local',

  // Agent nodes
  AGENT_SUPERVISOR = 'agent.supervisor',
  AGENT_WORKER = 'agent.worker',
  AGENT_COORDINATOR = 'agent.coordinator',

  // Tool nodes
  TOOL_API = 'tool.api',
  TOOL_FUNCTION = 'tool.function',
  TOOL_DATABASE = 'tool.database',
  TOOL_FILE = 'tool.file',

  // Memory nodes
  MEMORY_SHORT_TERM = 'memory.short_term',
  MEMORY_LONG_TERM = 'memory.long_term',
  MEMORY_VECTOR = 'memory.vector',

  // Data nodes
  DATA_GRID_READ = 'data.grid_read',
  DATA_GRID_WRITE = 'data.grid_write',
  DATA_TRANSFORM = 'data.transform',

  // Control nodes
  CONTROL_CONDITION = 'control.condition',
  CONTROL_LOOP = 'control.loop',
  CONTROL_PARALLEL = 'control.parallel',

  // Policy nodes
  POLICY_CHECK = 'policy.check',
  POLICY_VALIDATE = 'policy.validate',
}

export interface ExecutionContext {
  /** Execution ID (unique per run) */
  executionId: string;

  /** Workflow ID */
  workflowId: string;

  /** User context (for auth/tenant isolation) */
  user: {
    id: string;
    tenantId: string;
    roles: string[];
  };

  /** Node outputs from previous executions */
  nodeOutputs: Map<string, any>;

  /** Workflow variables */
  variables: Map<string, any>;

  /** Secrets (credentials, API keys) */
  secrets: Map<string, string>;

  /** Execution metadata */
  metadata: {
    startTime: Date;
    retryCount: number;
    parentNodeId?: string;
    depth: number;
  };

  /** Tracing span for observability */
  span: OpenTelemetrySpan;

  /** Get output from previous node */
  getNodeOutput(nodeId: string): any;

  /** Set variable */
  setVariable(key: string, value: any): void;

  /** Get variable */
  getVariable(key: string): any;

  /** Get secret (decrypted) */
  getSecret(key: string): Promise<string>;

  /** Check policy constraint */
  checkPolicy(policy: PolicyConstraint): Promise<boolean>;

  /** Log operation for audit trail */
  logOperation(operation: string, data: any): void;
}

export interface ValidationResult {
  valid: boolean;
  errors?: Array<{ path: string; message: string }>;
}

export interface ErrorHandlingStrategy {
  action: 'retry' | 'fallback' | 'fail' | 'skip';
  delayMs?: number;
  nodeId?: string; // for fallback
}

export interface RetryStrategy {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  jitterMs?: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // failures before open
  resetTimeoutMs: number;
  moniteredMetric: string; // which metric triggers circuit breaker
}

export interface PolicyConstraint {
  policyId: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface MetricDefinition {
  name: string;
  type: 'counter' | 'histogram' | 'gauge';
  unit?: string;
  description?: string;
}

export interface ReasoningHook {
  event: 'onStart' | 'onData' | 'onError' | 'onComplete';
  prompt: string; // Prompt template for LLM reasoning
}
```

### Node Types & Categories

**1. LLM Nodes**
```typescript
interface LLMNode extends IWorkflowNode {
  type: NodeType.LLM;
  config: {
    provider: 'openai' | 'anthropic' | 'local';
    modelId: string;
    temperature: number;
    maxTokens: number;
    systemPrompt?: string;
  };
  supportsStreaming: true;
}
```

**2. Agent Nodes**
```typescript
interface AgentNode extends IWorkflowNode {
  type: NodeType.AGENT;
  config: {
    agentType: 'supervisor' | 'worker' | 'coordinator';
    capabilities: string[]; // tools agent can use
    strategy: 'reactive' | 'planner' | 'hierarchical';
  };
  reasoningHooks: ReasoningHook[]; // For semantic routing
}
```

**3. Tool Nodes**
```typescript
interface ToolNode extends IWorkflowNode {
  type: NodeType.TOOL;
  config: {
    toolType: 'api' | 'function' | 'database' | 'file';
    endpoint?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    authType?: 'bearer' | 'apikey' | 'oauth2';
  };
}
```

**4. Data Nodes**
```typescript
interface DataNode extends IWorkflowNode {
  type: NodeType.DATA;
  config: {
    operation: 'read' | 'write' | 'transform' | 'aggregate';
    gridId?: string;
    filters?: FilterDefinition[];
  };
}
```

**5. Memory Nodes**
```typescript
interface MemoryNode extends IWorkflowNode {
  type: NodeType.MEMORY;
  config: {
    memoryType: 'short_term' | 'long_term' | 'vector';
    ttl?: number;
    vectorDimension?: number;
  };
  stateful: true;
}
```

---

## Graph Execution Engine

### Execution Model (vs Flowise)

```
Flowise Sequential:
Node-1 → Node-2 → Node-3 → Node-4 (linear, synchronous)

Lume DAG (Parallel):
        ┌─ Node-2 ┐
Node-1 ┤         ├─ Node-5 ┐
        └─ Node-3 ┘         ├─ Node-6
        ┌─ Node-4 ────────┘

Async/Await + Streaming:
Node-1 (LLM) streaming tokens → Node-2 (aggregator) accumulating → Node-3
```

### Execution Algorithm

```typescript
// backend/src/core/flowgrid/engine/graph-executor.ts

export class GraphExecutor {
  /**
   * Execute a workflow graph
   * Supports: parallel execution, async/await, streaming, retry/fallback
   */
  async execute(
    graph: Workflow,
    input: Record<string, any>,
    context: ExecutionContext,
  ): Promise<ExecutionResult> {
    // 1. Topological sort of nodes (identify dependencies)
    const sortedNodes = this.topologicalSort(graph);
    
    // 2. Build execution plan (DAG with execution groups)
    const executionPlan = this.buildExecutionPlan(sortedNodes, graph.edges);
    
    // 3. Execute by groups (parallel where possible)
    for (const nodeGroup of executionPlan) {
      await this.executeNodeGroup(nodeGroup, context, graph);
    }
    
    // 4. Collect outputs from exit nodes
    const result = this.collectResults(context, graph.exitNodes);
    
    // 5. Emit completion event
    this.emitExecutionComplete(context, result);
    
    return result;
  }

  private async executeNodeGroup(
    nodeIds: string[],
    context: ExecutionContext,
    graph: Workflow,
  ): Promise<void> {
    // Execute all nodes in group in parallel
    const executions = nodeIds.map(nodeId =>
      this.executeNode(nodeId, context, graph).catch(error =>
        this.handleNodeError(nodeId, error, context, graph),
      ),
    );

    await Promise.all(executions);
  }

  private async executeNode(
    nodeId: string,
    context: ExecutionContext,
    graph: Workflow,
  ): Promise<void> {
    const node = graph.nodes.get(nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);

    // 1. Setup hooks
    if (node.onSetup) {
      await node.onSetup(context);
    }

    // 2. Prepare input (resolve dependencies from context)
    const input = this.resolveInput(nodeId, context, graph);

    // 3. Validate input
    if (node.validate) {
      const validation = node.validate(input);
      if (!validation.valid) {
        throw new ValidationError(validation.errors);
      }
    }

    // 4. Check policies before execution
    for (const policy of node.policies || []) {
      const allowed = await context.checkPolicy(policy);
      if (!allowed) {
        throw new AuthorizationError(`Policy ${policy.policyId} denied execution`);
      }
    }

    // 5. Execute with retry/fallback
    let output: Record<string, any>;
    try {
      output = await this.executeWithRetry(node, input, context);
    } catch (error) {
      return this.handleNodeError(nodeId, error, context, graph);
    }

    // 6. Completion hooks
    if (node.onComplete) {
      await node.onComplete(output, context);
    }

    // 7. Store output
    context.nodeOutputs.set(nodeId, output);

    // 8. Emit streaming updates (for real-time subscription)
    this.emitNodeComplete(context, nodeId, output);
  }

  private async executeWithRetry(
    node: IWorkflowNode,
    input: Record<string, any>,
    context: ExecutionContext,
  ): Promise<Record<string, any>> {
    const retryStrategy = node.retryStrategy || { maxAttempts: 1 };

    for (let attempt = 0; attempt < retryStrategy.maxAttempts; attempt++) {
      try {
        // Check circuit breaker
        if (node.circuitBreaker && this.isCircuitOpen(node.id)) {
          throw new CircuitBreakerOpenError();
        }

        // Execute node (supports streaming)
        const result = await node.execute(input, context);

        // Handle async iterable (streaming)
        if (result && Symbol.asyncIterator in result) {
          return this.handleStreamingOutput(result, context);
        }

        return result;
      } catch (error) {
        // Last attempt?
        if (attempt === retryStrategy.maxAttempts - 1) {
          throw error;
        }

        // Delay before retry
        const delay = retryStrategy.backoffMs * Math.pow(
          retryStrategy.backoffMultiplier,
          attempt,
        );
        await sleep(delay);

        context.metadata.retryCount++;
      }
    }

    throw new Error('Retry exhausted');
  }

  private async handleNodeError(
    nodeId: string,
    error: Error,
    context: ExecutionContext,
    graph: Workflow,
  ): Promise<void> {
    const node = graph.nodes.get(nodeId);
    if (!node) throw error;

    // Call error handler
    const strategy = node.onError?.(error, context) || {
      action: 'fail',
    };

    switch (strategy.action) {
      case 'retry':
        // Retry already handled by executeWithRetry
        throw error;

      case 'fallback':
        if (strategy.nodeId && node.fallbacks?.includes(strategy.nodeId)) {
          // Execute fallback node
          return this.executeNode(strategy.nodeId, context, graph);
        }
        throw error;

      case 'skip':
        // Store empty output for this node
        context.nodeOutputs.set(nodeId, {});
        return;

      case 'fail':
        throw error;
    }
  }

  private topologicalSort(graph: Workflow): string[] {
    // Kahn's algorithm for DAG topological sort
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    // Initialize
    for (const nodeId of graph.nodes.keys()) {
      inDegree.set(nodeId, 0);
      adjacency.set(nodeId, []);
    }

    // Build graph from edges
    for (const edge of graph.edges) {
      inDegree.set(
        edge.targetId,
        (inDegree.get(edge.targetId) || 0) + 1,
      );
      adjacency.get(edge.sourceId)?.push(edge.targetId);
    }

    // Process nodes with no dependencies
    const queue = Array.from(inDegree.entries())
      .filter(([, degree]) => degree === 0)
      .map(([nodeId]) => nodeId);

    const sorted: string[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      sorted.push(nodeId);

      for (const neighbor of adjacency.get(nodeId) || []) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (sorted.length !== graph.nodes.size) {
      throw new Error('Graph contains cycles');
    }

    return sorted;
  }

  private buildExecutionPlan(
    sortedNodes: string[],
    edges: Edge[],
  ): string[][] {
    // Group nodes that can execute in parallel
    const adjacency = new Map<string, string[]>();
    for (const edge of edges) {
      if (!adjacency.has(edge.sourceId)) {
        adjacency.set(edge.sourceId, []);
      }
      adjacency.get(edge.sourceId)!.push(edge.targetId);
    }

    const plan: string[][] = [];
    const processed = new Set<string>();

    for (const nodeId of sortedNodes) {
      // Check if all dependencies processed
      const canExecute = edges
        .filter(e => e.targetId === nodeId)
        .every(e => processed.has(e.sourceId));

      if (canExecute) {
        // Find if can be added to last group
        const lastGroup = plan[plan.length - 1];
        if (lastGroup && this.canParallelExecute(nodeId, lastGroup, adjacency)) {
          lastGroup.push(nodeId);
        } else {
          plan.push([nodeId]);
        }
        processed.add(nodeId);
      }
    }

    return plan;
  }

  private canParallelExecute(
    nodeId: string,
    otherNodeIds: string[],
    adjacency: Map<string, string[]>,
  ): boolean {
    // Check for data dependencies
    for (const other of otherNodeIds) {
      if (adjacency.get(other)?.includes(nodeId)) {
        return false; // other depends on nodeId
      }
      if (adjacency.get(nodeId)?.includes(other)) {
        return false; // nodeId depends on other
      }
    }
    return true;
  }

  private resolveInput(
    nodeId: string,
    context: ExecutionContext,
    graph: Workflow,
  ): Record<string, any> {
    const input: Record<string, any> = {};

    // Find edges pointing to this node
    for (const edge of graph.edges) {
      if (edge.targetId === nodeId) {
        const sourceOutput = context.nodeOutputs.get(edge.sourceId);
        const value = this.getMappedValue(sourceOutput, edge.mapping);

        // Apply optional transformation
        if (edge.transform) {
          input[edge.mapping.targetField] = edge.transform(value);
        } else {
          input[edge.mapping.targetField] = value;
        }
      }
    }

    return input;
  }

  private async handleStreamingOutput(
    iterable: AsyncIterable<any>,
    context: ExecutionContext,
  ): Promise<Record<string, any>> {
    let accumulated: Record<string, any> = {};

    for await (const chunk of iterable) {
      accumulated = { ...accumulated, ...chunk };
      // Emit streaming updates to subscribers
      this.emitStreamingChunk(context, chunk);
    }

    return accumulated;
  }

  private emitNodeComplete(
    context: ExecutionContext,
    nodeId: string,
    output: any,
  ): void {
    // Publish to Redis/WebSocket for real-time subscriptions
    // Allows frontend to show live progress
  }

  private emitStreamingChunk(
    context: ExecutionContext,
    chunk: any,
  ): void {
    // For LLM nodes, emit tokens as they arrive
  }

  private emitExecutionComplete(
    context: ExecutionContext,
    result: ExecutionResult,
  ): void {
    // Publish final result
  }
}
```

---

## Agent Orchestration Layer (AgentGrid)

### Multi-Agent Architecture

```
┌─────────────────────────────────┐
│    Supervisor Agent             │
│  (Task decomposition, planning)  │
└────────────┬────────────────────┘
             │ Task assignment
    ┌────────┼────────┐
    │        │        │
    ▼        ▼        ▼
┌────────┐┌────────┐┌────────┐
│Worker-1││Worker-2││Worker-3│
│(Tools) ││(Tools) ││(Tools) │
└────────┘└────────┘└────────┘
    │        │        │
    └────────┼────────┘
             │ Results
    ┌────────▼────────┐
    │ Coordinator     │
    │ (Consensus)     │
    └─────────────────┘
```

### Agent Types

**1. Supervisor Agent**
- Task decomposition
- Worker assignment
- Progress tracking
- Adaptive replanning

**2. Worker Agents**
- Specialized executors
- Tool selection
- Error recovery
- Self-improvement

**3. Coordinator Agent**
- Result aggregation
- Consensus mechanism
- Conflict resolution
- Human-in-the-loop escalation

### Agent Orchestration Engine

```typescript
// backend/src/core/flowgrid/orchestration/agent-orchestrator.ts

export class AgentOrchestrator {
  async orchestrateMultiAgent(
    task: WorkflowTask,
    agents: Agent[],
    context: ExecutionContext,
  ): Promise<ExecutionResult> {
    // 1. Supervisor decomposes task
    const subTasks = await this.supervisorAgent.decompose(task, context);

    // 2. Assign to workers
    const assignments = this.assignTasks(subTasks, agents);

    // 3. Execute workers in parallel with memory sharing
    const workerResults = await Promise.all(
      assignments.map(({ agent, subTask }) =>
        this.executeWorkerWithMemorySharing(agent, subTask, context),
      ),
    );

    // 4. Coordinator aggregates & reaches consensus
    const finalResult = await this.coordinatorAgent.aggregate(
      workerResults,
      context,
    );

    return finalResult;
  }

  private async executeWorkerWithMemorySharing(
    agent: Agent,
    task: SubTask,
    context: ExecutionContext,
  ): Promise<SubTaskResult> {
    // Each worker has:
    // - Private memory (task-specific)
    // - Shared memory (accessible to all workers)
    // - Tools registry

    const workerContext = {
      ...context,
      sharedMemory: this.sharedMemoryStore,
      privateMemory: new Map(),
      tools: agent.availableTools,
    };

    return agent.execute(task, workerContext);
  }

  private assignTasks(
    subTasks: SubTask[],
    agents: Agent[],
  ): Array<{ agent: Agent; subTask: SubTask }> {
    // Intelligent assignment based on:
    // - Agent specialization (capabilities)
    // - Current load
    // - Historical success rate
    // - Semantic relevance

    return subTasks.map(task => ({
      agent: this.selectBestAgent(task, agents),
      subTask: task,
    }));
  }

  private selectBestAgent(task: SubTask, agents: Agent[]): Agent {
    // Semantic matching between task & agent capabilities
    let bestAgent = agents[0];
    let bestScore = -Infinity;

    for (const agent of agents) {
      const capabilityScore = this.computeCapabilityScore(task, agent);
      const reliabilityScore = agent.successRate;
      const loadScore = 1 / (agent.currentLoad + 1);

      const totalScore =
        0.5 * capabilityScore +
        0.3 * reliabilityScore +
        0.2 * loadScore;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestAgent = agent;
      }
    }

    return bestAgent;
  }
}

export interface Agent {
  id: string;
  name: string;
  type: 'supervisor' | 'worker' | 'coordinator';
  capabilities: string[];
  successRate: number;
  currentLoad: number;
  tools: Tool[];
  memory: AgentMemory;

  execute(
    task: SubTask,
    context: AgentContext,
  ): Promise<SubTaskResult>;
}

export interface SubTask {
  id: string;
  description: string;
  requirements: string[];
  priority: number;
  estimatedDuration: number;
  requiredTools: string[];
}

export interface AgentMemory {
  shortTerm: Map<string, any>; // Current execution
  longTerm: VectorStore; // Persistent (embeddings)
  shared: DistributedCache; // Shared across agents
}
```

---

## Plugin Architecture

### Node Registry & Hot-Reload

```typescript
// backend/src/core/flowgrid/plugins/node-registry.ts

export class NodeRegistry {
  private nodes = new Map<string, NodeConstructor>();
  private versions = new Map<string, string[]>();

  /**
   * Register a node type
   * Supports versioning & hot-reload
   */
  register(
    nodeType: NodeType,
    version: string,
    constructor: NodeConstructor,
  ): void {
    const key = `${nodeType}@${version}`;
    this.nodes.set(key, constructor);

    if (!this.versions.has(nodeType)) {
      this.versions.set(nodeType, []);
    }
    this.versions.get(nodeType)!.push(version);
  }

  /**
   * Get node constructor (use latest version by default)
   */
  get(nodeType: NodeType, version?: string): NodeConstructor {
    const targetVersion = version || this.getLatestVersion(nodeType);
    const key = `${nodeType}@${targetVersion}`;
    const constructor = this.nodes.get(key);

    if (!constructor) {
      throw new Error(`Node type ${nodeType}@${targetVersion} not found`);
    }

    return constructor;
  }

  /**
   * Hot-reload a node type (for development)
   */
  hotReload(nodeType: NodeType, version: string, constructor: NodeConstructor): void {
    const key = `${nodeType}@${version}`;
    this.nodes.set(key, constructor);
    // Notify dependent workflows
    this.emitReloadEvent(nodeType, version);
  }

  /**
   * List available nodes by category
   */
  listByCategory(category: NodeCategory): NodeMetadata[] {
    return Array.from(this.nodes.values())
      .filter(ctor => ctor.category === category)
      .map(ctor => ({
        type: ctor.type,
        version: ctor.version,
        label: ctor.label,
        description: ctor.description,
      }));
  }

  private getLatestVersion(nodeType: NodeType): string {
    const versions = this.versions.get(nodeType) || [];
    return versions[versions.length - 1] || '1.0.0';
  }
}

/**
 * Plugin System
 * Discover and load nodes from installed packages
 */
export class PluginLoader {
  async loadPlugins(): Promise<void> {
    // Scan node_modules for @lume/flowgrid-* packages
    const pluginDirs = await this.discoverPlugins();

    for (const dir of pluginDirs) {
      const manifest = await this.loadManifest(dir);
      const nodes = await this.loadNodesFromDir(dir);

      for (const node of nodes) {
        const version = manifest.version || '1.0.0';
        this.registry.register(node.type, version, node as any);
      }
    }
  }

  private async discoverPlugins(): Promise<string[]> {
    // Find @lume/flowgrid-* in node_modules
    // Or scan custom plugin directory
  }

  private async loadManifest(dir: string): Promise<PluginManifest> {
    const manifestPath = join(dir, 'plugin.json');
    return JSON.parse(await readFile(manifestPath, 'utf-8'));
  }
}

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  nodes: Array<{
    type: NodeType;
    path: string;
  }>;
  dependencies?: Record<string, string>;
}
```

### Marketplace Structure

```
@lume/flowgrid-core              (Official: LLM, Agent, Tool, Memory nodes)
@lume/flowgrid-data-integration  (DataGrid nodes, connectors)
@lume/flowgrid-llm-providers     (OpenAI, Anthropic, Local LLM)
@lume/flowgrid-vector-db         (Pinecone, Weaviate, Milvus, Chroma)
@lume/flowgrid-tools             (REST API, Slack, Email, Calendar)
@lume/flowgrid-learning          (Self-improving agents, feedback loops)

Custom plugins follow @org/flowgrid-* naming
```

---

## Advanced Features

### 1. Natural Language → Workflow Auto-Generation

```typescript
// backend/src/core/flowgrid/ai/workflow-generator.ts

export class WorkflowGenerator {
  /**
   * Convert natural language to executable workflow
   * "Create a customer support chatbot that answers FAQs and escalates complex issues"
   */
  async generateFromNaturalLanguage(
    description: string,
    context: ExecutionContext,
  ): Promise<Workflow> {
    // 1. LLM analyzes requirements
    const analysis = await this.llm.analyze(description, {
      prompt: WORKFLOW_ANALYSIS_PROMPT,
    });

    // 2. Extract node requirements
    const nodeRequirements = this.parseNodeRequirements(analysis);

    // 3. Generate node configurations
    const nodes = await this.generateNodes(nodeRequirements, context);

    // 4. Generate edges (data flow)
    const edges = this.generateEdges(nodes, description);

    // 5. Validate workflow
    this.validateWorkflow({ nodes, edges });

    return { nodes, edges, metadata: { generatedAt: new Date() } };
  }

  private async generateNodes(
    requirements: NodeRequirement[],
    context: ExecutionContext,
  ): Promise<Map<string, IWorkflowNode>> {
    const nodes = new Map();

    for (const req of requirements) {
      // Select best node type
      const nodeType = this.selectNodeType(req);

      // Generate configuration
      const config = await this.generateConfig(req);

      // Instantiate node
      const node = this.registry.get(nodeType).createInstance({
        id: req.id,
        config,
      });

      nodes.set(req.id, node);
    }

    return nodes;
  }

  private generateEdges(
    nodes: Map<string, IWorkflowNode>,
    description: string,
  ): Edge[] {
    // LLM generates data flow
    // "Chatbot input → FAQ lookup → if found: return answer, else: escalate to supervisor"
  }
}
```

### 2. Self-Evolving Agents (Learning Loops)

```typescript
// backend/src/core/flowgrid/learning/self-improving-agent.ts

export class SelfImprovingAgent extends Agent {
  private feedbackStore: FeedbackStore;
  private learningRate: number = 0.1;

  async executeWithLearning(
    task: SubTask,
    context: AgentContext,
  ): Promise<SubTaskResult> {
    // 1. Execute task
    const result = await super.execute(task, context);

    // 2. Store execution trace
    const trace = context.getExecutionTrace();

    // 3. Generate feedback prompt
    const feedbackPrompt = this.generateFeedbackPrompt(trace, result);

    // 4. LLM provides improvement suggestions
    const improvements = await this.llm.generate(feedbackPrompt);

    // 5. Update strategy for next execution
    const updatedStrategy = this.updateStrategy(
      this.strategy,
      improvements,
      this.learningRate,
    );

    this.strategy = updatedStrategy;

    // 6. Store for future learning
    this.feedbackStore.store({
      task,
      result,
      improvements,
      timestamp: new Date(),
    });

    return result;
  }

  private updateStrategy(
    currentStrategy: any,
    improvements: string,
    rate: number,
  ): any {
    // Parse improvements
    // Blend with current strategy using learning rate
    // Return optimized strategy
  }
}
```

### 3. Cross-Grid Automation (DataGrid + AgentGrid + FlowGrid)

```typescript
// backend/src/core/flowgrid/integration/cross-grid-automation.ts

/**
 * Trigger workflows based on DataGrid changes
 * Execute agents to transform/validate data
 * Store results back in DataGrid
 */
export class CrossGridAutomation {
  async setupDataGridTrigger(
    gridId: string,
    workflow: Workflow,
    onEvent: 'create' | 'update' | 'delete',
  ): Promise<void> {
    // Listen to DataGrid changes
    this.dataGridService.onRowChange(gridId, async (row, event) => {
      if (event.type !== onEvent) return;

      // 1. Execute workflow with row data
      const context = this.createContext(row);
      const result = await this.graphExecutor.execute(
        workflow,
        { row },
        context,
      );

      // 2. Store result back in DataGrid (if configured)
      if (workflow.config.storeResultInGrid) {
        await this.dataGridService.updateRow(gridId, row.id, result);
      }

      // 3. Check policies (PolicyGrid)
      const allowed = await this.policyService.checkAccess(
        context.user,
        'write',
        gridId,
      );

      if (!allowed) {
        throw new AuthorizationError('Not allowed to write results');
      }
    });
  }
}
```

---

## Next Sections in Part 2

- **GraphQL Integration Design**
- **UI Binding & Canvas System**
- **Observability & Debugging Framework**
- **Performance & Scaling**
- **Complete Implementation Examples**

---

**Version:** 2.0  
**Status:** Architecture Complete  
**Last Updated:** May 2026
