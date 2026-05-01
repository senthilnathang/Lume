import { AbstractAgent } from './base.agent.js';

export class WorkerAgent extends AbstractAgent {
  constructor(config = {}) {
    super('worker', config);
  }

  async execute(task, context) {
    const { model = 'gpt-4o-mini', systemPrompt = '', tools = [], maxIterations = 10 } = this.config;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: task }
    ];

    const toolCalls = [];
    let iteration = 0;
    let stopReason = null;

    context?.logger?.('info', `Worker agent starting task execution`, { model, maxIterations });

    while (iteration < maxIterations) {
      iteration++;

      const toolSchemas = tools.length > 0
        ? tools.map(toolName => {
            const tool = context?.toolRegistry?.get(toolName);
            return tool ? tool.getSchema() : null;
          }).filter(Boolean)
        : [];

      const response = await this.callLLM(model, messages, toolSchemas, context);
      stopReason = response.stop_reason;

      if (response.tool_calls && response.tool_calls.length > 0) {
        toolCalls.push(...response.tool_calls);

        messages.push({
          role: 'assistant',
          content: response.content
        });

        for (const toolCall of response.tool_calls) {
          context?.logger?.('info', `Worker executing tool: ${toolCall.name}`, { tool: toolCall.name, args: toolCall.arguments });

          const toolResult = await context?.toolRegistry?.execute(toolCall.name, toolCall.arguments, context);

          messages.push({
            role: 'user',
            content: JSON.stringify({
              tool_call_id: toolCall.id,
              result: toolResult
            })
          });

          context?.logger?.('debug', `Tool result received`, { tool: toolCall.name, success: toolResult?.success });
        }
      } else {
        context?.logger?.('info', `Worker task completed`, { iterations: iteration, stopReason });
        break;
      }
    }

    const finalResult = messages[messages.length - 1]?.content || '';

    return {
      result: finalResult,
      messages,
      toolCalls,
      iterations: iteration,
      stopReason
    };
  }

  async callLLM(model, messages, tools, context) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not set');

    const body = {
      model,
      messages,
      temperature: 0.7,
      tools: tools.length > 0 ? tools : undefined
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

  getMetadata() {
    return {
      ...super.getMetadata(),
      type: 'worker',
      description: 'Specialized worker agent with tool use and agentic loop'
    };
  }
}
