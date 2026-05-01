import { Test, TestingModule } from '@nestjs/testing';
import { PermissionResolver } from '../../../../src/graphql/grids/policy-grid/resolvers/permission.resolver';
import { PaginationInput } from '../../../../src/graphql/shared/inputs/pagination.input';

describe('PermissionResolver', () => {
  let resolver: PermissionResolver;

  const mockUser = {
    sub: 1,
    email: 'test@test.com',
    role_id: 2,
    role_name: 'admin',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionResolver],
    })
      .overrideGuard('GqlJwtGuard')
      .useValue({ canActivate: () => true })
      .overrideGuard('GqlRbacGuard')
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<PermissionResolver>(PermissionResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should list permissions with pagination', async () => {
    const pagination: PaginationInput = {
      page: 1,
      limit: 20,
    };

    const result = await resolver.permissions(pagination, undefined, mockUser);

    expect(Array.isArray(result)).toBe(true);
  });

  it('should list permissions by category', async () => {
    const pagination: PaginationInput = {
      page: 1,
      limit: 20,
    };

    const result = await resolver.permissions(
      pagination,
      'base.entities',
      mockUser,
    );

    expect(Array.isArray(result)).toBe(true);
  });

  it('should get single permission by id', async () => {
    const result = await resolver.permission(1);

    expect(result).toBeNull();
  });
});
