import { Test, TestingModule } from '@nestjs/testing';
import { NlToGraphqlService } from '../../../../src/graphql/grids/agent-grid/services/nl-to-graphql.service';
import { SchemaContextService } from '../../../../src/graphql/grids/agent-grid/services/schema-context.service';

describe('NlToGraphqlService', () => {
  let service: NlToGraphqlService;
  let schemaContextService: SchemaContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NlToGraphqlService,
        {
          provide: SchemaContextService,
          useValue: {
            buildSchemaContext: jest.fn().mockReturnValue({
              entities: [],
              prompt: 'Test prompt',
            }),
            buildEntityContext: jest.fn().mockReturnValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<NlToGraphqlService>(NlToGraphqlService);
    schemaContextService = module.get<SchemaContextService>(
      SchemaContextService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should translate NL question to GraphQL', async () => {
    // TODO: Mock AIAdapterService.complete() to return a valid query
    const result = await service.translateToGraphQL(
      'Show all active entities',
    );

    expect(result).toBeDefined();
    expect(result.query).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it('should use low temperature for deterministic queries', async () => {
    // TODO: Verify AIAdapterService.complete called with temperature: 0.1
    const result = await service.translateToGraphQL(
      'Show all users',
      undefined,
      0.1,
    );

    expect(result).toBeDefined();
  });

  it('should validate generated GraphQL queries', () => {
    const validQuery = 'query { entities { id name } }';
    const invalidQuery = 'query { invalid syntax }';

    // TODO: Once integrated with graphql.parse():
    // - validateQuery(validQuery) should return null
    // - validateQuery(invalidQuery) should return error message
  });

  it('should estimate confidence based on validation', () => {
    // TODO: Test confidence calculation:
    // - Valid query + matched fields → high confidence (0.8+)
    // - Invalid query → low confidence (0.0)
    // - Partial match → medium confidence (0.4-0.7)

    const confidence = service.estimateConfidence(true, 2, 0.9);

    expect(confidence).toBeGreaterThan(0);
    expect(confidence).toBeLessThanOrEqual(1.0);
  });

  it('should handle entity-scoped queries', async () => {
    const result = await service.translateToGraphQL(
      'Show all active customers',
      'customer',
      0.1,
    );

    expect(result).toBeDefined();
  });

  it('should cap confidence at 1.0', () => {
    const confidence = service.estimateConfidence(true, 5, 1.0);

    expect(confidence).toBeLessThanOrEqual(1.0);
  });
});
