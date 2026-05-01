# FlowGrid — Complete Implementation Examples

**Version:** 1.0  
**Status:** Production-Ready Examples  
**Last Updated:** May 2026

---

## Table of Contents

1. [Example 1: Multi-Agent Customer Support Bot](#example-1-multi-agent-customer-support-bot)
2. [Example 2: Data ETL Pipeline with Validation](#example-2-data-etl-pipeline-with-validation)
3. [Example 3: AI-Powered Sentiment Analysis & Routing](#example-3-ai-powered-sentiment-analysis--routing)
4. [Example 4: Learning Loop (Self-Improving Agent)](#example-4-learning-loop-self-improving-agent)
5. [Example 5: Cross-Grid Automation](#example-5-cross-grid-automation)
6. [Deployment & Operations](#deployment--operations)

---

## Example 1: Multi-Agent Customer Support Bot

### Workflow Diagram

```
┌─────────────────────┐
│  User Input         │
│  (Customer Question)│
└────────────┬────────┘
             │
             ▼
┌─────────────────────┐
│ Supervisor Agent    │
│ (Task Decomposition)│
└────┬────────────────┘
     │
     ├─ "Extract Intent" ──────────┐
     ├─ "Search FAQ"  ──────────┐  │
     └─ "Determine Routing" ───┐│  │
                               ││  │
                 ┌─────────────┘│  │
                 │              │  │
                 ▼              ▼  ▼
        ┌──────────────┐┌──────────────┐┌───────────────┐
        │ FAQ Lookup   ││ Sentiment    ││ Agent Router  │
        │ Worker       ││ Analysis     ││ Worker        │
        └──────┬───────┘└──────┬───────┘└───────┬───────┘
               │               │                │
               └───────────────┼────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │ Coordinator      │
                    │ (Consensus/      │
                    │  Aggregation)    │
                    └──────┬───────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │ Final Response   │
                    │ or Escalation    │
                    └──────────────────┘
```

### Implementation Code

```typescript
// Customer Support Workflow
const supportWorkflow = {
  id: 'support-bot-v1',
  name: 'Multi-Agent Customer Support',
  description: 'Handles customer inquiries with multi-agent orchestration',
  
  nodes: [
    // Input node (virtual)
    {
      id: 'input',
      type: 'input',
      label: 'Customer Input',
      outputSchema: { question: 'string', context: 'object' }
    },
    
    // Supervisor agent
    {
      id: 'supervisor',
      type: 'agent',
      category: 'agent.supervisor',
      label: 'Supervisor Agent',
      config: {
        llmNodeId: 'llm-supervisor',
        maxSubTasks: 3,
        strategy: 'hierarchical'
      }
    },
    
    // Supervisor's LLM
    {
      id: 'llm-supervisor',
      type: 'llm',
      category: 'llm.openai',
      label: 'Supervisor Decision LLM',
      config: {
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 500,
        systemPrompt: `You are a supervisor agent managing customer support.
        Decompose the customer question into parallel subtasks:
        1. FAQ Search - can this be answered from knowledge base?
        2. Sentiment Analysis - is customer frustrated?
        3. Escalation Check - does this need human intervention?`
      }
    },
    
    // Worker 1: FAQ Lookup
    {
      id: 'worker-faq',
      type: 'agent',
      category: 'agent.worker',
      label: 'FAQ Lookup Worker',
      config: {
        capabilities: ['search_knowledge_base', 'retrieve_faq'],
        llmNodeId: 'llm-worker-faq',
        maxIterations: 3
      }
    },
    
    {
      id: 'llm-worker-faq',
      type: 'llm',
      category: 'llm.openai',
      label: 'FAQ Worker LLM',
      config: {
        model: 'gpt-3.5-turbo',
        temperature: 0.1,
        maxTokens: 1000
      }
    },
    
    {
      id: 'tool-faq-search',
      type: 'tool',
      category: 'tool.database',
      label: 'Search FAQ Database',
      config: {
        gridId: 'faq-grid',
        operation: 'search'
      }
    },
    
    // Worker 2: Sentiment Analysis
    {
      id: 'tool-sentiment',
      type: 'tool',
      category: 'tool.api',
      label: 'Sentiment Analysis API',
      config: {
        baseUrl: 'https://api.sentiment.example.com',
        endpoint: '/analyze',
        method: 'POST',
        authType: 'apikey'
      }
    },
    
    // Worker 3: Escalation Checker
    {
      id: 'llm-escalation',
      type: 'llm',
      category: 'llm.openai',
      label: 'Escalation Evaluator',
      config: {
        model: 'gpt-3.5-turbo',
        temperature: 0.1,
        maxTokens: 200,
        systemPrompt: 'Determine if this issue needs human agent escalation.'
      }
    },
    
    // Coordinator agent
    {
      id: 'coordinator',
      type: 'agent',
      category: 'agent.coordinator',
      label: 'Coordinator Agent',
      config: {
        llmNodeId: 'llm-coordinator',
        strategy: 'consensus'
      }
    },
    
    {
      id: 'llm-coordinator',
      type: 'llm',
      category: 'llm.openai',
      label: 'Coordinator Decision LLM',
      config: {
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 1500,
        systemPrompt: `You are a coordinator agent.
        Aggregate results from workers:
        1. Did FAQ lookup find an answer?
        2. What is the sentiment?
        3. Should we escalate?
        
        Decision logic:
        - FAQ found + neutral/positive sentiment -> return FAQ answer
        - Negative sentiment + complex issue -> escalate
        - Otherwise -> return best agent response`
      }
    },
    
    // Escalation node (transfer to human)
    {
      id: 'escalate-to-human',
      type: 'tool',
      category: 'tool.api',
      label: 'Escalate to Human Agent',
      config: {
        endpoint: 'https://crm.example.com/escalate',
        method: 'POST'
      }
    },
    
    // Output nodes
    {
      id: 'output-faq',
      type: 'output',
      label: 'Output: FAQ Answer'
    },
    
    {
      id: 'output-escalation',
      type: 'output',
      label: 'Output: Escalation Ticket'
    }
  ],
  
  edges: [
    // Supervisor receives input
    { sourceId: 'input', targetId: 'supervisor', flowType: 'DATA' },
    
    // Supervisor triggers workers
    { sourceId: 'supervisor', targetId: 'worker-faq', flowType: 'DATA' },
    { sourceId: 'supervisor', targetId: 'tool-sentiment', flowType: 'DATA' },
    { sourceId: 'supervisor', targetId: 'llm-escalation', flowType: 'DATA' },
    
    // FAQ worker's tools
    { sourceId: 'worker-faq', targetId: 'llm-worker-faq', flowType: 'DATA' },
    { sourceId: 'llm-worker-faq', targetId: 'tool-faq-search', flowType: 'DATA' },
    
    // Coordinator aggregates
    { sourceId: 'tool-faq-search', targetId: 'coordinator', flowType: 'DATA' },
    { sourceId: 'tool-sentiment', targetId: 'coordinator', flowType: 'DATA' },
    { sourceId: 'llm-escalation', targetId: 'coordinator', flowType: 'DATA' },
    
    // Coordinator outputs
    {
      sourceId: 'coordinator',
      targetId: 'output-faq',
      flowType: 'DATA',
      condition: 'faq_found && sentiment !== "negative"'
    },
    {
      sourceId: 'coordinator',
      targetId: 'escalate-to-human',
      flowType: 'DATA',
      condition: 'needs_escalation || sentiment === "very_negative"'
    }
  ]
};
```

### Execution Flow

```graphql
mutation {
  executeWorkflow(id: "support-bot-v1", input: {
    input: {
      question: "How do I reset my password?"
      context: {
        userId: "user-123"
        accountAge: 3600
      }
    }
  }) {
    id
    status
    createdAt
  }
}

subscription {
  workflowExecutionUpdates(executionId: "exec-abc123") {
    type
    nodeId
    status
    data
    timestamp
  }
}
```

---

## Example 2: Data ETL Pipeline with Validation

### Workflow: Load → Transform → Validate → Store

```typescript
const etlWorkflow = {
  id: 'etl-pipeline-v2',
  name: 'ETL Pipeline with Validation',
  description: 'Load data, transform, validate against schema, store in DataGrid',
  
  nodes: [
    // Source data node
    {
      id: 'source-api',
      type: 'tool',
      category: 'tool.api',
      label: 'Fetch Data from API',
      config: {
        baseUrl: 'https://api.datasource.example.com',
        endpoint: '/customers',
        method: 'GET',
        timeout: 30000
      }
    },
    
    // Transform node (via LLM!)
    {
      id: 'transformer-llm',
      type: 'llm',
      category: 'llm.openai',
      label: 'Schema Transformer',
      config: {
        model: 'gpt-4',
        temperature: 0.1,
        maxTokens: 4000,
        systemPrompt: `Transform raw data to target schema:
        {
          "id": "string",
          "name": "string",
          "email": "string",
          "status": "active|inactive|pending",
          "tier": "free|premium|enterprise"
        }
        
        Handle missing fields with sensible defaults.
        Return valid JSON only.`
      }
    },
    
    // Schema validation
    {
      id: 'validator',
      type: 'policy',
      category: 'policy.validate',
      label: 'Validate Against Schema',
      config: {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', pattern: '^[^@]+@[^@]+$' },
            status: { enum: ['active', 'inactive', 'pending'] }
          },
          required: ['id', 'name', 'email']
        }
      }
    },
    
    // Batch insert to DataGrid
    {
      id: 'datagrid-write',
      type: 'data',
      category: 'data.grid_write',
      label: 'Write to Customers Grid',
      config: {
        gridId: 'customers-grid',
        operation: 'bulk_upsert'
      }
    },
    
    // Error handling node
    {
      id: 'error-logger',
      type: 'tool',
      category: 'tool.api',
      label: 'Log Errors',
      config: {
        endpoint: 'https://logging.example.com/errors',
        method: 'POST'
      }
    },
    
    // Success output
    {
      id: 'success-output',
      type: 'output',
      label: 'Success Report'
    }
  ],
  
  edges: [
    { sourceId: 'source-api', targetId: 'transformer-llm', flowType: 'DATA' },
    {
      sourceId: 'transformer-llm',
      targetId: 'validator',
      flowType: 'DATA',
      mapping: { sourceField: 'response', targetField: 'data' }
    },
    {
      sourceId: 'validator',
      targetId: 'datagrid-write',
      flowType: 'DATA',
      condition: 'validation_passed'
    },
    {
      sourceId: 'validator',
      targetId: 'error-logger',
      flowType: 'DATA',
      condition: 'validation_failed'
    },
    {
      sourceId: 'datagrid-write',
      targetId: 'success-output',
      flowType: 'DATA'
    }
  ]
};
```

---

## Example 3: AI-Powered Sentiment Analysis & Routing

### Workflow: Analyze → Route → Process

```typescript
const sentimentRoutingWorkflow = {
  id: 'sentiment-routing-v1',
  name: 'Sentiment Analysis & Intelligent Routing',
  
  nodes: [
    // Input: feedback from DataGrid
    {
      id: 'read-feedback',
      type: 'data',
      category: 'data.grid_read',
      label: 'Read Feedback Grid',
      config: {
        gridId: 'feedback-grid',
        filters: [{ field: 'processed', operator: 'eq', value: false }],
        limit: 100
      }
    },
    
    // Analyze sentiment
    {
      id: 'sentiment-analyzer',
      type: 'llm',
      category: 'llm.anthropic',
      label: 'Sentiment Analyzer',
      config: {
        model: 'claude-3-haiku', // Fast & cheap for analysis
        temperature: 0.1,
        maxTokens: 200,
        systemPrompt: `Analyze sentiment and categorize:
        {
          "sentiment": "positive|neutral|negative|very_negative",
          "score": 0-1,
          "category": "praise|complaint|question|suggestion",
          "requires_action": boolean
        }`
      }
    },
    
    // Router node
    {
      id: 'router',
      type: 'flow_control',
      category: 'control.condition',
      label: 'Intelligent Router',
      config: {
        conditions: [
          {
            name: 'praise',
            condition: 'sentiment === "positive"',
            targetNode: 'store-positive'
          },
          {
            name: 'complaint',
            condition: 'sentiment === "negative" || sentiment === "very_negative"',
            targetNode: 'escalate-complaint'
          },
          {
            name: 'question',
            condition: 'category === "question"',
            targetNode: 'send-to-qa'
          },
          {
            name: 'other',
            condition: 'true',
            targetNode: 'store-feedback'
          }
        ]
      }
    },
    
    // Process path 1: Store positive feedback
    {
      id: 'store-positive',
      type: 'data',
      category: 'data.grid_write',
      label: 'Archive Positive',
      config: {
        gridId: 'positive-feedback-archive',
        operation: 'insert'
      }
    },
    
    // Process path 2: Escalate complaints
    {
      id: 'escalate-complaint',
      type: 'tool',
      category: 'tool.api',
      label: 'Create Support Ticket',
      config: {
        endpoint: 'https://support.example.com/tickets',
        method: 'POST'
      },
      retryStrategy: { maxAttempts: 3, backoffMs: 1000 }
    },
    
    // Process path 3: Send to QA team
    {
      id: 'send-to-qa',
      type: 'tool',
      category: 'tool.api',
      label: 'Queue to QA',
      config: {
        endpoint: 'https://qa.example.com/queue',
        method: 'POST'
      }
    },
    
    // Process path 4: Store generic feedback
    {
      id: 'store-feedback',
      type: 'data',
      category: 'data.grid_write',
      label: 'Archive Feedback',
      config: {
        gridId: 'feedback-archive',
        operation: 'insert'
      }
    },
    
    // Mark as processed
    {
      id: 'mark-processed',
      type: 'data',
      category: 'data.grid_write',
      label: 'Mark as Processed',
      config: {
        gridId: 'feedback-grid',
        operation: 'update'
      }
    }
  ],
  
  edges: [
    { sourceId: 'read-feedback', targetId: 'sentiment-analyzer' },
    { sourceId: 'sentiment-analyzer', targetId: 'router' },
    { sourceId: 'router', targetId: 'store-positive' },
    { sourceId: 'router', targetId: 'escalate-complaint' },
    { sourceId: 'router', targetId: 'send-to-qa' },
    { sourceId: 'router', targetId: 'store-feedback' },
    { sourceId: 'store-positive', targetId: 'mark-processed' },
    { sourceId: 'escalate-complaint', targetId: 'mark-processed' },
    { sourceId: 'send-to-qa', targetId: 'mark-processed' },
    { sourceId: 'store-feedback', targetId: 'mark-processed' }
  ]
};
```

---

## Example 4: Learning Loop (Self-Improving Agent)

### Workflow: Execute → Evaluate → Learn → Improve

```typescript
const learningLoopWorkflow = {
  id: 'learning-loop-v1',
  name: 'Self-Improving Agent',
  description: 'Agent executes task, gets feedback, learns, improves strategy',
  
  nodes: [
    // Agent executes task
    {
      id: 'worker-agent',
      type: 'agent',
      category: 'agent.worker',
      label: 'Task Executor',
      config: {
        capabilities: ['search', 'analyze', 'summarize'],
        llmNodeId: 'llm-executor',
        maxIterations: 5
      }
    },
    
    {
      id: 'llm-executor',
      type: 'llm',
      category: 'llm.openai',
      label: 'Executor LLM'
    },
    
    // Evaluation: Get feedback from supervisor
    {
      id: 'llm-evaluator',
      type: 'llm',
      category: 'llm.openai',
      label: 'Evaluator LLM',
      config: {
        model: 'gpt-4',
        temperature: 0.1,
        maxTokens: 500,
        systemPrompt: `Evaluate the agent's output:
        {
          "quality": 0-1,
          "correctness": 0-1,
          "completeness": 0-1,
          "improvements": ["..."],
          "strengths": ["..."],
          "next_strategy": "string"
        }`
      }
    },
    
    // Feedback quality check
    {
      id: 'feedback-quality-check',
      type: 'policy',
      category: 'policy.validate',
      label: 'Quality Check',
      config: {
        threshold: 0.7, // Min quality score
        maxIterations: 5 // Prevent infinite loops
      }
    },
    
    // If quality good: store result
    {
      id: 'store-result',
      type: 'data',
      category: 'data.grid_write',
      label: 'Store Successful Result',
      config: {
        gridId: 'learning-results',
        operation: 'insert'
      }
    },
    
    // If quality low: learn & retry
    {
      id: 'memory-store',
      type: 'memory',
      category: 'memory.vector',
      label: 'Store Learning',
      config: {
        memoryType: 'long_term',
        vectorDb: 'pinecone'
      }
    },
    
    {
      id: 'llm-strategy-updater',
      type: 'llm',
      category: 'llm.openai',
      label: 'Strategy Updater',
      config: {
        model: 'gpt-4',
        temperature: 0.7, // Higher creativity for new strategies
        maxTokens: 800,
        systemPrompt: `Based on feedback, update strategy:
        {
          "new_approach": "string",
          "key_insights": ["..."],
          "next_steps": ["..."]
        }`
      }
    },
    
    // Retry with new strategy
    {
      id: 'retry-executor',
      type: 'agent',
      category: 'agent.worker',
      label: 'Executor (Retry)',
      config: {
        capabilities: ['search', 'analyze', 'summarize'],
        llmNodeId: 'llm-executor-v2'
      }
    },
    
    {
      id: 'llm-executor-v2',
      type: 'llm',
      category: 'llm.openai',
      label: 'Executor LLM V2'
    }
  ],
  
  edges: [
    // Initial execution
    { sourceId: 'worker-agent', targetId: 'llm-evaluator' },
    
    // Evaluation
    { sourceId: 'llm-evaluator', targetId: 'feedback-quality-check' },
    
    // Success path
    {
      sourceId: 'feedback-quality-check',
      targetId: 'store-result',
      condition: 'quality_score >= threshold'
    },
    
    // Learning path
    {
      sourceId: 'feedback-quality-check',
      targetId: 'memory-store',
      condition: 'quality_score < threshold && iterations < max'
    },
    
    { sourceId: 'memory-store', targetId: 'llm-strategy-updater' },
    { sourceId: 'llm-strategy-updater', targetId: 'retry-executor' },
    { sourceId: 'retry-executor', targetId: 'llm-evaluator' } // Loop back
  ]
};
```

---

## Example 5: Cross-Grid Automation

### Trigger: DataGrid Row Change → Execute Workflow → Update DataGrid

```typescript
// Set up trigger when customers are added
const crossGridTrigger = {
  gridId: 'customers-grid',
  onEvent: 'create', // Trigger when new row created
  workflowId: 'onboarding-workflow',
  
  // Mapping from DataGrid row to workflow input
  inputMapping: {
    'customer_id': 'row.id',
    'customer_email': 'row.email',
    'customer_tier': 'row.tier'
  },
  
  // Mapping from workflow output back to DataGrid
  outputMapping: {
    'row.onboarding_status': 'output.status',
    'row.verification_token': 'output.token',
    'row.onboarded_at': 'output.timestamp'
  }
};

// Onboarding workflow
const onboardingWorkflow = {
  id: 'onboarding-workflow',
  nodes: [
    {
      id: 'generate-token',
      type: 'tool',
      category: 'tool.function',
      label: 'Generate Token'
    },
    {
      id: 'send-email',
      type: 'tool',
      category: 'tool.api',
      label: 'Send Welcome Email',
      config: {
        endpoint: 'https://email.example.com/send',
        method: 'POST'
      }
    },
    {
      id: 'create-account',
      type: 'tool',
      category: 'tool.api',
      label: 'Create User Account',
      config: {
        endpoint: 'https://auth.example.com/users',
        method: 'POST'
      }
    },
    {
      id: 'record-event',
      type: 'tool',
      category: 'tool.api',
      label: 'Record Analytics Event',
      config: {
        endpoint: 'https://analytics.example.com/events',
        method: 'POST'
      }
    }
  ]
};
```

---

## Deployment & Operations

### Production Checklist

```markdown
# FlowGrid Production Deployment Checklist

## Pre-Deployment

- [ ] All workflows tested with real data
- [ ] Profiling completed (no nodes taking >5s)
- [ ] Token budgets calculated and limits set
- [ ] Error handling tested for all failure paths
- [ ] Rate limits configured (API calls, token usage)
- [ ] Monitoring/alerting configured
- [ ] Rollback plan documented

## Infrastructure

- [ ] Queue system deployed (Bull/RabbitMQ)
- [ ] State store deployed (Redis/Postgres)
- [ ] Vector DB deployed (Pinecone/Weaviate)
- [ ] OpenTelemetry collector running
- [ ] Grafana dashboards created

## Security

- [ ] API keys rotated
- [ ] Secrets stored in vault
- [ ] Rate limiting enabled
- [ ] Authorization checked on all operations
- [ ] Audit logging enabled

## Operations

- [ ] Team trained on execution monitoring
- [ ] Runbook created for common issues
- [ ] On-call rotation established
- [ ] Alerting tested and verified
- [ ] Backup/restore tested
```

### Monitoring Queries

```graphql
# Query: Check recent execution success rate
query {
  workflowExecutions(
    filter: { status: SUCCESS, fromDate: "2026-05-01T00:00:00Z" }
    limit: 100
  ) {
    edges {
      node {
        id
        duration
        tokenUsage { totalCost }
      }
    }
    pageInfo { totalCount }
  }
}

# Query: Identify slow workflows
query {
  workflows {
    edges {
      node {
        id
        name
        averageDuration
        executionCount
        successRate
      }
    }
  }
}

# Query: Get cost breakdown
query {
  workflowExecutions(limit: 1000) {
    edges {
      node {
        workflowId
        tokenUsage { costEstimate }
      }
    }
  }
}
```

---

**Version:** 1.0  
**Status:** Production-Ready  
**Last Updated:** May 2026
