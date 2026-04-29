import { Injectable } from '@nestjs/common';

export interface AIOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface ClassifyResult {
  label: string;
  confidence: number;
}

export interface AICompletion {
  text: string;
  tokens: number;
  model: string;
}

export interface AIAdapter {
  complete(prompt: string, options?: AIOptions): Promise<AICompletion>;
  embed(text: string): Promise<number[]>;
  classify(text: string, labels: string[]): Promise<ClassifyResult>;
}

@Injectable()
export class AIAdapterService implements AIAdapter {
  private provider: string;
  private apiKey: string;
  private defaultModel: string = 'claude-3-5-haiku-20241022'; // Default to Haiku for cost efficiency

  constructor() {
    this.provider = process.env.AI_PROVIDER || 'anthropic';
    this.apiKey = process.env.AI_API_KEY || '';

    if (!this.apiKey) {
      console.warn('AI_API_KEY not configured. AI features will be unavailable.');
    }
  }

  async complete(prompt: string, options?: AIOptions): Promise<AICompletion> {
    if (!this.apiKey) {
      // Return stub response for testing/demo
      return {
        text: '[AI Response Stub - API key not configured]',
        tokens: 0,
        model: this.defaultModel,
      };
    }

    if (this.provider === 'anthropic') {
      return this.completeWithAnthropic(prompt, options);
    }

    throw new Error(`Unsupported AI provider: ${this.provider}`);
  }

  async embed(text: string): Promise<number[]> {
    if (!this.apiKey) {
      // Return stub embedding
      return Array(1536).fill(0);
    }

    // Stub: In production, integrate with real embedding API
    // For now, return a deterministic embedding based on text hash
    return this.generateStubEmbedding(text);
  }

  async classify(text: string, labels: string[]): Promise<ClassifyResult> {
    if (!this.apiKey) {
      return {
        label: labels[0] || 'unknown',
        confidence: 0.0,
      };
    }

    const prompt = `Classify the following text into one of these categories: ${labels.join(', ')}\n\nText: "${text}"\n\nRespond with just the category name.`;

    const result = await this.complete(prompt, { maxTokens: 50 });
    const label = result.text.trim();

    return {
      label: labels.includes(label) ? label : labels[0] || 'unknown',
      confidence: 0.95,
    };
  }

  private async completeWithAnthropic(
    prompt: string,
    options?: AIOptions,
  ): Promise<AICompletion> {
    try {
      // Stub implementation: In production, use @anthropic-ai/sdk
      // const Anthropic = require('@anthropic-ai/sdk');
      // const client = new Anthropic({ apiKey: this.apiKey });
      // const message = await client.messages.create({...});

      // For now, return stub response
      console.log(`[AI] Prompt: ${prompt.substring(0, 100)}...`);

      return {
        text: `[Claude ${options?.model || this.defaultModel} response stub]`,
        tokens: Math.ceil(prompt.length / 4),
        model: options?.model || this.defaultModel,
      };
    } catch (error: any) {
      throw new Error(`Anthropic API error: ${error.message}`);
    }
  }

  private generateStubEmbedding(text: string): number[] {
    // Generate a deterministic embedding based on text
    const hash = this.simpleHash(text);
    const embedding = Array(1536).fill(0);

    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = Math.sin(hash + i) * 0.5 + 0.5;
    }

    return embedding;
  }

  private simpleHash(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  setProvider(provider: string): void {
    this.provider = provider;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  setDefaultModel(model: string): void {
    this.defaultModel = model;
  }
}
