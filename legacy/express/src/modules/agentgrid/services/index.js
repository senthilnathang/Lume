import { GridService } from './grid.service.js';
import { AgentService } from './agent.service.js';
import { ExecutionService } from './execution.service.js';
import { MemoryService } from './memory.service.js';
import { ToolRegistryService } from './tool-registry.service.js';
import { OrchestratorService } from './orchestrator.service.js';

const createServices = () => {
  const toolRegistry = new ToolRegistryService();
  toolRegistry.registerBuiltins();

  const gridService = new GridService();
  const agentService = new AgentService();
  const executionService = new ExecutionService();
  const memoryService = new MemoryService();
  const orchestrator = new OrchestratorService(agentService, executionService, memoryService, toolRegistry);

  return {
    toolRegistry,
    gridService,
    agentService,
    executionService,
    memoryService,
    orchestrator
  };
};

// Create and export services as default
export default createServices();

export { GridService, AgentService, ExecutionService, MemoryService, ToolRegistryService, OrchestratorService, createServices };
