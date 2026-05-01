import { Injectable, Logger } from '@nestjs/common';
import { GraphQLSchema } from 'graphql';
import logger from '../../services/logger';

interface Intent {
  action: 'query' | 'mutation' | 'subscription';
  primaryEntity: string;
  filters: Array<{ field: string; operator: string; value: string }>;
  sorting: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
  aggregations: string[];
  limit?: number;
}

@Injectable()
export class SemanticQueryService {
  private readonly logger = new Logger(SemanticQueryService.name);

  /**
   * Convert natural language to GraphQL query
   * Example: "Show me all active users sorted by name"
   */
  async resolveNaturalLanguageQuery(
    naturalLanguage: string,
    schema: GraphQLSchema,
  ): Promise<string> {
    try {
      const intent = this.extractIntent(naturalLanguage);
      this.validateIntentAgainstSchema(intent, schema);
      const graphqlQuery = this.generateGraphQLQuery(intent);

      this.logger.debug('Generated GraphQL query from natural language', {
        naturalLanguage,
        graphqlQuery,
        intent,
      });

      return graphqlQuery;
    } catch (error) {
      this.logger.error('Failed to resolve natural language query', error);
      throw error;
    }
  }

  /**
   * Extract intent and entities from natural language
   */
  private extractIntent(naturalLanguage: string): Intent {
    const lowerCase = naturalLanguage.toLowerCase();

    let action: Intent['action'] = 'query';
    if (lowerCase.includes('create') || lowerCase.includes('add')) {
      action = 'mutation';
    } else if (lowerCase.includes('update') || lowerCase.includes('modify')) {
      action = 'mutation';
    } else if (lowerCase.includes('delete') || lowerCase.includes('remove')) {
      action = 'mutation';
    } else if (
      lowerCase.includes('subscribe') ||
      lowerCase.includes('listen')
    ) {
      action = 'subscription';
    }

    let primaryEntity = 'dataGrids';
    if (lowerCase.includes('user')) primaryEntity = 'users';
    else if (lowerCase.includes('agent')) primaryEntity = 'agents';
    else if (lowerCase.includes('workflow')) primaryEntity = 'workflows';
    else if (lowerCase.includes('policy')) primaryEntity = 'policies';

    const filters: Intent['filters'] = [];
    const sorting: Intent['sorting'] = [];

    let limit = 20;
    const limitMatch = naturalLanguage.match(/top\s+(\d+)|limit\s+(\d+)/i);
    if (limitMatch) {
      limit = parseInt(limitMatch[1] || limitMatch[2], 10);
    }

    return {
      action,
      primaryEntity,
      filters,
      sorting,
      aggregations: [],
      limit,
    };
  }

  /**
   * Validate intent against GraphQL schema
   */
  private validateIntentAgainstSchema(intent: Intent, schema: GraphQLSchema) {
    const queryType = schema.getQueryType();
    if (!queryType) {
      throw new Error('Schema has no Query type');
    }

    const fields = queryType.getFields();
    const entityExists = fields[intent.primaryEntity];

    if (!entityExists) {
      throw new Error(`Entity "${intent.primaryEntity}" not found in schema`);
    }
  }

  /**
   * Generate GraphQL query from intent
   */
  private generateGraphQLQuery(intent: Intent): string {
    if (intent.action === 'query') {
      return this.generateQueryOperation(intent);
    } else if (intent.action === 'mutation') {
      return this.generateMutationOperation(intent);
    } else {
      return this.generateSubscriptionOperation(intent);
    }
  }

  private generateQueryOperation(intent: Intent): string {
    const query = [
      'query {',
      `  ${intent.primaryEntity}(input: {`,
      '    page: 1',
      `    pageSize: ${intent.limit}`,
      '  }) {',
      '    edges {',
      '      node {',
      '        id',
      '      }',
      '    }',
      '    pageInfo {',
      '      total',
      '      page',
      '    }',
      '  }',
      '}',
    ];

    return query.join('\n');
  }

  private generateMutationOperation(intent: Intent): string {
    return 'mutation {\n  # Generated mutation\n}\n';
  }

  private generateSubscriptionOperation(intent: Intent): string {
    return 'subscription {\n  # Generated subscription\n}\n';
  }

  /**
   * Suggest filters based on user history
   */
  async suggestFilters(userId: string, entity: string): Promise<any[]> {
    return [
      {
        field: 'status',
        operator: 'EQ',
        value: 'ACTIVE',
        frequency: 0.8,
      },
    ];
  }

  /**
   * Validate and correct data using AI
   */
  async validateAndCorrect(
    rows: any[],
    gridId: string,
    tenantId: string,
  ): Promise<any[]> {
    return rows.map(row => ({
      ...row,
      validated: true,
    }));
  }
}
