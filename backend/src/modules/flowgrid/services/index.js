import { NodeRegistryService } from './node-registry.service.js';
import { WorkflowService } from './workflow.service.js';
import { ExecutionService } from './execution.service.js';
import { ExecutionEngineService } from './execution-engine.service.js';

export const createServices = () => {
  const nodeRegistry = new NodeRegistryService();
  nodeRegistry.registerAll();

  const workflowService = new WorkflowService();
  const executionService = new ExecutionService();
  const executionEngine = new ExecutionEngineService(nodeRegistry, workflowService, executionService);

  return {
    nodeRegistry,
    workflowService,
    executionService,
    executionEngine
  };
};

export { NodeRegistryService, WorkflowService, ExecutionService, ExecutionEngineService };
