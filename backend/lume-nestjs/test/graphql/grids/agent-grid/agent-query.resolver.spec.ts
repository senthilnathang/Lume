import { Test, TestingModule } from '@nestjs/testing';
import { AgentQueryResolver } from '../../../../src/graphql/grids/agent-grid/resolvers/agent-query.resolver';
import { SchemaContextService } from '../../../../src/graphql/grids/agent-grid/services/schema-context.service';
import { NlToGraphqlService } from '../../../../src/graphql/grids/agent-grid/services/nl-to-graphql.service';

describe('AgentQueryResolver', () => {
  let resolver: AgentQueryResolver;
  let schemaContextService: SchemaContextService;
  let nlToGraphqlService: NlToGraphqlService;

  const mockUser = {
    sub: 1,
    email: 'test@test.com',
    role_id: 2,
    role_name: 'admin',
    company_id: 1,
  };

  const mockContext = {
    user: mockUser,
    companyId: 1,
    loaders: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentQueryResolver,
        {
          provide: SchemaContextService,
          useValue: {
            buildSchemaContext: jest.fn().mockReturnValue({
              buildTime: new Date(),
              entities: [],
              prompt: 'Test prompt',
            }),
            buildEntityContext: jest.fn().mockReturnValue(null),
          },
        },
        {
          provide: NlToGraphqlService,
          useValue: {
            translateToGraphQL: jest.fn().mockResolvedValue({
              query: 'query { entities { id name } }',
              confidence: 0.95,
            }),
            validateQuery: jest.fn().mockReturnValue(null),
            estimateConfidence: jest.fn().mockReturnValue(0.9),
          },
        },
      ],
    })
      .overrideGuard('GqlJwtGuard')
      .useValue({ canActivate: () => true })
      .overrideGuard('GqlRbacGuard')
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<AgentQueryResolver>(AgentQueryResolver);
    schemaContextService = module.get<SchemaContextService>(
      SchemaContextService,
    );
    nlToGraphqlService = module.get<NlToGraphqlService>(NlToGraphqlService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should get full schema context', async () => {
    const result = await resolver.schemaContext(undefined, mockUser);

    expect(result).toBeDefined();
    expect(result.buildTime).toBeDefined();
    expect(result.entities).toBeDefined();
    expect(result.prompt).toBeDefined();
    expect(schemaContextService.buildSchemaContext).toHaveBeenCalled();
  });

  it('should get entity-scoped schema context', async () => {
    await resolver.schemaContext('entity', mockUser);

    expect(schemaContextService.buildSchemaContext).toHaveBeenCalled();
  });

  it('should translate NL question to GraphQL query', async () => {
    const input = {
      question: 'Show all active entities',
      entityName: undefined,
      temperature: 0.1,
    };

    const result = await resolver.askQuery(input, mockUser, 1, mockContext as any);

    expect(result).toBeDefined();
    expect(result.graphqlQuery).toBe('query { entities { id name } }');
    expect(result.confidence).toBe(0.95);
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    expect(nlToGraphqlService.translateToGraphQL).toHaveBeenCalledWith(
      input.question,
      input.entityName,
      input.temperature,
    );
  });

  it('should set low temperature for deterministic queries', async () => {
    const input = {
      question: 'Show all users',
      entityName: undefined,
      temperature: 0.1,
    };

    await resolver.askQuery(input, mockUser, 1, mockContext as any);

    expect(nlToGraphqlService.translateToGraphQL).toHaveBeenCalledWith(
      input.question,
      undefined,
      0.1,
    );
  });

  it('should handle query generation failure gracefully', async () => {
    jest
      .spyOn(nlToGraphqlService, 'translateToGraphQL')
      .mockResolvedValueOnce({ query: '', confidence: 0 });

    const input = {
      question: 'Invalid question',
      temperature: 0.1,
    };

    const result = await resolver.askQuery(
      input,
      mockUser,
      1,
      mockContext as any,
    );

    expect(result.confidence).toBe(0);
    expect(result.errorMessage).toBeDefined();
    expect(result.answer).toContain('could not generate');
  });

  it('should handle LLM errors gracefully', async () => {
    jest
      .spyOn(nlToGraphqlService, 'translateToGraphQL')
      .mockRejectedValueOnce(new Error('LLM service unavailable'));

    const input = {
      question: 'Show all entities',
      temperature: 0.1,
    };

    const result = await resolver.askQuery(
      input,
      mockUser,
      1,
      mockContext as any,
    );

    expect(result.confidence).toBe(0);
    expect(result.errorMessage).toContain('LLM service unavailable');
  });

  it('should include execution time metrics', async () => {
    const input = {
      question: 'Show all active entities',
      temperature: 0.1,
    };

    const result = await resolver.askQuery(
      input,
      mockUser,
      1,
      mockContext as any,
    );

    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });
});
