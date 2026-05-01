import { Injectable } from '@nestjs/common';
import { SchemaContextType, EntityContextType } from '../types/schema-context.type';

/**
 * SchemaContextService
 * Builds structured entity metadata context for LLM prompt
 * Integrates with MetadataRegistryService to extract entity definitions
 * Respects EntityDefinition.aiMetadata.sensitiveFields to exclude PII
 */
@Injectable()
export class SchemaContextService {
  // TODO: Inject MetadataRegistryService
  constructor() {}

  /**
   * Build full schema context for LLM system prompt
   * Includes all entities and their fields, excluding sensitive fields
   * Returns both structured context (for agents) and markdown prompt (for LLM)
   */
  buildSchemaContext(): SchemaContextType {
    // TODO: Call metadataRegistry.listEntities() to get all EntityDefinition[]
    // For each entity:
    //   - Extract name, label, description, pluralLabel
    //   - Iterate entity.fields[] and:
    //     - Skip fields in entity.aiMetadata?.sensitiveFields (e.g., ['password', 'ssn'])
    //     - Include: name, type, label, description, required, selectOptions if enum
    //   - Extract entity.aiMetadata.description → main hint to LLM
    //   - Extract entity.aiMetadata.summarizeWith → human-readable label field
    // Build markdown prompt describing entity relationships and query patterns

    return {
      buildTime: new Date(),
      entities: [],
      prompt: `You are a GraphQL query generator. You help users query a business data system by translating natural language questions into GraphQL queries.

Available entities and their fields are listed below. When a user asks a question:
1. Identify the entity they're querying
2. Extract the fields and filter conditions from their question
3. Build a GraphQL query with proper selection set and filter arguments
4. Return ONLY the GraphQL query string, no explanation.

Entities:
[Entity list will be populated from MetadataRegistry]

Example:
User: "Show all active customers from California"
GraphQL: query { entities(filter: {field: "status", operator: "eq", value: "active"}) { id name email state } }
`,
    };
  }

  /**
   * Build context for a single entity (for entityName-scoped queries)
   * More targeted prompt for specific entity context
   */
  buildEntityContext(entityName: string): EntityContextType | null {
    // TODO: Call metadataRegistry.getEntity(entityName)
    // Extract entity definition and transform to EntityContextType
    // Filter out sensitive fields per aiMetadata.sensitiveFields

    return null;
  }

  /**
   * Rebuild cache when entities change
   * Called by MetadataRegistryService.registerEntity() hook
   */
  invalidateCache(): void {
    // TODO: Clear cached schema context
    // Next buildSchemaContext() will regenerate from fresh entity definitions
  }
}
