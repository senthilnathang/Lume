import { SupervisorAgent } from '../agents/supervisor.agent.js';
import { WorkerAgent } from '../agents/worker.agent.js';
import { CoordinatorAgent } from '../agents/coordinator.agent.js';

export class OrchestratorService {
  constructor(agentService, executionService, memoryService, toolRegistry) {
    this.agentService = agentService;
    this.executionService = executionService;
    this.memoryService = memoryService;
    this.toolRegistry = toolRegistry;
    this.abortControllers = new Map();
  }

  async executeAgent(agentId, input = {}, context = {}) {
    let executionId;
    const startTime = Date.now();

    try {
      const agent = await this.agentService.findOne(Number(agentId));
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }

      executionId = await this.executionService.startExecution(agentId, input, context);

      const executionContext = await this.buildContext(executionId, agentId, context);

      executionContext.logger('info', `Agent execution starting`, { agentType: agent.type });

      const agentInstance = this.instantiateAgent(agent);
      const result = await agentInstance.execute(input, executionContext);

      const duration = Math.round((Date.now() - startTime) / 1000);
      await this.executionService.updateExecution(executionId, 'success', result);

      executionContext.logger('info', `Agent execution completed`, { duration });

      return {
        executionId,
        agentId,
        status: 'success',
        output: result,
        duration
      };
    } catch (error) {
      if (executionId) {
        await this.executionService.updateExecution(executionId, 'failed', null, error.message);
      }

      throw error;
    } finally {
      if (executionId) {
        this.abortControllers.delete(executionId);
      }
    }
  }

  async cancelAgent(executionId) {
    await this.executionService.updateExecution(executionId, 'cancelled', null, 'Cancelled by user');

    const controller = this.abortControllers.get(executionId);
    if (controller) {
      controller.abort();
    }
  }

  async buildContext(executionId, agentId, options = {}) {
    const abortController = new AbortController();
    this.abortControllers.set(executionId, abortController);

    const sharedMemory = {
      remember: (key, value, ttl) => this.memoryService.remember(agentId, String(executionId), key, value, ttl),
      recall: (key) => this.memoryService.recall(agentId, String(executionId), key),
      recallAll: (pattern) => this.memoryService.recallAll(String(executionId), pattern),
      forget: (key) => this.memoryService.forget(agentId, String(executionId), key)
    };

    const logger = (level, message, data = {}) => {
      return this.executionService.appendLog(executionId, level, message, data);
    };

    const executeSubAgent = async (subAgentId, subInput) => {
      return await this.executeAgent(subAgentId, subInput, {
        parentExecutionId: executionId,
        userId: options.userId
      });
    };

    return {
      executionId,
      agentId,
      sharedMemory,
      toolRegistry: this.toolRegistry,
      logger,
      abortSignal: abortController.signal,
      parentExecutionId: options.parentExecutionId || null,
      executeSubAgent
    };
  }

  instantiateAgent(agentConfig) {
    const agents = {
      supervisor: SupervisorAgent,
      worker: WorkerAgent,
      coordinator: CoordinatorAgent
    };

    const AgentClass = agents[agentConfig.type];
    if (!AgentClass) {
      throw new Error(`Unknown agent type: ${agentConfig.type}`);
    }

    return new AgentClass(agentConfig.config || {});
  }
}
