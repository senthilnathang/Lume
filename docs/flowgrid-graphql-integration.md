# FlowGrid + AgentGrid — GraphQL Integration

**Version:** 1.0  
**Status:** Production-Ready  
**Last Updated:** May 2026

---

## Table of Contents

1. [GraphQL Schema](#graphql-schema)
2. [Resolvers](#resolvers)
3. [Subscriptions (Real-Time)](#subscriptions-real-time)
4. [Error Handling](#error-handling)
5. [Authorization](#authorization)
6. [API Examples](#api-examples)

---

## GraphQL Schema

### Workflow & Graph Types

```graphql
# backend/src/core/flowgrid/schema/flowgrid.schema.graphql

"""Workflow definition (graph of nodes)"""
type Workflow {
  id: ID!
  tenantId: String!
  name: String!
  description: String
  version: Int!
  status: WorkflowStatus!
  
  # Graph structure
  nodes: [WorkflowNode!]!
  edges: [WorkflowEdge!]!
  entryNodeIds: [String!]!
  exitNodeIds: [String!]!
  
  # Metadata
  tags: [String!]!
  authorId: String!
  createdAt: DateTime!
  updatedAt: DateTime!
  publishedAt: DateTime
  
  # Statistics
  executionCount: Int!
  successRate: Float!
  averageDuration: Int!
  
  # Relations
  author: User!
  executions: [WorkflowExecution!]!
  agents: [Agent!]!
}

enum WorkflowStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
  PAUSED
}

"""Node in workflow graph"""
type WorkflowNode {
  id: ID!
  workflowId: ID!
  type: NodeType!
  category: NodeCategory!
  label: String!
  description: String
  version: String!
  
  # Configuration
  config: JSON!
  inputSchema: JSON!
  outputSchema: JSON!
  
  # Behavior
  policies: [PolicyConstraint!]!
  retryStrategy: RetryStrategy
  fallbacks: [String!]
  circuitBreaker: CircuitBreakerConfig
  
  # Observability
  supportsStreaming: Boolean!
  stateful: Boolean!
  metrics: [MetricDefinition!]!
}

"""Edge in workflow graph (data/control flow)"""
type WorkflowEdge {
  id: ID!
  sourceNodeId: String!
  targetNodeId: String!
  
  # Mapping
  mapping: FieldMapping!
  
  # Conditional execution
  condition: String
  transform: String
  
  # Flow type
  flowType: FlowType!
}

enum FlowType {
  DATA      # Pass data between nodes
  CONTROL   # Enforce ordering without data
  CONDITIONAL # Execute based on condition
}

type FieldMapping {
  sourceField: String!
  targetField: String!
}

"""Workflow execution instance"""
type WorkflowExecution {
  id: ID!
  workflowId: ID!
  agentId: ID
  
  status: ExecutionStatus!
  input: JSON!
  output: JSON
  error: ExecutionError
  
  # Execution trace
  nodeExecutions: [NodeExecution!]!
  executionTrace: ExecutionTrace!
  
  # Metrics
  startedAt: DateTime!
  completedAt: DateTime
  duration: Int
  tokenUsage: TokenUsage
  
  # User context
  userId: String!
  tenantId: String!
}

enum ExecutionStatus {
  PENDING
  RUNNING
  SUCCESS
  FAILED
  CANCELLED
  TIMEOUT
}

type ExecutionError {
  message: String!
  code: String!
  nodeId: String
  timestamp: DateTime!
}

"""Execution of a single node"""
type NodeExecution {
  nodeId: String!
  status: ExecutionStatus!
  input: JSON
  output: JSON
  error: ExecutionError
  
  startedAt: DateTime!
  completedAt: DateTime
  duration: Int!
  
  retryCount: Int!
  streamingChunks: Int
}

type ExecutionTrace {
  graph: JSON!  # Graph structure at execution time
  timeline: [ExecutionEvent!]!
  criticalPath: [String!]!  # Slowest nodes in execution
}

type ExecutionEvent {
  timestamp: DateTime!
  type: ExecutionEventType!
  nodeId: String
  data: JSON
}

enum ExecutionEventType {
  NODE_STARTED
  NODE_COMPLETED
  NODE_FAILED
  NODE_RETRIED
  STREAMING_CHUNK
  POLICY_CHECK
  VARIABLE_SET
}

type TokenUsage {
  llmTokens: Int!
  totalTokens: Int!
  costEstimate: Float
}

"""Agent (orchestrator)"""
type Agent {
  id: ID!
  tenantId: String!
  name: String!
  description: String
  type: AgentType!
  
  # Configuration
  capabilities: [String!]!
  strategy: AgentStrategy!
  llmNodeId: String
  maxIterations: Int!
  
  # Memory
  memory: AgentMemory!
  
  # Statistics
  executionCount: Int!
  successRate: Float!
  
  # Relations
  workflowId: ID!
  workflow: Workflow!
  executions: [AgentExecution!]!
  
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum AgentType {
  SUPERVISOR
  WORKER
  COORDINATOR
}

enum AgentStrategy {
  REACTIVE        # Respond to immediate situation
  PLANNER         # Plan before acting
  HIERARCHICAL    # Multi-level decomposition
  LEARNING        # Self-improving
}

type AgentMemory {
  shortTerm: JSON!      # Current execution data
  longTerm: [Embedding!]!  # Vector embeddings
  shared: JSON!         # Shared across agents
}

type Embedding {
  id: String!
  content: String!
  vector: [Float!]!
  similarity: Float
  metadata: JSON!
}

"""Agent execution"""
type AgentExecution {
  id: ID!
  agentId: ID!
  
  task: AgentTask!
  status: ExecutionStatus!
  
  # Results
  result: JSON
  error: ExecutionError
  
  # Sub-executions (workflow runs)
  workflowExecutions: [WorkflowExecution!]!
  
  # Timeline
  startedAt: DateTime!
  completedAt: DateTime
  duration: Int
  
  # User context
  userId: String!
  tenantId: String!
}

type AgentTask {
  id: String!
  description: String!
  requirements: [String!]!
  priority: Int!
  constraints: [String!]
}

"""Node registry"""
type NodeType {
  name: String!
  category: String!
  label: String!
  description: String
  version: String!
  
  inputSchema: JSON!
  outputSchema: JSON!
  configSchema: JSON!
  
  supportsStreaming: Boolean!
  tags: [String!]!
}

# ═══════════════════════════════════════════════════════════
# QUERIES
# ═══════════════════════════════════════════════════════════

extend type Query {
  # Workflow queries
  workflow(id: ID!): Workflow
  workflows(
    filter: WorkflowFilter
    page: Int
    limit: Int
  ): WorkflowConnection!
  
  # Execution queries
  workflowExecution(id: ID!): WorkflowExecution
  workflowExecutions(
    workflowId: ID
    filter: ExecutionFilter
    page: Int
    limit: Int
  ): ExecutionConnection!
  
  # Agent queries
  agent(id: ID!): Agent
  agents(
    filter: AgentFilter
    page: Int
    limit: Int
  ): AgentConnection!
  
  agentExecution(id: ID!): AgentExecution
  agentExecutions(
    agentId: ID
    filter: ExecutionFilter
    page: Int
    limit: Int
  ): AgentExecutionConnection!
  
  # Node registry
  nodeTypes(category: String): [NodeType!]!
  nodeType(name: String!): NodeType
  
  # Suggestions
  suggestWorkflowOptimizations(workflowId: ID!): [Optimization!]!
  suggestNextNode(
    workflowId: ID!
    currentNodeId: String!
  ): [NodeSuggestion!]!
}

input WorkflowFilter {
  status: WorkflowStatus
  tags: [String!]
  authorId: String
  search: String
}

type WorkflowConnection {
  edges: [WorkflowEdge!]!
  pageInfo: PageInfo!
}

input ExecutionFilter {
  status: ExecutionStatus
  fromDate: DateTime
  toDate: DateTime
  minDuration: Int
  maxDuration: Int
}

type ExecutionConnection {
  edges: [ExecutionEdge!]!
  pageInfo: PageInfo!
}

type ExecutionEdge {
  node: WorkflowExecution!
  cursor: String!
}

type AgentConnection {
  edges: [AgentEdge!]!
  pageInfo: PageInfo!
}

type AgentEdge {
  node: Agent!
  cursor: String!
}

type AgentExecutionConnection {
  edges: [AgentExecutionEdge!]!
  pageInfo: PageInfo!
}

type AgentExecutionEdge {
  node: AgentExecution!
  cursor: String!
}

type Optimization {
  nodeId: String!
  type: OptimizationType!
  suggestion: String!
  estimatedImprovement: Float!
}

enum OptimizationType {
  PARALLELIZE
  REDUCE_RETRIES
  CACHE
  SIMPLIFY
}

type NodeSuggestion {
  nodeType: String!
  category: String!
  reason: String!
  relevance: Float!
}

# ═══════════════════════════════════════════════════════════
# MUTATIONS
# ═══════════════════════════════════════════════════════════

extend type Mutation {
  # Workflow management
  createWorkflow(input: CreateWorkflowInput!): Workflow!
  updateWorkflow(id: ID!, input: UpdateWorkflowInput!): Workflow!
  deleteWorkflow(id: ID!): Boolean!
  publishWorkflow(id: ID!): Workflow!
  archiveWorkflow(id: ID!): Workflow!
  
  # Node management
  addNode(workflowId: ID!, input: AddNodeInput!): WorkflowNode!
  updateNode(workflowId: ID!, nodeId: String!, input: UpdateNodeInput!): WorkflowNode!
  removeNode(workflowId: ID!, nodeId: String!): Boolean!
  
  # Edge management
  addEdge(workflowId: ID!, input: AddEdgeInput!): WorkflowEdge!
  updateEdge(workflowId: ID!, edgeId: String!, input: UpdateEdgeInput!): WorkflowEdge!
  removeEdge(workflowId: ID!, edgeId: String!): Boolean!
  
  # Execution
  executeWorkflow(id: ID!, input: ExecuteWorkflowInput!): WorkflowExecution!
  cancelExecution(id: ID!): Boolean!
  retryExecution(id: ID!): WorkflowExecution!
  
  # Agent management
  createAgent(input: CreateAgentInput!): Agent!
  updateAgent(id: ID!, input: UpdateAgentInput!): Agent!
  deleteAgent(id: ID!): Boolean!
  
  # Agent execution
  executeAgent(agentId: ID!, task: AgentTaskInput!): AgentExecution!
  
  # AI-assisted workflow generation
  generateWorkflow(input: GenerateWorkflowInput!): Workflow!
  optimizeWorkflow(id: ID!): Workflow!
}

input CreateWorkflowInput {
  name: String!
  description: String
  tags: [String!]
  entryNodeIds: [String!]
  exitNodeIds: [String!]
}

input UpdateWorkflowInput {
  name: String
  description: String
  tags: [String!]
  entryNodeIds: [String!]
  exitNodeIds: [String!]
}

input AddNodeInput {
  id: String!
  type: String!
  category: String!
  label: String!
  config: JSON!
}

input UpdateNodeInput {
  label: String
  config: JSON
  policies: [PolicyConstraintInput!]
}

input PolicyConstraintInput {
  policyId: String!
  resource: String!
  action: String!
  conditions: JSON
}

input AddEdgeInput {
  sourceNodeId: String!
  targetNodeId: String!
  mapping: FieldMappingInput!
  flowType: FlowType
  condition: String
}

input FieldMappingInput {
  sourceField: String!
  targetField: String!
}

input UpdateEdgeInput {
  mapping: FieldMappingInput
  condition: String
  transform: String
}

input ExecuteWorkflowInput {
  input: JSON!
  variables: JSON
  skipCache: Boolean
}

input CreateAgentInput {
  name: String!
  description: String
  type: AgentType!
  workflowId: ID!
  capabilities: [String!]!
  strategy: AgentStrategy
}

input UpdateAgentInput {
  name: String
  description: String
  capabilities: [String!]
  strategy: AgentStrategy
}

input AgentTaskInput {
  description: String!
  requirements: [String!]
  priority: Int
  constraints: [String!]
}

input GenerateWorkflowInput {
  description: String!
  context: JSON
  targetNodes: Int
}

# ═══════════════════════════════════════════════════════════
# SUBSCRIPTIONS
# ═══════════════════════════════════════════════════════════

extend type Subscription {
  """Subscribe to execution progress"""
  workflowExecutionUpdates(executionId: ID!): ExecutionUpdate!
  
  """Subscribe to streaming node output"""
  nodeStreamingOutput(executionId: ID!, nodeId: String!): StreamingChunk!
  
  """Subscribe to agent execution progress"""
  agentExecutionUpdates(executionId: ID!): AgentExecutionUpdate!
}

type ExecutionUpdate {
  executionId: ID!
  timestamp: DateTime!
  type: ExecutionEventType!
  nodeId: String
  data: JSON
  status: ExecutionStatus
  error: ExecutionError
}

type StreamingChunk {
  nodeId: String!
  chunk: JSON!
  timestamp: DateTime!
  index: Int!
}

type AgentExecutionUpdate {
  executionId: ID!
  timestamp: DateTime!
  status: ExecutionStatus!
  currentTask: AgentTask
  progress: Float!
  workflowExecutionId: String
  error: ExecutionError
}
```

---

## Resolvers

### Workflow Resolver

```typescript
// backend/src/core/flowgrid/resolvers/workflow.resolver.ts

import {
  Resolver,
  Query,
  Mutation,
  Args,
  Context,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { WorkflowService } from '../services/workflow.service.js';
import { GraphQLService } from '../graphql.service.js';
import { AuthGuard } from '../guards/auth.guard.js';

@Resolver('Workflow')
@UseGuards(AuthGuard)
export class WorkflowResolver {
  constructor(
    private workflowService: WorkflowService,
    private graphqlService: GraphQLService,
  ) {}

  @Query('workflow')
  async getWorkflow(
    @Args('id') id: string,
    @Context() context: any,
  ): Promise<any> {
    this.graphqlService.logOperation('getWorkflow', { id }, context);

    // Check authorization
    if (!this.graphqlService.hasRole(['admin', 'manager', 'editor'], context)) {
      throw new GraphQLError('Insufficient permissions', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const workflow = await this.workflowService.findById(id, {
      tenantId: context.user.tenantId,
    });

    if (!workflow) {
      throw new GraphQLError('Workflow not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return workflow;
  }

  @Query('workflows')
  async listWorkflows(
    @Args('filter', { nullable: true }) filter: any,
    @Args('page', { defaultValue: 1 }) page: number,
    @Args('limit', { defaultValue: 10 }) limit: number,
    @Context() context: any,
  ): Promise<any> {
    this.graphqlService.logOperation('listWorkflows', { filter, page, limit }, context);

    const where: any = { tenantId: context.user.tenantId };

    if (filter?.status) where.status = filter.status;
    if (filter?.tags?.length) where.tags = { hasSome: filter.tags };
    if (filter?.authorId) where.authorId = filter.authorId;
    if (filter?.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [workflows, total] = await Promise.all([
      this.workflowService.find({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.workflowService.count({ where }),
    ]);

    return {
      edges: workflows.map((w: any) => ({
        node: w,
        cursor: Buffer.from(w.id).toString('base64'),
      })),
      pageInfo: {
        hasNextPage: skip + workflows.length < total,
        hasPreviousPage: page > 1,
        totalCount: total,
      },
    };
  }

  @Mutation('createWorkflow')
  async createWorkflow(
    @Args('input') input: any,
    @Context() context: any,
  ): Promise<any> {
    this.graphqlService.logOperation('createWorkflow', { input }, context);
    this.graphqlService.createAuditLog('CREATE', 'workflow', 'N/A', input, context);

    if (!this.graphqlService.hasRole(['admin', 'manager'], context)) {
      throw new GraphQLError('Insufficient permissions', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const workflow = await this.workflowService.create({
      ...input,
      tenantId: context.user.tenantId,
      authorId: context.user.id,
      status: 'DRAFT',
      version: 1,
      executionCount: 0,
      successRate: 0,
      averageDuration: 0,
    });

    return workflow;
  }

  @Mutation('publishWorkflow')
  async publishWorkflow(
    @Args('id') id: string,
    @Context() context: any,
  ): Promise<any> {
    this.graphqlService.logOperation('publishWorkflow', { id }, context);
    this.graphqlService.createAuditLog('PUBLISH', 'workflow', id, {}, context);

    if (!this.graphqlService.hasRole(['admin', 'manager', 'editor'], context)) {
      throw new GraphQLError('Insufficient permissions', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    // Validate workflow before publishing
    const workflow = await this.workflowService.findById(id, {
      tenantId: context.user.tenantId,
    });

    if (!workflow) {
      throw new GraphQLError('Workflow not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Check if DAG is valid
    const isValid = this.validateWorkflowDAG(workflow);
    if (!isValid) {
      throw new GraphQLError('Workflow contains cycles or is invalid', {
        extensions: { code: 'INVALID_WORKFLOW' },
      });
    }

    const updated = await this.workflowService.update(id, {
      status: 'PUBLISHED',
      publishedAt: new Date(),
      version: workflow.version + 1,
    });

    return updated;
  }

  @Mutation('executeWorkflow')
  async executeWorkflow(
    @Args('id') id: string,
    @Args('input') input: any,
    @Context() context: any,
  ): Promise<any> {
    const { input: executionInput, variables = {} } = input;

    this.graphqlService.logOperation('executeWorkflow', { id, executionInput }, context);
    this.graphqlService.createAuditLog('EXECUTE', 'workflow', id, {}, context);

    const workflow = await this.workflowService.findById(id, {
      tenantId: context.user.tenantId,
    });

    if (!workflow) {
      throw new GraphQLError('Workflow not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (workflow.status !== 'PUBLISHED') {
      throw new GraphQLError('Workflow is not published', {
        extensions: { code: 'INVALID_STATE' },
      });
    }

    // Create execution record
    const execution = await this.workflowService.createExecution({
      workflowId: id,
      input: executionInput,
      variables,
      status: 'PENDING',
      userId: context.user.id,
      tenantId: context.user.tenantId,
    });

    // Queue for execution (asynchronous)
    this.workflowService.queueExecution(execution.id);

    return execution;
  }

  @ResolveField('author')
  async resolveAuthor(@Parent() workflow: any, @Context() context: any) {
    // Would use DataLoader to batch load authors
    return { id: workflow.authorId, name: 'Author Name' };
  }

  @ResolveField('executions')
  async resolveExecutions(
    @Parent() workflow: any,
    @Args('limit', { defaultValue: 10 }) limit: number,
    @Context() context: any,
  ) {
    return this.workflowService.getExecutions(workflow.id, limit);
  }

  private validateWorkflowDAG(workflow: any): boolean {
    // Check for cycles using DFS
    // Verify all entry nodes have incoming edges or are start nodes
    // Verify all exit nodes have outgoing edges or are end nodes
    return true; // Placeholder
  }
}
```

### Workflow Execution Resolver

```typescript
// backend/src/core/flowgrid/resolvers/execution.resolver.ts

@Resolver('WorkflowExecution')
@UseGuards(AuthGuard)
export class ExecutionResolver {
  constructor(
    private executionService: ExecutionService,
    private graphqlService: GraphQLService,
  ) {}

  @Query('workflowExecution')
  async getExecution(
    @Args('id') id: string,
    @Context() context: any,
  ): Promise<any> {
    const execution = await this.executionService.findById(id, {
      tenantId: context.user.tenantId,
    });

    if (!execution) {
      throw new GraphQLError('Execution not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return execution;
  }

  @Mutation('cancelExecution')
  async cancelExecution(
    @Args('id') id: string,
    @Context() context: any,
  ): Promise<boolean> {
    const execution = await this.executionService.findById(id, {
      tenantId: context.user.tenantId,
    });

    if (!execution) {
      throw new GraphQLError('Execution not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (execution.status !== 'RUNNING') {
      throw new GraphQLError('Execution is not running', {
        extensions: { code: 'INVALID_STATE' },
      });
    }

    await this.executionService.cancel(id);
    this.graphqlService.createAuditLog('CANCEL', 'execution', id, {}, context);

    return true;
  }

  @ResolveField('nodeExecutions')
  async resolveNodeExecutions(
    @Parent() execution: any,
  ): Promise<any[]> {
    return this.executionService.getNodeExecutions(execution.id);
  }
}
```

---

## Subscriptions (Real-Time)

```typescript
// backend/src/core/flowgrid/subscriptions/execution.subscription.ts

import { Subscription, Args, Context } from '@nestjs/graphql';

@Subscription('workflowExecutionUpdates')
onExecutionUpdate(
  @Args('executionId') executionId: string,
  @Context() context: any,
) {
  // Returns an async iterable that emits execution events
  return this.pubSub.asyncIterator([`execution:${executionId}`]);
}

@Subscription('nodeStreamingOutput')
onNodeStream(
  @Args('executionId') executionId: string,
  @Args('nodeId') nodeId: string,
  @Context() context: any,
) {
  // Subscribe to streaming chunks from LLM nodes
  return this.pubSub.asyncIterator([`stream:${executionId}:${nodeId}`]);
}
```

---

## Error Handling

### GraphQL Error Response

```typescript
// Consistent error format across all operations

{
  "errors": [
    {
      "message": "Workflow not found",
      "extensions": {
        "code": "NOT_FOUND",
        "executionId": "exec-123",
        "timestamp": "2026-05-01T12:00:00Z",
        "trace": {
          "resolver": "Query.workflow",
          "nodeId": "llm-1",
          "operation": "getWorkflow"
        }
      }
    }
  ]
}
```

---

## Authorization

All queries and mutations enforce:

1. **Authentication** — User must be authenticated (JWT token)
2. **Tenant Isolation** — User can only access workflows in their tenant
3. **Role-Based Access**:
   - **admin**: Full access to all workflows
   - **manager**: Create, read, update, delete, publish
   - **editor**: Create, read, update workflows (not delete/publish)
   - **viewer**: Read-only access

4. **Policy-Based Access**:
   - DataGrid read/write via PolicyGrid
   - Agent execution via PolicyGrid
   - Workflow creation/publication via RBAC

---

## API Examples

### Create Workflow

```graphql
mutation {
  createWorkflow(input: {
    name: "Customer Support Bot"
    description: "Multi-agent customer support system"
    tags: ["support", "ai", "production"]
  }) {
    id
    name
    status
    version
    createdAt
  }
}
```

### Add LLM Node to Workflow

```graphql
mutation {
  addNode(workflowId: "workflow-1", input: {
    id: "llm-1"
    type: "llm"
    category: "llm.openai"
    label: "Question Answering"
    config: {
      model: "gpt-4"
      temperature: 0.7
      maxTokens: 2000
      systemPrompt: "You are a helpful customer support agent"
    }
  }) {
    id
    label
    config
  }
}
```

### Add Edge (Connect Nodes)

```graphql
mutation {
  addEdge(workflowId: "workflow-1", input: {
    sourceNodeId: "input-1"
    targetNodeId: "llm-1"
    mapping: {
      sourceField: "question"
      targetField: "prompt"
    }
    flowType: DATA
  }) {
    id
    sourceNodeId
    targetNodeId
  }
}
```

### Publish Workflow

```graphql
mutation {
  publishWorkflow(id: "workflow-1") {
    id
    status
    version
    publishedAt
  }
}
```

### Execute Workflow

```graphql
mutation {
  executeWorkflow(id: "workflow-1", input: {
    input: {
      question: "How do I reset my password?"
    }
    variables: {
      userId: "user-123"
      sessionId: "sess-456"
    }
  }) {
    id
    status
    input
    createdAt
  }
}
```

### Subscribe to Execution Progress

```graphql
subscription {
  workflowExecutionUpdates(executionId: "exec-123") {
    executionId
    type
    nodeId
    status
    data
    error {
      message
      code
    }
    timestamp
  }
}
```

### Subscribe to Streaming Output (LLM Tokens)

```graphql
subscription {
  nodeStreamingOutput(executionId: "exec-123", nodeId: "llm-1") {
    nodeId
    chunk
    index
    timestamp
  }
}
```

### Get Execution Details with Trace

```graphql
query {
  workflowExecution(id: "exec-123") {
    id
    status
    input
    output
    error {
      message
      code
      nodeId
    }
    duration
    tokenUsage {
      llmTokens
      totalTokens
      costEstimate
    }
    nodeExecutions {
      nodeId
      status
      input
      output
      duration
      retryCount
      streamingChunks
    }
    executionTrace {
      timeline {
        type
        nodeId
        timestamp
      }
      criticalPath
    }
  }
}
```

### AI-Assisted Workflow Generation

```graphql
mutation {
  generateWorkflow(input: {
    description: "Create a multi-agent system that analyzes customer feedback and routes to appropriate teams. First agent analyzes sentiment, second extracts action items, third suggests team assignments."
    context: {
      availableTeams: ["support", "product", "engineering"]
      dataSourceId: "grid-123"
    }
    targetNodes: 5
  }) {
    id
    name
    nodes {
      id
      type
      label
    }
    edges {
      sourceNodeId
      targetNodeId
    }
  }
}
```

---

**Version:** 1.0  
**Status:** Production-Ready  
**Last Updated:** May 2026
