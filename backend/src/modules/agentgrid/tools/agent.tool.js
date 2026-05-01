import { AbstractTool } from './base.tool.js';

export class AgentTool extends AbstractTool {
  constructor() {
    super('delegate_to_agent', {});
  }

  async execute(args, context) {
    const { agentId, input = {}, waitForResult = true } = args;

    if (!context?.executeSubAgent) {
      return { success: false, error: 'Sub-agent execution not available in this context' };
    }

    try {
      context?.logger?.('info', `Delegating to agent ${agentId}`, { agentId, waitForResult });

      const result = await context.executeSubAgent(agentId, input);

      return {
        success: result.status === 'success',
        agentId,
        executionId: result.executionId,
        status: result.status,
        output: result.output,
        error: result.error
      };
    } catch (error) {
      context?.logger?.('error', `Agent delegation failed: ${error.message}`, { agentId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  getSchema() {
    return {
      type: 'function',
      function: {
        name: 'delegate_to_agent',
        description: 'Delegate a task to another registered agent',
        parameters: {
          type: 'object',
          properties: {
            agentId: { type: 'number', description: 'The agent ID to delegate to' },
            input: { type: 'object', description: 'Task input for the agent' },
            waitForResult: { type: 'boolean', description: 'Wait for result (default true)' }
          },
          required: ['agentId']
        }
      }
    };
  }
}
