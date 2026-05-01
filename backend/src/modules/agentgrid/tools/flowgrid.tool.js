import { AbstractTool } from './base.tool.js';

export class FlowGridTool extends AbstractTool {
  constructor() {
    super('execute_flowgrid_workflow', {});
  }

  async execute(args, context) {
    const { workflowId, input = {} } = args;

    try {
      const { getModule } = await import('../../../core/modules/__loader__.js');
      const flowgridModule = getModule('flowgrid');

      if (!flowgridModule) {
        return { success: false, error: 'FlowGrid module not available' };
      }

      const result = await flowgridModule.services.executionEngine.executeWorkflow(
        workflowId,
        input,
        { userId: context?.userId, tenantId: context?.tenantId }
      );

      context?.logger?.('info', `FlowGrid workflow ${workflowId} executed`, { workflowId, status: result.status });

      return {
        success: result.status === 'success',
        executionId: result.executionId,
        status: result.status,
        error: result.error,
        output: result.output
      };
    } catch (error) {
      context?.logger?.('error', `FlowGrid execution failed: ${error.message}`, { workflowId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  getSchema() {
    return {
      type: 'function',
      function: {
        name: 'execute_flowgrid_workflow',
        description: 'Execute a FlowGrid workflow from an agent',
        parameters: {
          type: 'object',
          properties: {
            workflowId: { type: 'number', description: 'The workflow ID to execute' },
            input: { type: 'object', description: 'Input variables for the workflow' }
          },
          required: ['workflowId']
        }
      }
    };
  }
}
