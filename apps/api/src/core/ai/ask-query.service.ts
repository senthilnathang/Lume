import { Injectable } from '@nestjs/common';
import { AIAdapterService } from './ai-adapter.service';
import { EntityRegistryService } from '@core/entity/entity-registry.service';
import { MetadataRegistryService, RequestContext } from '@core/runtime/metadata-registry.service';

export interface AskResult {
  answer: string;
  records: any[];
  confidence: number;
  executionTime: number;
}

@Injectable()
export class AskQueryService {
  constructor(
    private aiAdapter: AIAdapterService,
    private entityRegistry: EntityRegistryService,
    private metadataRegistry: MetadataRegistryService,
  ) {}

  async ask(
    entityName: string,
    question: string,
    context: RequestContext,
  ): Promise<AskResult> {
    const startTime = Date.now();

    const entity = this.entityRegistry.getWithExtensions(entityName);
    if (!entity) {
      throw new Error('Entity not found');
    }

    const systemPrompt = this.buildSystemPrompt(entity);
    const recentRecords = this.getRecentRecords(entityName);
    const aiPrompt = this.buildAIPrompt(entity, question, recentRecords, context);
    const aiResponse = await this.aiAdapter.complete(aiPrompt, {
      maxTokens: 500,
      temperature: 0.3,
    });

    const { answer, recordIds, confidence } = this.parseAIResponse(
      aiResponse.text,
      recentRecords,
    );

    const relevantRecords = recentRecords.filter(r => recordIds.includes(r.id));
    const executionTime = Date.now() - startTime;

    return { answer, records: relevantRecords, confidence, executionTime };
  }

  private buildSystemPrompt(entity: any): string {
    const fieldDescriptions = Object.entries(entity.fields)
      .map(([name, field]: [string, any]) => `- ${name}: ${field.type}`)
      .join('\n');

    return `You are a helpful assistant for ${entity.label}.
Entity: ${entity.name}
Description: ${entity.description || 'N/A'}

Fields:
${fieldDescriptions}`;
  }

  private buildAIPrompt(
    entity: any,
    question: string,
    records: any[],
    context: RequestContext,
  ): string {
    const recordContext = records
      .slice(0, 10)
      .map(r => `[ID: ${r.id}] ${JSON.stringify(r)}`)
      .join('\n');

    return `Records:\n${recordContext}\n\nQuestion: "${question}"\n\nAnswer directly based on the records.`;
  }

  private parseAIResponse(
    response: string,
    records: any[],
  ): { answer: string; recordIds: number[]; confidence: number } {
    const idPattern = /\[(?:Record )?ID:\s*(\d+)\]/g;
    const recordIds: number[] = [];
    let match;

    while ((match = idPattern.exec(response)) !== null) {
      const id = parseInt(match[1], 10);
      if (records.some(r => r.id === id)) {
        recordIds.push(id);
      }
    }

    const confidence = Math.min(0.95, 0.5 + response.length / 1000);

    return {
      answer: response.trim(),
      recordIds: [...new Set(recordIds)],
      confidence,
    };
  }

  private getRecentRecords(entityName: string): any[] {
    return [
      { id: 1, name: 'Record 1', status: 'active', value: 100 },
      { id: 2, name: 'Record 2', status: 'active', value: 200 },
      { id: 3, name: 'Record 3', status: 'inactive', value: 150 },
    ];
  }
}
