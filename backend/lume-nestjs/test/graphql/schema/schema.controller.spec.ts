import { Test, TestingModule } from '@nestjs/testing';
import { SchemaController } from '../../../src/graphql/schema/schema.controller';
import { SchemaExportService } from '../../../src/graphql/schema/schema-export.service';

describe('SchemaController', () => {
  let controller: SchemaController;
  let service: SchemaExportService;

  const mockSchema: any = {}; // Mock GraphQLSchema

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchemaController],
      providers: [
        {
          provide: 'GraphQL_SCHEMA',
          useValue: mockSchema,
        },
        {
          provide: SchemaExportService,
          useValue: {
            exportAsSDL: jest.fn().mockReturnValue('schema { query: Query }'),
            getIntrospectionQuery: jest
              .fn()
              .mockReturnValue('{ __schema { types } }'),
            generateMarkdownDocumentation: jest
              .fn()
              .mockReturnValue('# GraphQL API'),
            generateClientExamples: jest
              .fn()
              .mockReturnValue('query GetEntities { ... }'),
          },
        },
      ],
    }).compile();

    controller = module.get<SchemaController>(SchemaController);
    service = module.get<SchemaExportService>(SchemaExportService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get schema SDL', () => {
    const result = controller.getSchemaSDL();

    expect(result).toBeDefined();
    expect(result).toContain('schema');
    expect(service.exportAsSDL).toHaveBeenCalledWith(mockSchema);
  });

  it('should get introspection query', () => {
    const result = controller.getIntrospectionQuery();

    expect(result).toBeDefined();
    expect(result).toContain('__schema');
    expect(service.getIntrospectionQuery).toHaveBeenCalled();
  });

  it('should get documentation', () => {
    const result = controller.getDocumentation();

    expect(result).toBeDefined();
    expect(result).toContain('GraphQL API');
    expect(service.generateMarkdownDocumentation).toHaveBeenCalledWith(
      mockSchema,
    );
  });

  it('should get client examples', () => {
    const result = controller.getClientExamples();

    expect(result).toBeDefined();
    expect(result).toContain('GetEntities');
    expect(service.generateClientExamples).toHaveBeenCalled();
  });
});
