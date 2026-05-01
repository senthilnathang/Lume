import { Test, TestingModule } from '@nestjs/testing';
import { EntityResolver } from '../../../../src/graphql/grids/data-grid/resolvers/entity.resolver';
import { PaginationInput } from '../../../../src/graphql/shared/inputs/pagination.input';

describe('EntityResolver', () => {
  let resolver: EntityResolver;

  const mockUser = {
    sub: 1,
    email: 'test@test.com',
    role_id: 2,
    role_name: 'admin',
  };

  const mockContext = {
    loaders: {
      entityFieldsByEntityId: {
        load: jest.fn().mockResolvedValue([]),
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EntityResolver],
    })
      .overrideGuard('GqlJwtGuard')
      .useValue({ canActivate: () => true })
      .overrideGuard('GqlRbacGuard')
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<EntityResolver>(EntityResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should list entities with pagination', async () => {
    const pagination: PaginationInput = {
      page: 1,
      limit: 20,
    };

    const result = await resolver.entities(pagination, mockUser, 1);

    expect(Array.isArray(result)).toBe(true);
  });

  it('should resolve entity fields using DataLoader', async () => {
    const entity = { id: 1, name: 'TestEntity' } as any;

    const fields = await resolver.fields(entity, mockContext as any);

    expect(mockContext.loaders.entityFieldsByEntityId.load).toHaveBeenCalledWith(1);
  });
});
