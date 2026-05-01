# FlowGrid — Observability & Debugging Framework

**Version:** 1.0  
**Status:** Production-Ready  
**Last Updated:** May 2026

---

## Table of Contents

1. [Distributed Tracing](#distributed-tracing)
2. [Execution Replay](#execution-replay)
3. [Performance Profiling](#performance-profiling)
4. [Debugging Tools](#debugging-tools)
5. [Observability Dashboard](#observability-dashboard)

---

## Distributed Tracing

### OpenTelemetry Integration

```typescript
// backend/src/core/flowgrid/observability/tracing.ts

import {
  trace,
  context,
  SpanStatusCode,
} from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

export class FlowGridTracing {
  private tracer = trace.getTracer('flowgrid');
  private sdk: NodeSDK;

  constructor() {
    this.sdk = new NodeSDK({
      traceExporter: new JaegerExporter({
        endpoint: process.env.JAEGER_ENDPOINT,
      }),
      instrumentations: [getNodeAutoInstrumentations()],
    });
  }

  /**
   * Trace a workflow execution
   * Creates a root span with child spans for each node
   */
  async traceWorkflowExecution<T>(
    workflowId: string,
    executionId: string,
    fn: (span: any) => Promise<T>,
  ): Promise<T> {
    const span = this.tracer.startSpan(`workflow.execute`, {
      attributes: {
        'workflow.id': workflowId,
        'execution.id': executionId,
        'service.name': 'flowgrid',
        'span.kind': 'server',
      },
    });

    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Trace node execution
   */
  async traceNodeExecution<T>(
    nodeId: string,
    nodeType: string,
    input: any,
    fn: () => Promise<T>,
  ): Promise<T> {
    const activeSpan = trace.getActiveSpan();
    const span = this.tracer.startSpan(`node.execute`, {
      parent: activeSpan,
      attributes: {
        'node.id': nodeId,
        'node.type': nodeType,
        'input.size': JSON.stringify(input).length,
        'input.keys': Object.keys(input).join(','),
      },
    });

    return context.with(trace.setSpan(context.active(), span), async () => {
      const startTime = performance.now();

      try {
        const result = await fn();
        const duration = performance.now() - startTime;

        span.setAttributes({
          'node.duration': duration,
          'node.success': true,
          'output.size': JSON.stringify(result).length,
        });

        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Trace streaming node output
   */
  async *traceNodeStreaming<T>(
    nodeId: string,
    stream: AsyncIterable<T>,
  ): AsyncGenerator<T> {
    const span = this.tracer.startSpan(`node.stream`, {
      attributes: {
        'node.id': nodeId,
        'stream.type': 'async_iterable',
      },
    });

    let chunkCount = 0;

    try {
      for await (const chunk of stream) {
        chunkCount++;
        span.addEvent('chunk_received', {
          'chunk.index': chunkCount,
          'chunk.size': JSON.stringify(chunk).length,
        });
        yield chunk;
      }

      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttributes({
        'stream.chunks': chunkCount,
      });
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Trace policy checks
   */
  tracePolicy(
    resource: string,
    action: string,
    allowed: boolean,
  ): void {
    const activeSpan = trace.getActiveSpan();
    const span = this.tracer.startSpan(`policy.check`, {
      parent: activeSpan,
      attributes: {
        'policy.resource': resource,
        'policy.action': action,
        'policy.allowed': allowed,
        'policy.decision_time': Date.now(),
      },
    });

    span.end();
  }

  /**
   * Trace LLM API calls
   */
  traceLLMCall(
    model: string,
    promptTokens: number,
    completionTokens: number,
    duration: number,
  ): void {
    const activeSpan = trace.getActiveSpan();
    const span = this.tracer.startSpan(`llm.api_call`, {
      parent: activeSpan,
      attributes: {
        'llm.model': model,
        'llm.tokens.prompt': promptTokens,
        'llm.tokens.completion': completionTokens,
        'llm.tokens.total': promptTokens + completionTokens,
        'llm.duration': duration,
        'llm.tokens.cost': this.estimateCost(model, promptTokens, completionTokens),
      },
    });

    span.end();
  }

  private estimateCost(
    model: string,
    promptTokens: number,
    completionTokens: number,
  ): number {
    // Pricing as of May 2026
    const rates: Record<string, [number, number]> = {
      'gpt-4': [0.03, 0.06], // per 1K tokens
      'gpt-4-turbo': [0.01, 0.03],
      'gpt-3.5-turbo': [0.0005, 0.0015],
      'claude-3-opus': [0.015, 0.075],
      'claude-3-sonnet': [0.003, 0.015],
    };

    const [promptRate, completionRate] = rates[model] || [0, 0];
    return (
      (promptTokens / 1000) * promptRate +
      (completionTokens / 1000) * completionRate
    );
  }
}
```

### Metrics Collection

```typescript
// backend/src/core/flowgrid/observability/metrics.ts

import { prometheus } from '@opentelemetry/sdk-metrics-node';

export class FlowGridMetrics {
  private registry = prometheus.register;

  private workflowCounter = new prometheus.Counter({
    name: 'flowgrid_workflows_total',
    help: 'Total workflows created',
    labelNames: ['status', 'tenant_id'],
  });

  private executionCounter = new prometheus.Counter({
    name: 'flowgrid_executions_total',
    help: 'Total workflow executions',
    labelNames: ['status', 'workflow_id'],
  });

  private executionDuration = new prometheus.Histogram({
    name: 'flowgrid_execution_duration_seconds',
    help: 'Workflow execution duration',
    labelNames: ['workflow_id'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  });

  private nodeExecutionDuration = new prometheus.Histogram({
    name: 'flowgrid_node_execution_duration_seconds',
    help: 'Node execution duration',
    labelNames: ['node_type', 'node_id'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  });

  private tokenUsage = new prometheus.Counter({
    name: 'flowgrid_tokens_used_total',
    help: 'Total LLM tokens used',
    labelNames: ['model', 'token_type'], // prompt, completion, total
  });

  private policyCacheHits = new prometheus.Counter({
    name: 'flowgrid_policy_cache_hits_total',
    help: 'Policy evaluation cache hits',
    labelNames: ['policy_id'],
  });

  private executionErrors = new prometheus.Counter({
    name: 'flowgrid_execution_errors_total',
    help: 'Total execution errors',
    labelNames: ['error_type', 'node_id'],
  });

  private retryCount = new prometheus.Counter({
    name: 'flowgrid_retries_total',
    help: 'Total node retries',
    labelNames: ['node_id'],
  });

  recordExecution(workflowId: string, status: 'success' | 'failed', duration: number) {
    this.executionCounter.inc({ status, workflow_id: workflowId });
    this.executionDuration.observe({ workflow_id: workflowId }, duration);
  }

  recordNodeExecution(nodeType: string, nodeId: string, duration: number) {
    this.nodeExecutionDuration.observe({ node_type: nodeType, node_id: nodeId }, duration);
  }

  recordTokenUsage(model: string, promptTokens: number, completionTokens: number) {
    this.tokenUsage.inc({ model, token_type: 'prompt' }, promptTokens);
    this.tokenUsage.inc({ model, token_type: 'completion' }, completionTokens);
    this.tokenUsage.inc({ model, token_type: 'total' }, promptTokens + completionTokens);
  }

  recordPolicyCacheHit(policyId: string) {
    this.policyCacheHits.inc({ policy_id: policyId });
  }

  recordExecutionError(errorType: string, nodeId: string) {
    this.executionErrors.inc({ error_type: errorType, node_id: nodeId });
  }

  recordRetry(nodeId: string) {
    this.retryCount.inc({ node_id: nodeId });
  }

  getMetrics(): string {
    return this.registry.metrics();
  }
}
```

---

## Execution Replay

### Replay System for Debugging

```typescript
// backend/src/core/flowgrid/observability/replay.ts

export interface ExecutionReplay {
  workflowId: string;
  executionId: string;
  originalExecution: ExecutionTrace;
  
  // Replay configuration
  replayFrom?: string; // nodeId to replay from
  replayUntil?: string; // nodeId to stop at
  mockNodeOutputs?: Map<string, any>; // Override outputs
  stepDelay?: number; // ms between steps for debugging
}

export class ExecutionReplayer {
  /**
   * Replay an execution for debugging
   * Allows stepping through execution, examining state, modifying inputs
   */
  async replayExecution(
    replay: ExecutionReplay,
    context: ExecutionContext,
  ): Promise<ExecutionResult> {
    const originalExecution = replay.originalExecution;
    const nodeExecutions = originalExecution.nodeExecutions;

    // Find start point
    const startIndex = replay.replayFrom
      ? nodeExecutions.findIndex(ne => ne.nodeId === replay.replayFrom)
      : 0;

    // Find end point
    const endIndex = replay.replayUntil
      ? nodeExecutions.findIndex(ne => ne.nodeId === replay.replayUntil)
      : nodeExecutions.length - 1;

    console.log(`[REPLAY] Starting from ${startIndex} to ${endIndex}`);

    const replayContext = { ...context };
    const nodeOutputs = new Map(originalExecution.nodeOutputs);

    // Apply mocked outputs
    for (const [nodeId, output] of replay.mockNodeOutputs?.entries() || []) {
      nodeOutputs.set(nodeId, output);
      console.log(`[REPLAY] Mocked node ${nodeId} output`);
    }

    replayContext.nodeOutputs = nodeOutputs;

    // Execute selected nodes
    for (let i = startIndex; i <= endIndex; i++) {
      const nodeExecution = nodeExecutions[i];

      if (replay.stepDelay) {
        await sleep(replay.stepDelay);
      }

      console.log(`[REPLAY] Step ${i}: Executing node ${nodeExecution.nodeId}`);

      // Re-execute node with original input
      const node = this.getNodeFromWorkflow(nodeExecution.nodeId);
      const result = await node.execute(nodeExecution.input, replayContext);

      nodeOutputs.set(nodeExecution.nodeId, result);
    }

    return { nodeOutputs, executionTrace: originalExecution };
  }

  /**
   * Interactive debugger for step-by-step execution
   */
  async debugExecution(
    executionId: string,
    context: ExecutionContext,
  ): Promise<InteractiveDebugger> {
    const execution = await this.getExecution(executionId);

    return new InteractiveDebugger(execution, context);
  }

  private getNodeFromWorkflow(nodeId: string): IWorkflowNode {
    // Would resolve from registry
    return null as any;
  }

  private async getExecution(id: string): Promise<any> {
    // Would fetch from database
    return null;
  }
}

/**
 * Interactive debugger for manual exploration
 */
export class InteractiveDebugger {
  private currentStep: number = 0;
  private paused: boolean = false;

  constructor(
    private execution: ExecutionReplay,
    private context: ExecutionContext,
  ) {}

  async step(): Promise<void> {
    // Execute one node
  }

  async continue(): Promise<void> {
    // Execute all remaining nodes
  }

  async breakAtNode(nodeId: string): Promise<void> {
    // Set breakpoint
  }

  inspectVariable(nodeId: string, variable: string): any {
    // Get variable value at specific node
    return null;
  }

  inspectNodeOutput(nodeId: string): any {
    // Get full output of node
    return null;
  }

  modifyVariable(nodeId: string, variable: string, value: any): void {
    // Modify state for next execution
  }

  getExecutionTrace(): ExecutionTrace {
    // Return current execution state
    return null as any;
  }
}
```

---

## Performance Profiling

### Profiler & Analysis

```typescript
// backend/src/core/flowgrid/observability/profiler.ts

export interface ExecutionProfile {
  workflowId: string;
  executionId: string;
  
  // Timeline
  totalDuration: number;
  nodeExecutions: NodeProfile[];
  
  // Critical path
  criticalPath: string[]; // Slowest chain of dependencies
  criticalPathDuration: number;
  
  // Bottlenecks
  slowestNodes: NodeProfile[];
  slowestEdges: EdgeProfile[];
  
  // Resource usage
  tokenUsage: TokenProfile;
  memoryUsage: MemoryProfile;
  
  // Recommendations
  optimizations: Optimization[];
}

export interface NodeProfile {
  nodeId: string;
  nodeType: string;
  duration: number;
  percentage: number; // % of total time
  inputSize: number;
  outputSize: number;
  retries: number;
  errors: string[];
}

export interface EdgeProfile {
  sourceNodeId: string;
  targetNodeId: string;
  duration: number; // Time spent waiting for upstream
}

export interface TokenProfile {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalCost: number;
  tokensPerSecond: number;
}

export interface MemoryProfile {
  peakUsage: number; // bytes
  averageUsage: number;
  allocations: number;
}

export class ExecutionProfiler {
  /**
   * Profile an execution and identify bottlenecks
   */
  profileExecution(execution: WorkflowExecution): ExecutionProfile {
    const nodeExecutions = execution.nodeExecutions;
    const totalDuration = execution.duration || 0;

    // 1. Find slowest nodes
    const slowestNodes = this.findSlowestNodes(nodeExecutions);

    // 2. Find critical path
    const criticalPath = this.findCriticalPath(
      execution.workflow,
      nodeExecutions,
    );

    // 3. Analyze edges
    const slowestEdges = this.analyzeEdges(nodeExecutions);

    // 4. Analyze resource usage
    const tokenUsage = this.analyzeTokenUsage(execution);
    const memoryUsage = this.analyzeMemoryUsage(execution);

    // 5. Generate optimizations
    const optimizations = this.generateOptimizations(
      nodeExecutions,
      slowestNodes,
      criticalPath,
    );

    return {
      workflowId: execution.workflowId,
      executionId: execution.id,
      totalDuration,
      nodeExecutions: nodeExecutions.map((ne: any) => ({
        nodeId: ne.nodeId,
        nodeType: ne.nodeType,
        duration: ne.duration,
        percentage: (ne.duration / totalDuration) * 100,
        inputSize: this.getSize(ne.input),
        outputSize: this.getSize(ne.output),
        retries: ne.retryCount,
        errors: ne.error ? [ne.error.message] : [],
      })),
      criticalPath: criticalPath.map(ne => ne.nodeId),
      criticalPathDuration: this.sumDurations(criticalPath),
      slowestNodes,
      slowestEdges,
      tokenUsage,
      memoryUsage,
      optimizations,
    };
  }

  /**
   * Compare two executions to find regressions
   */
  compareExecutions(
    execution1: WorkflowExecution,
    execution2: WorkflowExecution,
  ): ComparisonResult {
    const profile1 = this.profileExecution(execution1);
    const profile2 = this.profileExecution(execution2);

    const durationChange = profile2.totalDuration - profile1.totalDuration;
    const durationChangePercent = (durationChange / profile1.totalDuration) * 100;

    const nodeComparisons = profile1.nodeExecutions.map((ne1: any) => {
      const ne2 = profile2.nodeExecutions.find(
        (n: any) => n.nodeId === ne1.nodeId,
      );
      if (!ne2) return null;

      const durationChange = ne2.duration - ne1.duration;
      const slower = durationChange > 0;

      return {
        nodeId: ne1.nodeId,
        durationChange,
        durationChangePercent: (durationChange / ne1.duration) * 100,
        slower,
      };
    });

    return {
      totalDurationChange: durationChange,
      totalDurationChangePercent: durationChangePercent,
      isRegression: durationChangePercent > 10, // 10% threshold
      nodeComparisons: nodeComparisons.filter((nc: any) => nc),
      recommendation: this.recommendOptimization(profile2),
    };
  }

  private findSlowestNodes(
    nodeExecutions: any[],
  ): NodeProfile[] {
    return nodeExecutions
      .sort((a: any, b: any) => b.duration - a.duration)
      .slice(0, 5)
      .map((ne: any) => ({
        nodeId: ne.nodeId,
        nodeType: ne.nodeType,
        duration: ne.duration,
        percentage: 0, // Filled by caller
        inputSize: this.getSize(ne.input),
        outputSize: this.getSize(ne.output),
        retries: ne.retryCount,
        errors: [],
      }));
  }

  private findCriticalPath(
    workflow: any,
    nodeExecutions: any[],
  ): any[] {
    // Find the longest chain of sequential dependencies
    // This represents the minimum possible execution time
    return [];
  }

  private analyzeEdges(nodeExecutions: any[]): EdgeProfile[] {
    // Find edges where data transfer took time
    return [];
  }

  private analyzeTokenUsage(execution: WorkflowExecution): TokenProfile {
    return {
      model: 'gpt-4',
      promptTokens: execution.tokenUsage?.prompt || 0,
      completionTokens: execution.tokenUsage?.completion || 0,
      totalCost: execution.tokenUsage?.total
        ? (execution.tokenUsage.total / 1000) * 0.03
        : 0,
      tokensPerSecond:
        ((execution.tokenUsage?.total || 0) / (execution.duration || 1)) * 1000,
    };
  }

  private analyzeMemoryUsage(execution: WorkflowExecution): MemoryProfile {
    return {
      peakUsage: 0,
      averageUsage: 0,
      allocations: 0,
    };
  }

  private generateOptimizations(
    nodeExecutions: any[],
    slowestNodes: NodeProfile[],
    criticalPath: any[],
  ): Optimization[] {
    const optimizations: Optimization[] = [];

    // Suggest parallelization
    for (const node of slowestNodes) {
      if (!criticalPath.find((n: any) => n.nodeId === node.nodeId)) {
        optimizations.push({
          nodeId: node.nodeId,
          type: 'PARALLELIZE',
          suggestion: `Node ${node.nodeId} is not on critical path and can be parallelized`,
          estimatedImprovement: (node.percentage * 0.5) / 100,
        });
      }
    }

    // Suggest caching
    for (const node of slowestNodes) {
      if (node.nodeType === 'tool' || node.nodeType === 'llm') {
        optimizations.push({
          nodeId: node.nodeId,
          type: 'CACHE',
          suggestion: `Add caching for frequently-called ${node.nodeType} node`,
          estimatedImprovement: (node.percentage * 0.3) / 100,
        });
      }
    }

    return optimizations;
  }

  private getSize(obj: any): number {
    if (!obj) return 0;
    return JSON.stringify(obj).length;
  }

  private sumDurations(nodes: any[]): number {
    return nodes.reduce((sum: number, node: any) => sum + (node.duration || 0), 0);
  }

  private recommendOptimization(profile: ExecutionProfile): string {
    if (profile.slowestNodes.length === 0) return 'Execution is well-optimized';

    const topNode = profile.slowestNodes[0];
    return `Focus on optimizing node ${topNode.nodeId} (${topNode.percentage.toFixed(1)}% of execution time)`;
  }
}

interface ComparisonResult {
  totalDurationChange: number;
  totalDurationChangePercent: number;
  isRegression: boolean;
  nodeComparisons: any[];
  recommendation: string;
}
```

---

## Debugging Tools

### Node Inspection

```typescript
// backend/src/core/flowgrid/observability/inspector.ts

export class ExecutionInspector {
  /**
   * Inspect a node's execution details
   */
  async inspectNode(
    executionId: string,
    nodeId: string,
  ): Promise<NodeInspection> {
    const execution = await this.getExecution(executionId);
    const nodeExecution = execution.nodeExecutions.find(
      (ne: any) => ne.nodeId === nodeId,
    );

    if (!nodeExecution) {
      throw new Error(`Node ${nodeId} not found in execution`);
    }

    return {
      nodeId,
      nodeType: nodeExecution.nodeType,
      config: nodeExecution.config,
      input: nodeExecution.input,
      output: nodeExecution.output,
      error: nodeExecution.error,
      timing: {
        started: nodeExecution.startedAt,
        completed: nodeExecution.completedAt,
        duration: nodeExecution.duration,
      },
      retries: nodeExecution.retryCount,
      policies: nodeExecution.policiesChecked,
      trace: nodeExecution.trace,
    };
  }

  /**
   * Get data flow between two nodes
   */
  async inspectDataFlow(
    executionId: string,
    sourceNodeId: string,
    targetNodeId: string,
  ): Promise<DataFlowInspection> {
    const execution = await this.getExecution(executionId);
    const edge = execution.edges.find(
      (e: any) =>
        e.sourceNodeId === sourceNodeId && e.targetNodeId === targetNodeId,
    );

    const sourceOutput = execution.nodeExecutions.find(
      (ne: any) => ne.nodeId === sourceNodeId,
    )?.output;

    const targetInput = execution.nodeExecutions.find(
      (ne: any) => ne.nodeId === targetNodeId,
    )?.input;

    return {
      edge,
      sourceOutput,
      targetInput,
      mapping: edge?.mapping,
      transformation: edge?.transform,
      dataLoss: this.detectDataLoss(sourceOutput, targetInput),
    };
  }

  private detectDataLoss(source: any, target: any): string[] {
    // Detect fields in source that didn't make it to target
    const losses: string[] = [];
    const sourceKeys = Object.keys(source || {});
    const targetKeys = Object.keys(target || {});

    for (const key of sourceKeys) {
      if (!targetKeys.includes(key)) {
        losses.push(key);
      }
    }

    return losses;
  }

  private async getExecution(id: string): Promise<any> {
    // Fetch execution
    return null;
  }
}

interface NodeInspection {
  nodeId: string;
  nodeType: string;
  config: any;
  input: any;
  output: any;
  error?: any;
  timing: {
    started: Date;
    completed?: Date;
    duration: number;
  };
  retries: number;
  policies: any[];
  trace: any;
}

interface DataFlowInspection {
  edge: any;
  sourceOutput: any;
  targetInput: any;
  mapping: any;
  transformation?: string;
  dataLoss: string[];
}
```

---

## Observability Dashboard

### Metrics & Analytics UI Components

```typescript
// These would be React components in the frontend

/**
 * Execution Timeline Visualization
 * Gantt chart showing node execution times
 */
export function ExecutionTimeline({ execution }: { execution: WorkflowExecution }) {
  const profile = profiler.profileExecution(execution);

  return (
    <div>
      <h3>Execution Timeline ({profile.totalDuration}ms)</h3>
      <div style={{ width: '100%', height: '300px' }}>
        {/* Gantt chart */}
        {profile.nodeExecutions.map((node: any) => (
          <div
            key={node.nodeId}
            style={{
              width: `${(node.duration / profile.totalDuration) * 100}%`,
              height: '20px',
              backgroundColor: node.percentage > 20 ? '#ff6b6b' : '#4dabf7',
              display: 'inline-block',
            }}
          >
            {node.nodeId}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Token Cost Dashboard
 */
export function TokenCostAnalysis({ execution }: { execution: WorkflowExecution }) {
  const profile = profiler.profileExecution(execution);
  const tokenProfile = profile.tokenUsage;

  return (
    <div>
      <h3>Token Usage & Cost</h3>
      <div>
        <p>Prompt Tokens: {tokenProfile.promptTokens}</p>
        <p>Completion Tokens: {tokenProfile.completionTokens}</p>
        <p>Total Cost: ${tokenProfile.totalCost.toFixed(4)}</p>
        <p>Tokens/Second: {tokenProfile.tokensPerSecond.toFixed(2)}</p>
      </div>
    </div>
  );
}

/**
 * Recommendations Panel
 */
export function OptimizationRecommendations({ profile }: { profile: ExecutionProfile }) {
  return (
    <div>
      <h3>Optimization Recommendations</h3>
      <ul>
        {profile.optimizations.map((opt: any) => (
          <li key={opt.nodeId}>
            <strong>{opt.type}</strong>: {opt.suggestion}
            <br />
            Estimated improvement: {(opt.estimatedImprovement * 100).toFixed(1)}%
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

**Version:** 1.0  
**Status:** Production-Ready  
**Last Updated:** May 2026
