import { Test, TestingModule } from '@nestjs/testing';
import { SchemaContextService } from '../../../../src/graphql/grids/agent-grid/services/schema-context.service';

describe('SchemaContextService', () => {
  let service: SchemaContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SchemaContextService],
    }).compile();

    service = module.get<SchemaContextService>(SchemaContextService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should build schema context with entities and prompt', () => {
    const context = service.buildSchemaContext();

    expect(context).toBeDefined();
    expect(context.buildTime).toBeDefined();
    expect(Array.isArray(context.entities)).toBe(true);
    expect(context.prompt).toBeDefined();
    expect(context.prompt).toContain('GraphQL');
  });

  it('should generate markdown prompt for LLM', () => {
    const context = service.buildSchemaContext();

    expect(context.prompt).toContain('entities');
    expect(context.prompt).toContain('fields');
    expect(context.prompt).toContain('Example');
  });

  it('should support entity-scoped context', () => {
    const context = service.buildEntityContext('entity');

    // TODO: Will return null until MetadataRegistryService integration
    // Once integrated, should return EntityContextType with fields
  });

  it('should invalidate cache on entity changes', () => {
    const spy = jest.spyOn(service, 'invalidateCache');
    service.invalidateCache();

    expect(spy).toHaveBeenCalled();
  });

  it('should exclude sensitive fields from context', () => {
    // TODO: Once integrated with MetadataRegistryService:
    // - Register an entity with aiMetadata.sensitiveFields = ['password', 'ssn']
    // - Call buildSchemaContext()
    // - Verify context.entities[].fields does NOT include 'password' or 'ssn'
  });

  it('should include field descriptions and types', () => {
    // TODO: Verify entity fields include:
    // - name, type, label, description, required, selectOptions
  });
});
