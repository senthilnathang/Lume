import { Injectable } from '@nestjs/common';
import { SchemaContextService } from './schema-context.service';

/**
 * NlToGraphqlService
 * Translates natural language questions to GraphQL queries using LLM
 * Uses SchemaContextService to provide entity metadata in prompt
 */
@Injectable()
export class NlToGraphqlService {
  // TODO: Inject AIAdapterService for LLM completion calls

  constructor(private schemaContextService: SchemaContextService) {}

  /**
   * Translate a natural language question to a GraphQL query
   * Uses low temperature (deterministic) for consistent query generation
   * Returns generated query string + confidence score
   */
  async translateToGraphQL(
    question: string,
    entityName?: string,
    temperature: number = 0.1,
  ): Promise<{ query: string; confidence: number }> {
    // TODO: Build LLM prompt:
    // 1. Get schema context (full or entity-scoped)
    // 2. Set system message with schema context + query generation rules
    // 3. Set user message as the question
    // 4. Call aiAdapter.complete() with { system, user, temperature, max_tokens: 500 }
    //
    // Example prompt structure:
    // system: `${schemaContext.prompt}\n\nRules:\n- Return ONLY the GraphQL query\n- No explanations\n- Use proper field names\n- Include all relevant filters\n`
    // user: question
    //
    // 5. Extract query from response
    // 6. Validate query syntax (parse with graphql-core or similar)
    // 7. Estimate confidence based on validation result + LLM score

    return {
      query: '',
      confidence: 0,
    };
  }

  /**
   * Validate a GraphQL query string
   * Checks syntax correctness without executing
   * Returns error message if invalid, null if valid
   */
  validateQuery(queryString: string): string | null {
    // TODO: Use graphql.parse() to validate syntax
    // Catch errors and return error message
    // Return null if valid

    return null;
  }

  /**
   * Estimate confidence in generated query
   * Factors:
   // - Syntax validation (0.8 points if valid)
    // - Field coverage (0.1 points per field in question matched)
    // - LLM provided confidence (if returned in response)
    */
  estimateConfidence(
    isValid: boolean,
    matchedFields: number,
    llmScore?: number,
  ): number {
    let confidence = 0;

    if (isValid) confidence += 0.8;
    confidence += Math.min(matchedFields * 0.05, 0.2);
    if (llmScore) confidence += llmScore * 0.1;

    return Math.min(confidence, 1.0);
  }
}
