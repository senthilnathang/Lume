export class ExecutionEngineService {
  constructor(nodeRegistry, workflowService, executionService) {
    this.nodeRegistry = nodeRegistry;
    this.workflowService = workflowService;
    this.executionService = executionService;
  }

  topoSort(nodes, edges) {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const inDegree = new Map();
    const adjacencyList = new Map();

    nodes.forEach(node => {
      inDegree.set(node.id, 0);
      adjacencyList.set(node.id, []);
    });

    edges.forEach(edge => {
      if (nodeMap.has(edge.source) && nodeMap.has(edge.target)) {
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
        adjacencyList.get(edge.source).push(edge.target);
      }
    });

    const queue = [];
    const groups = [];
    let currentGroup = [];

    nodes.forEach(node => {
      if (inDegree.get(node.id) === 0) {
        queue.push(node.id);
      }
    });

    while (queue.length > 0) {
      currentGroup = [...queue];
      groups.push(currentGroup);
      const nextQueue = [];

      queue.forEach(nodeId => {
        adjacencyList.get(nodeId).forEach(neighbor => {
          inDegree.set(neighbor, inDegree.get(neighbor) - 1);
          if (inDegree.get(neighbor) === 0) {
            nextQueue.push(neighbor);
          }
        });
      });

      queue = nextQueue;
    }

    return groups;
  }

  async executeWorkflow(workflowId, input = {}, context = {}) {
    const workflow = await this.workflowService.read(workflowId);
    if (!workflow) throw new Error('Workflow not found');

    const validation = this.workflowService.validateWorkflow(workflow);
    if (!validation.valid) {
      throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
    }

    const executionId = await this.executionService.startExecution(workflowId, input, context);

    const executionContext = {
      executionId,
      workflowId,
      variables: { ...workflow.variables, ...input },
      secrets: {},
      nodeOutputs: {},
      userId: context.userId,
      tenantId: context.tenantId,
      abortSignal: context.abortSignal,
      nodeRecords: new Map()
    };

    try {
      await this.executionService.updateExecution(executionId, 'running');

      const groups = this.topoSort(workflow.nodes, workflow.edges);

      for (const group of groups) {
        await Promise.all(
          group.map(nodeId => this.executeNode(workflow, nodeId, executionContext))
        );
      }

      await this.executionService.updateExecution(executionId, 'success', executionContext.nodeOutputs);
      return { executionId, status: 'success' };
    } catch (error) {
      await this.executionService.updateExecution(executionId, 'failed', null, error.message);
      return { executionId, status: 'failed', error: error.message };
    }
  }

  async executeNode(workflow, nodeId, context) {
    const node = workflow.nodes.find(n => n.id === nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);

    const nodeImpl = this.nodeRegistry.getNode(node.type);
    if (!nodeImpl) throw new Error(`Unknown node type: ${node.type}`);

    let recordId;
    const maxRetries = node.errorHandling?.retries || 0;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        recordId = await this.executionService.recordNodeExecution(
          context.executionId,
          nodeId,
          node.type,
          node.config,
          null,
          'running'
        );
        context.nodeRecords.set(nodeId, recordId);

        const input = node.input || {};
        const output = await nodeImpl.execute(node.config, context);

        context.nodeOutputs[nodeId] = output;

        await this.executionService.updateNodeExecution(recordId, 'success', output);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    const strategy = node.errorHandling?.strategy || 'STOP';
    await this.executionService.updateNodeExecution(recordId, 'failed', null, lastError.message);

    if (strategy === 'CONTINUE') {
      context.nodeOutputs[nodeId] = { error: lastError.message };
      return;
    } else if (strategy === 'RETRY') {
      throw lastError;
    } else {
      throw lastError;
    }
  }

  async cancelWorkflowExecution(executionId) {
    return await this.executionService.cancelExecution(executionId);
  }

  async getExecutionStatus(executionId) {
    const execution = await this.executionService.getExecutionWithTimeline(executionId);
    return {
      id: execution.id,
      status: execution.status,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      duration: execution.duration,
      output: execution.output,
      error: execution.error,
      nodeExecutions: execution.timeline
    };
  }
}
