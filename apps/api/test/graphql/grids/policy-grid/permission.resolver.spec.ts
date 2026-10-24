import { GqlRbacGuard } from '../../../../src/graphql/guards/gql-rbac.guard';
import { PrismaService } from '../../../../src/core/services/prisma.service';
import { jest } from '@jest/globals';
import { GqlJwtGuard } from '../../../../src/graphql/guards/gql-jwt.guard';
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionResolver } from '../../../../src/graphql/grids/policy-grid/resolvers/permission.resolver';
import { PaginationInput } from '../../../../src/graphql/shared/inputs/pagination.input';

describe('PermissionResolver', () => {
  let resolver: PermissionResolver;
  const prisma = { permission: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
  } };

  const mockUser = {
    sub: 1,
    email: 'test@test.com',
    role_id: 2,
    role_name: 'admin',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionResolver, { provide: PrismaService, useValue: prisma }],
    })
      .overrideGuard(GqlJwtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(GqlRbacGuard)
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
    expect(prisma.permission.findMany).toHaveBeenCalledWith({
      where: { isActive: true }, orderBy: { id: 'asc' }, skip: 0, take: 20,
    });
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
    expect(prisma.permission.findMany).toHaveBeenCalledWith({
      where: { isActive: true, category: 'base.entities' }, orderBy: { id: 'asc' }, skip: 0, take: 20,
    });
  });

  it('should get single permission by id', async () => {
    const result = await resolver.permission(1);

    expect(result).toBeNull();
    expect(prisma.permission.findFirst).toHaveBeenCalledWith({ where: { id: 1, isActive: true } });
  });
});
