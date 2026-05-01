import { Injectable, Logger } from '@nestjs/common';
import logger from '../../services/logger';

@Injectable()
export class AgentGridService {
  private readonly logger = new Logger(AgentGridService.name);
  private agentgridServices: any = null;

  private async initializeAgentGridServices() {
    if (this.agentgridServices) {
      return this.agentgridServices;
    }
    const { getModule } = await import('../../../modules/__loader__.js');
    const agentgridModule = getModule('agentgrid');
    this.agentgridServices = agentgridModule.services;
    return this.agentgridServices;
  }

  async getAgentGrid(id: string, tenantId: string) {
    const services = await this.initializeAgentGridServices();
    const grid = await services.agentService.findOne(id);
    return grid && grid.tenantId === tenantId ? grid : null;
  }

  async listAgentGrids(input: any, tenantId: string) {
    const services = await this.initializeAgentGridServices();
    const { page = 1, pageSize = 20 } = input;

    const result = await services.agentService.search({
      domain: [['tenantId', '=', tenantId]],
      page,
      limit: pageSize
    });

    return {
      edges: result.items.map((node: any) => ({
        node,
        cursor: Buffer.from(String(node.id)).toString('base64'),
      })),
      pageInfo: {
        page,
        pageSize,
        total: result.total,
        totalPages: result.totalPages,
        hasNextPage: page < result.totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async listAgents(gridId: string, input: any, tenantId: string) {
    const services = await this.initializeAgentGridServices();
    const { page = 1, pageSize = 20 } = input;

    return await services.agentService.getByGrid(gridId, {
      page,
      limit: pageSize
    });
  }

  async listExecutions(agentId: string, input: any, tenantId: string) {
    const services = await this.initializeAgentGridServices();
    const { page = 1, pageSize = 20 } = input;

    return await services.executionService.listByAgent(agentId, {
      page,
      limit: pageSize
    });
  }

  async executeAgent(input: any, tenantId: string, userId: string) {
    const services = await this.initializeAgentGridServices();
    return await services.orchestrator.executeAgent(
      input.agentId,
      input.input || {},
      { userId, tenantId }
    );
  }

  async cancelExecution(id: string, tenantId: string): Promise<boolean> {
    const services = await this.initializeAgentGridServices();
    await services.orchestrator.cancelAgent(id);
    return true;
  }
}
