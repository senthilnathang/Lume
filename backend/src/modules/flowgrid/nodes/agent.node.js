import { AbstractWorkflowNode } from './base.node.js';

export class AgentNode extends AbstractWorkflowNode {
  constructor() {
    super('agent', {});
  }

  async validate(nodeConfig) {
    const errors = [];
    if (!nodeConfig.model) errors.push('model is required');
    if (!nodeConfig.systemPrompt) errors.push('systemPrompt is required');
    if (nodeConfig.maxIterations && Number(nodeConfig.maxIterations) <= 0) {
      errors.push('maxIterations must be positive');
    }
    return errors;
  }

  async execute(nodeConfig, context) {
    const {
      model = 'gpt-4o-mini',
      systemPrompt = '',
      tools = [],
      maxIterations = 10
    } = nodeConfig;

    const messages = [
      { role: 'user', content: systemPrompt }
    ];

    const toolCalls = [];
    const responses = [];
    let iteration = 0;
    let stopReason = null;

    while (iteration < maxIterations && stopReason !== 'end_turn') {
      iteration++;

      const response = await this.callLLM(model, messages, tools);
      responses.push(response);

      stopReason = response.stop_reason;

      if (response.tool_calls && response.tool_calls.length > 0) {
        toolCalls.push(...response.tool_calls);

        for (const toolCall of response.tool_calls) {
          const toolResult = await this.executeTool(toolCall, context);
          messages.push({
            role: 'assistant',
            content: response.content
          });
          messages.push({
            role: 'user',
            content: JSON.stringify({
              tool_call_id: toolCall.id,
              result: toolResult
            })
          });
        }
      } else {
        break;
      }
    }

    return {
      result: responses[responses.length - 1]?.content || '',
      messages,
      toolCalls,
      iterations: iteration,
      stopReason
    };
  }

  async callLLM(model, messages, tools) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not set');

    const body = {
      model,
      messages,
      temperature: 0.7,
      tools: tools.length > 0 ? tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters || {}
        }
      })) : undefined
    };

    if (!body.tools) delete body.tools;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    const result = {
      content: choice.message.content || '',
      stop_reason: choice.finish_reason,
      tool_calls: []
    };

    if (choice.message.tool_calls) {
      result.tool_calls = choice.message.tool_calls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments)
      }));
    }

    return result;
  }

  async executeTool(toolCall, context) {
    const { name, arguments: args } = toolCall;

    switch (name) {
      case 'call_webhook':
        return await this.callWebhook(args);
      case 'query_database':
        return await this.queryDatabase(args, context);
      case 'search':
        return await this.search(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  async callWebhook(args) {
    const { url, method = 'GET', body = null } = args;
    try {
      const response = await fetch(url, {
        method,
        body: body ? JSON.stringify(body) : null,
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async queryDatabase(args, context) {
    return { error: 'Database query not yet implemented' };
  }

  async search(args) {
    const { query } = args;
    return { results: [], query };
  }

  getMetadata() {
    return {
      ...super.getMetadata(),
      category: 'ai',
      description: 'AI agent with tool use and agentic loop'
    };
  }
}
