import { Injectable } from '@nestjs/common';
import { GraphQLSchema, printSchema, getIntrospectionQuery } from 'graphql';

/**
 * SchemaExportService
 * Exports GraphQL schema in multiple formats for documentation and client generation
 */
@Injectable()
export class SchemaExportService {
  /**
   * Export schema as SDL (Schema Definition Language)
   * Used by clients for type generation, docs, introspection tools
   */
  exportAsSDL(schema: GraphQLSchema): string {
    return printSchema(schema);
  }

  /**
   * Export introspection query result
   * Used by GraphQL clients (Apollo, Relay) for code generation
   */
  getIntrospectionQuery(): string {
    return getIntrospectionQuery();
  }

  /**
   * Generate OpenAPI/Swagger-like documentation
   * Lists all queries, mutations, subscriptions with descriptions
   */
  generateMarkdownDocumentation(schema: GraphQLSchema): string {
    // TODO: Use schema introspection to generate markdown:
    // # GraphQL API Documentation
    //
    // ## Queries
    // ### entities
    // - Description: List all entities with pagination
    // - Args: pagination (PaginationInput?)
    // - Returns: Paginated(EntityType)
    //
    // ## Mutations
    // ### createEntity
    // - Description: Create new entity
    // - Args: input (CreateEntityInput!)
    // - Returns: EntityType
    //
    // ## Subscriptions
    // ### flowExecuted
    // - Description: Real-time workflow completion events
    // - Returns: FlowEventType
    //
    // ## Types
    // ### EntityType
    // Fields: id (Int!), name (String!), label (String!), ...
    // Implements: Node, Auditable

    const sdl = this.exportAsSDL(schema);
    return this.convertSDLToMarkdown(sdl);
  }

  /**
   * Convert SDL to markdown for easy reading
   */
  private convertSDLToMarkdown(sdl: string): string {
    let markdown = '# GraphQL API Documentation\n\n';

    // TODO: Parse SDL and format as markdown sections
    // Group by type: Query, Mutation, Subscription, ObjectType, InputType, Interface, Enum

    markdown += sdl; // Fallback to raw SDL for now

    return markdown;
  }

  /**
   * Generate client code examples
   */
  generateClientExamples(): string {
    // TODO: Generate example queries/mutations for common use cases:
    // - Listing entities with pagination
    // - Creating entity record with field validation
    // - Updating with RBAC masking
    // - Subscribing to workflow events

    return `
# GraphQL Client Examples

## Query: List entities
\`\`\`graphql
query GetEntities($page: Int!, $limit: Int!) {
  entities(pagination: { page: $page, limit: $limit }) {
    id
    name
    label
    fields {
      id
      name
      type
      required
    }
  }
}
\`\`\`

## Mutation: Create entity record
\`\`\`graphql
mutation CreateRecord($entityId: Int!, $data: JSON!) {
  createEntityRecord(
    entityId: $entityId
    input: { data: $data }
  ) {
    id
    createdAt
  }
}
\`\`\`

## Subscription: Watch workflow events
\`\`\`graphql
subscription OnFlowCompleted {
  flowExecuted {
    id
    flowName
    status
    executionTimeMs
  }
}
\`\`\`
`;
  }
}
