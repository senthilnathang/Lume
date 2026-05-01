import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FlowGridService {
  private readonly logger = new Logger(FlowGridService.name);
  private flowgridServices: any;

  async initializeFlowGridServices() {
    if (!this.flowgridServices) {
      try {
        const { getModule } = await import('../../modules/__loader__');
        const flowgridModule = getModule('flowgrid');
        this.flowgridServices = flowgridModule.services;
      } catch (error) {
        this.logger.warn('FlowGrid module not initialized yet');
      }
    }
    return this.flowgridServices;
  }

  async getFlowGrid(id: string, tenantId: string) {
    const services = await this.initializeFlowGridServices();
    if (!services) throw new Error('FlowGrid module not available');
    const workflow = await services.workflowService.read(id);
    if (workflow?.tenantId !== parseInt(tenantId)) return null;
    return workflow;
  }

  async listFlowGrids(input: any, tenantId: string) {
    const services = await this.initializeFlowGridServices();
    if (!services) throw new Error('FlowGrid module not available');

    const { page = 1, pageSize = 20 } = input;
    const result = await services.workflowService.search({
      page,
      limit: pageSize,
      domain: [['tenantId', '=', parseInt(tenantId)]]
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

  async listWorkflows(input: any, tenantId: string) {
    return await this.listFlowGrids(input, tenantId);
  }

  async listExecutions(workflowId: string, input: any, tenantId: string) {
    const services = await this.initializeFlowGridServices();
    if (!services) throw new Error('FlowGrid module not available');

    const { page = 1, pageSize = 20 } = input;
    return await services.executionService.listExecutions(parseInt(workflowId), {
      page,
      limit: pageSize
    });
  }

  async createWorkflow(gridId: string, input: any, tenantId: string, userId: string) {
    const services = await this.initializeFlowGridServices();
    if (!services) throw new Error('FlowGrid module not available');

    return await services.workflowService.create({
      ...input,
      tenantId: parseInt(tenantId),
      createdById: parseInt(userId),
      status: 'draft'
    }, { userId: parseInt(userId) });
  }

  async publishWorkflow(id: string, tenantId: string) {
    const services = await this.initializeFlowGridServices();
    if (!services) throw new Error('FlowGrid module not available');

    const workflow = await services.workflowService.read(parseInt(id));
    if (workflow?.tenantId !== parseInt(tenantId)) throw new Error('Unauthorized');

    return await services.workflowService.publishWorkflow(parseInt(id));
  }

  async executeWorkflow(input: any, tenantId: string, userId: string) {
    const services = await this.initializeFlowGridServices();
    if (!services) throw new Error('FlowGrid module not available');

    return await services.executionEngine.executeWorkflow(
      parseInt(input.workflowId),
      input.variables || {},
      { userId: parseInt(userId), tenantId: parseInt(tenantId) }
    );
  }

  async cancelExecution(id: string, tenantId: string): Promise<boolean> {
    const services = await this.initializeFlowGridServices();
    if (!services) throw new Error('FlowGrid module not available');

    await services.executionService.cancelExecution(parseInt(id));
    return true;
  }
}
