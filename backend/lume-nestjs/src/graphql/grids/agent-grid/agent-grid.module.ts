import { Module } from '@nestjs/common';
import { AgentQueryResolver } from './resolvers/agent-query.resolver';
import { SchemaContextService } from './services/schema-context.service';
import { NlToGraphqlService } from './services/nl-to-graphql.service';

/**
 * AgentGrid module for AI-native querying
 * Provides natural language → GraphQL translation via LLM
 * Exposes schema context for LLM prompts and askQuery mutation
 */
@Module({
  providers: [AgentQueryResolver, SchemaContextService, NlToGraphqlService],
  exports: [AgentQueryResolver, SchemaContextService, NlToGraphqlService],
})
export class AgentGridModule {}
