import {
  Resolver,
  Query,
  Mutation,
  Args,
  Context,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlJwtGuard } from '../../../guards/gql-jwt.guard';
import { GqlRbacGuard } from '../../../guards/gql-rbac.guard';
import { GqlCurrentUser } from '../../../decorators/gql-current-user.decorator';
import { GqlTenant } from '../../../decorators/gql-tenant.decorator';
import { Permissions } from '../../../core/decorators/permissions.decorator';
import { AgentQueryResultType } from '../types/agent-query-result.type';
import { SchemaContextType } from '../types/schema-context.type';
import { AskQueryInput } from '../inputs/ask-query.input';
import { SchemaContextService } from '../services/schema-context.service';
import { NlToGraphqlService } from '../services/nl-to-graphql.service';
import { GqlContext, JwtPayload } from '../../../graphql.context';

/**
 * AgentGrid Query Resolver
 * AI-native natural language querying: translate NL → GraphQL
 * Delegates to NlToGraphqlService for LLM-based query generation
 * Delegates to SchemaContextService for entity metadata context
 */
@Resolver()
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class AgentQueryResolver {
  constructor(
    private schemaContextService: SchemaContextService,
    private nlToGraphqlService: NlToGraphqlService,
  ) {}

  @Query(() => SchemaContextType, { name: 'schemaContext' })
  @Permissions('base.entities.read')
  async schemaContext(
    @Args('entityName', { nullable: true }) entityName?: string,
    @GqlCurrentUser() user?: JwtPayload,
  ): Promise<SchemaContextType> {
    // TODO: Return schema context for LLM prompt building
    // If entityName provided, return entity-scoped context
    // Otherwise return full schema context
    // Respects EntityDefinition.aiMetadata.sensitiveFields to exclude PII field names

    return this.schemaContextService.buildSchemaContext();
  }

  @Mutation(() => AgentQueryResultType, { name: 'askQuery' })
  @Permissions('base.entities.read')
  async askQuery(
    @Args('input') input: AskQueryInput,
    @GqlCurrentUser() user: JwtPayload,
    @GqlTenant() companyId: number,
    @Context() ctx: GqlContext,
  ): Promise<AgentQueryResultType> {
    const startTime = Date.now();

    try {
      // TODO: Translate question to GraphQL query
      // 1. Call nlToGraphqlService.translateToGraphQL(question, entityName, temperature)
      // 2. Validate query syntax
      // 3. If valid:
      //    a. Execute the generated query via GraphQL engine
      //    b. Apply field-level RBAC masking per user.role_id
      //    c. Return { answer, graphqlQuery, records, confidence, executionTimeMs }
      // 4. If invalid or LLM fails:
      //    a. Return { answer: "I couldn't understand that query", errorMessage, confidence, executionTimeMs }
      //    b. Suggest rephrasing or provide an example

      const { query, confidence } =
        await this.nlToGraphqlService.translateToGraphQL(
          input.question,
          input.entityName,
          input.temperature,
        );

      const executionTimeMs = Date.now() - startTime;

      if (!query) {
        return {
          answer: 'I could not generate a valid query from your question.',
          confidence: 0,
          executionTimeMs,
          errorMessage: 'Query generation failed',
          suggestion: 'Try asking about specific entities or fields.',
        };
      }

      // TODO: Execute query and apply RBAC masking
      // const result = await this.executeQuery(query, user.role_id, companyId, ctx);

      return {
        answer: 'Query executed successfully.',
        graphqlQuery: query,
        records: [],
        confidence,
        executionTimeMs,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;

      return {
        answer: 'An error occurred while processing your query.',
        confidence: 0,
        executionTimeMs,
        errorMessage: error.message || 'Unknown error',
      };
    }
  }

  // TODO: Private helper to execute generated GraphQL query
  // - Use graphql.graphql() or Apollo execution engine
  // - Apply RBAC field-level masking post-fetch
  // - Return structured result
  private async executeQuery(
    query: string,
    roleId: number,
    companyId: number,
    ctx: GqlContext,
  ): Promise<any> {
    // TODO: Implement query execution with RBAC masking
    return null;
  }
}
