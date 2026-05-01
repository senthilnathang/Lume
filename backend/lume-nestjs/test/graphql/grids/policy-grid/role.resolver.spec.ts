import { Test, TestingModule } from '@nestjs/testing';
import { RoleResolver } from '../../../../src/graphql/grids/policy-grid/resolvers/role.resolver';
import { PaginationInput } from '../../../../src/graphql/shared/inputs/pagination.input';

describe('RoleResolver', () => {
  let resolver: RoleResolver;

  const mockUser = {
    sub: 1,
    email: 'test@test.com',
    role_id: 2,
    role_name: 'admin',
  };

  const mockContext = {
    loaders: {
      roleById: {
        load: jest.fn().mockResolvedValue({}),
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoleResolver],
    })
      .overrideGuard('GqlJwtGuard')
      .useValue({ canActivate: () => true })
      .overrideGuard('GqlRbacGuard')
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<RoleResolver>(RoleResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should list roles with pagination', async () => {
    const pagination: PaginationInput = {
      page: 1,
      limit: 20,
    };

    const result = await resolver.roles(pagination, mockUser, mockContext as any);

    expect(Array.isArray(result)).toBe(true);
  });

  it('should get single role by id', async () => {
    const result = await resolver.role(1, mockUser);

    expect(result).toBeNull();
  });

  it('should create role', async () => {
    const input = {
      name: 'test-role',
      displayName: 'Test Role',
      description: 'Test role description',
    };

    expect(() => resolver.createRole(input, mockUser)).rejects.toThrow(
      'Not implemented',
    );
  });

  it('should update role', async () => {
    const input = { displayName: 'Updated Role' };

    expect(() =>
      resolver.updateRole(1, input, mockUser),
    ).rejects.toThrow('Not implemented');
  });

  it('should delete role', async () => {
    const result = await resolver.deleteRole(1, mockUser);

    expect(result).toBe(false);
  });
});
