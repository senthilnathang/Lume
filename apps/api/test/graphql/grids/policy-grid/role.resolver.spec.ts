import { PrismaService } from '../../../../src/core/services/prisma.service';
import { RoleManagementService } from '../../../../src/modules/base/services/role-management.service';
import { GqlRbacGuard } from '../../../../src/graphql/guards/gql-rbac.guard';
import { GqlJwtGuard } from '../../../../src/graphql/guards/gql-jwt.guard';
import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { RoleResolver } from '../../../../src/graphql/grids/policy-grid/resolvers/role.resolver';
import { PaginationInput } from '../../../../src/graphql/shared/inputs/pagination.input';

describe('RoleResolver', () => {
  let resolver: RoleResolver;
  const row = { id: 4, name: 'test-role', display_name: 'Test Role', is_system: false };
  const management = {
    get: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(row),
    update: jest.fn().mockResolvedValue({ ...row, display_name: 'Updated Role' }),
    delete: jest.fn().mockResolvedValue(true),
  };

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
      providers: [RoleResolver, { provide: RoleManagementService, useValue: management }, { provide: PrismaService, useValue: { role: { findMany: async () => [] } } }],
    })
      .overrideGuard(GqlJwtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(GqlRbacGuard)
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

    expect(await resolver.createRole(input, mockUser)).toMatchObject({ id: 4, displayName: 'Test Role', isSystem: false });
    expect(management.create).toHaveBeenCalledWith(input, 1);
  });

  it('should update role', async () => {
    const input = { displayName: 'Updated Role' };

    expect(await resolver.updateRole(4, input, mockUser)).toMatchObject({ displayName: 'Updated Role' });
    expect(management.update).toHaveBeenCalledWith(4, input, 1);
  });

  it('should delete role', async () => {
    const result = await resolver.deleteRole(1, mockUser);

    expect(result).toBe(true);
    expect(management.delete).toHaveBeenCalledWith(1, 1);
  });
});
