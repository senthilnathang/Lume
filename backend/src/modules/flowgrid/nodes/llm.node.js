import { AbstractWorkflowNode } from './base.node.js';

export class LLMNode extends AbstractWorkflowNode {
  constructor() {
    super('llm', {});
  }

  async validate(nodeConfig) {
    const errors = [];
    if (!nodeConfig.provider) errors.push('provider is required');
    if (!nodeConfig.model) errors.push('model is required');
    if (!nodeConfig.systemPrompt) errors.push('systemPrompt is required');
    if (!nodeConfig.userPromptTemplate) errors.push('userPromptTemplate is required');
    return errors;
  }

  resolveTemplate(template, context) {
    if (typeof template !== 'string') return template;
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const parts = path.split('.');
      let value = context.variables;
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          value = context.nodeOutputs[path] || match;
          break;
        }
      }
      return typeof value === 'string' ? value : JSON.stringify(value);
    });
  }

  async execute(nodeConfig, context) {
    const {
      provider = 'openai',
      model = 'gpt-4o-mini',
      systemPrompt = '',
      userPromptTemplate = '',
      temperature = 0.7,
      maxTokens = 2000
    } = nodeConfig;

    const resolvedSystemPrompt = this.resolveTemplate(systemPrompt, context);
    const resolvedUserPrompt = this.resolveTemplate(userPromptTemplate, context);

    if (provider === 'openai') {
      return await this.callOpenAI(model, resolvedSystemPrompt, resolvedUserPrompt, temperature, maxTokens);
    } else if (provider === 'anthropic') {
      return await this.callAnthropic(model, resolvedSystemPrompt, resolvedUserPrompt, temperature, maxTokens);
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  async callOpenAI(model, systemPrompt, userPrompt, temperature, maxTokens) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not set');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;
    const totalTokens = promptTokens + completionTokens;

    return {
      content,
      model,
      provider: 'openai',
      tokens: {
        prompt: promptTokens,
        completion: completionTokens,
        total: totalTokens
      },
      cost: ((promptTokens / 1000 * 0.0005) + (completionTokens / 1000 * 0.0015)).toFixed(4)
    };
  }

  async callAnthropic(model, systemPrompt, userPrompt, temperature, maxTokens) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        temperature
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text || '';
    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;
    const totalTokens = inputTokens + outputTokens;

    return {
      content,
      model,
      provider: 'anthropic',
      tokens: {
        prompt: inputTokens,
        completion: outputTokens,
        total: totalTokens
      },
      cost: ((inputTokens / 1000 * 0.003) + (outputTokens / 1000 * 0.015)).toFixed(4)
    };
  }

  getMetadata() {
    return {
      ...super.getMetadata(),
      category: 'ai',
      description: 'Call OpenAI or Anthropic language models',
      supportsStreaming: true
    };
  }
}
