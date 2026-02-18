import { SettingsService } from './page.service.js';
import { responseUtil } from '../../../shared/utils/index.js';

const settingsService = new SettingsService();

/**
 * AI Content Generation Service
 * Supports OpenAI and Anthropic providers for text and code generation.
 */
export class AiService {
  /**
   * Load AI configuration from website_settings table.
   */
  async getConfig() {
    const result = await settingsService.getAll();
    const settings = result.success ? result.data : {};
    return {
      provider: settings.ai_provider || 'openai',
      apiKey: settings.ai_api_key || '',
      model: settings.ai_model || '',
      maxTokens: parseInt(settings.ai_max_tokens) || 1024,
      enabled: settings.ai_enabled === 'true' || settings.ai_enabled === true,
    };
  }

  /**
   * Generate text content via AI.
   * @param {string} prompt - User prompt
   * @param {object} options - { tone, length, maxTokens }
   */
  async generateText(prompt, options = {}) {
    const config = await this.getConfig();
    if (!config.enabled) {
      return responseUtil.error('AI generation is disabled. Enable it in Website Settings.');
    }
    if (!config.apiKey) {
      return responseUtil.error('AI API key is not configured. Set it in Website Settings.');
    }

    const { tone = 'professional', length = 'medium' } = options;

    const lengthGuide = {
      short: 'Keep the response concise, around 1-2 sentences.',
      medium: 'Write a moderate-length response, around 1-2 paragraphs.',
      long: 'Write a detailed, comprehensive response of 3-5 paragraphs.',
    };

    const systemPrompt = `You are a professional content writer. Write in a ${tone} tone. ${lengthGuide[length] || lengthGuide.medium} Output only the content text, no markdown formatting unless explicitly requested.`;

    const maxTokens = options.maxTokens || config.maxTokens;

    try {
      if (config.provider === 'anthropic') {
        return await this._callAnthropic(config, systemPrompt, prompt, maxTokens);
      }
      return await this._callOpenAI(config, systemPrompt, prompt, maxTokens);
    } catch (err) {
      console.error('[AiService] generateText error:', err);
      return responseUtil.error(err.message || 'AI generation failed');
    }
  }

  /**
   * Generate code via AI.
   * @param {string} prompt - User prompt describing the code
   * @param {string} language - Target language (html, css, javascript)
   */
  async generateCode(prompt, language = 'html') {
    const config = await this.getConfig();
    if (!config.enabled) {
      return responseUtil.error('AI generation is disabled. Enable it in Website Settings.');
    }
    if (!config.apiKey) {
      return responseUtil.error('AI API key is not configured. Set it in Website Settings.');
    }

    const systemPrompt = `You are an expert web developer. Generate clean, production-ready ${language} code based on the user's request. Output ONLY the code without any explanation, markdown code fences, or surrounding text.`;

    try {
      if (config.provider === 'anthropic') {
        return await this._callAnthropic(config, systemPrompt, prompt, config.maxTokens);
      }
      return await this._callOpenAI(config, systemPrompt, prompt, config.maxTokens);
    } catch (err) {
      console.error('[AiService] generateCode error:', err);
      return responseUtil.error(err.message || 'AI code generation failed');
    }
  }

  /**
   * Call the OpenAI Chat Completions API.
   */
  async _callOpenAI(config, systemPrompt, userPrompt, maxTokens) {
    const model = config.model || 'gpt-4o-mini';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    return responseUtil.success({ content, model, provider: 'openai' });
  }

  /**
   * Call the Anthropic Messages API.
   */
  async _callAnthropic(config, systemPrompt, userPrompt, maxTokens) {
    const model = config.model || 'claude-sonnet-4-20250514';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text?.trim();
    if (!content) {
      throw new Error('No content returned from Anthropic');
    }

    return responseUtil.success({ content, model, provider: 'anthropic' });
  }
}

export default { AiService };
