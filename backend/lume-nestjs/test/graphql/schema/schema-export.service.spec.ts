import { Test, TestingModule } from '@nestjs/testing';
import { SchemaExportService } from '../../../src/graphql/schema/schema-export.service';

describe('SchemaExportService', () => {
  let service: SchemaExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SchemaExportService],
    }).compile();

    service = module.get<SchemaExportService>(SchemaExportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should export schema as SDL', () => {
    // TODO: Create minimal GraphQL schema
    // Call exportAsSDL(schema)
    // Verify output contains type definitions for EntityType, Query, Mutation, etc.
  });

  it('should export introspection query', () => {
    const query = service.getIntrospectionQuery();

    expect(query).toBeDefined();
    expect(query).toContain('__schema');
    // TODO: Verify query is valid GraphQL introspection query
  });

  it('should generate markdown documentation', () => {
    // TODO: Create minimal schema
    // Call generateMarkdownDocumentation(schema)
    // Verify output contains:
    // - Queries section with entities, entity, etc.
    // - Mutations section with createEntity, updateEntity, etc.
    // - Subscriptions section with flowExecuted, etc.
    // - Types section with EntityType, RoleType, etc.
  });

  it('should generate client code examples', () => {
    const examples = service.generateClientExamples();

    expect(examples).toBeDefined();
    expect(examples).toContain('GetEntities');
    expect(examples).toContain('CreateRecord');
    expect(examples).toContain('OnFlowCompleted');
  });

  it('should include operation descriptions in docs', () => {
    // TODO: Verify markdown includes @description from GraphQL types
  });

  it('should include required vs optional field info', () => {
    // TODO: Verify markdown shows ! for required fields
  });
});
