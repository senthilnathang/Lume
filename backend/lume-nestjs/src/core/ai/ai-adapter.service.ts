import { Injectable } from '@nestjs/common';

export interface AIOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface ClassifyResult {
  label: string;
  confidence: number | null;
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
  private defaultModel: string = process.env.AI_MODEL || '';

  constructor() {
    this.provider = process.env.AI_PROVIDER || 'anthropic';
    this.apiKey = process.env.AI_API_KEY || '';

    if (!this.apiKey) {
      console.warn('AI_API_KEY not configured. AI features will be unavailable.');
    }
  }

  async complete(prompt: string, options?: AIOptions): Promise<AICompletion> {
    if (!this.apiKey) {
      throw new Error('AI_API_KEY is not configured');
    }

    if (this.provider === 'anthropic') {
      return this.completeWithAnthropic(prompt, options);
    }

    throw new Error(`Unsupported AI provider: ${this.provider}`);
  }

  async embed(text: string): Promise<number[]> {
    throw new Error('An embedding provider is not configured');
  }

  async classify(text: string, labels: string[]): Promise<ClassifyResult> {
    if (!Array.isArray(labels)||!labels.length||labels.some(label=>typeof label!=='string'||!label.trim())) throw new Error('Classification labels are required');

    const prompt = `Classify the following text into one of these categories: ${labels.join(', ')}\n\nText: "${text}"\n\nRespond with just the category name.`;

    const result = await this.complete(prompt, { maxTokens: 50 });
    const label = result.text.trim();
    if (!labels.includes(label)) throw new Error('AI returned an invalid classification label');

    return {
      label,
      confidence: null,
    };
  }

  private async completeWithAnthropic(
    prompt: string,
    options?: AIOptions,
  ): Promise<AICompletion> {
    const model=options?.model||this.defaultModel, maxTokens=options?.maxTokens??1024;
    if(typeof prompt!=='string'||!prompt.trim()||prompt.length>100000)throw new Error('Invalid AI prompt');
    if(!model||!Number.isSafeInteger(maxTokens)||maxTokens<1||maxTokens>8192)throw new Error('AI model and valid token limit required');
    if(options?.temperature!==undefined&&(!Number.isFinite(options.temperature)||options.temperature<0||options.temperature>1))throw new Error('Invalid AI temperature');
    let response:Response;
    try {
      response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),
        headers:{'content-type':'application/json','x-api-key':this.apiKey,'anthropic-version':'2023-06-01'},
        body:JSON.stringify({model,max_tokens:maxTokens,...(options?.temperature===undefined?{}:{temperature:options.temperature}),messages:[{role:'user',content:prompt}]})});
    }catch{throw new Error('AI provider transport failed or timed out');}
    if(!response.ok){await response.body?.cancel();throw new Error(`AI provider returned HTTP ${response.status}`);}
    const reader=response.body?.getReader();
    if(!reader)throw new Error('AI provider returned an empty response');
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>1048576){await reader.cancel();throw new Error('AI response too large');}chunks.push(value);}
    let data:any;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new Error('Invalid AI response JSON');}
    const text=Array.isArray(data.content)?data.content.filter(item=>item.type==='text'&&typeof item.text==='string').map(item=>item.text).join('\n'):'';
    if(!text.trim()||typeof data.model!=='string'||!Number.isSafeInteger(data.usage?.input_tokens)||!Number.isSafeInteger(data.usage?.output_tokens)||data.usage.input_tokens<0||data.usage.output_tokens<0)throw new Error('Invalid AI response content');
    if(data.stop_reason==='max_tokens')throw new Error('AI output was truncated');
    return {text,model:data.model,tokens:data.usage.input_tokens+data.usage.output_tokens};
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
