import { Controller, Get, Inject } from '@nestjs/common';
import { GraphQLSchema } from 'graphql';
import { SchemaExportService } from './schema-export.service';

/**
 * SchemaController
 * REST endpoints for GraphQL schema export and documentation
 * Used by API consumers for client code generation and documentation
 */
@Controller('api/v2/graphql')
export class SchemaController {
  // TODO: Inject GraphQLSchema from NestJS GraphQL module
  constructor(
    @Inject('GraphQL_SCHEMA') private schema: GraphQLSchema,
    private schemaExportService: SchemaExportService,
  ) {}

  /**
   * GET /api/v2/graphql/schema.graphql
   * Returns SDL schema for code generation tools
   */
  @Get('schema.graphql')
  getSchemaSDL(): string {
    return this.schemaExportService.exportAsSDL(this.schema);
  }

  /**
   * GET /api/v2/graphql/schema.json
   * Returns introspection result for GraphQL clients
   */
  @Get('schema.json')
  getIntrospectionQuery(): string {
    return this.schemaExportService.getIntrospectionQuery();
  }

  /**
   * GET /api/v2/graphql/docs
   * Returns markdown documentation of API
   */
  @Get('docs')
  getDocumentation(): string {
    return this.schemaExportService.generateMarkdownDocumentation(this.schema);
  }

  /**
   * GET /api/v2/graphql/examples
   * Returns example queries, mutations, subscriptions
   */
  @Get('examples')
  getClientExamples(): string {
    return this.schemaExportService.generateClientExamples();
  }
}
