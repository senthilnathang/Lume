import { PrismaService } from '../../../../src/core/services/prisma.service';
import { FieldPermissionService } from '../../../../src/modules/base/services/field-permission.service';
import { GqlRbacGuard } from '../../../../src/graphql/guards/gql-rbac.guard';
import { GqlJwtGuard } from '../../../../src/graphql/guards/gql-jwt.guard';
import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { FieldPermissionResolver } from '../../../../src/graphql/grids/policy-grid/resolvers/field-permission.resolver';
import { PaginationInput } from '../../../../src/graphql/shared/inputs/pagination.input';

describe('FieldPermissionResolver', () => {
  let resolver: FieldPermissionResolver;
  const permission = { id: 1, fieldId: 1, roleId: 2, canRead: true, canWrite: false, createdAt: new Date() };
  const service = {
    getFieldPermission: jest.fn().mockResolvedValue(null),
    setFieldPermission: jest.fn().mockResolvedValue({ data: permission }),
    removeFieldPermission: jest.fn().mockResolvedValue(false),
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
      providers: [FieldPermissionResolver,
        { provide: FieldPermissionService, useValue: service },
        { provide: PrismaService, useValue: { entityFieldPermission: { findMany: async () => [] } } }],
    })
      .overrideGuard(GqlJwtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(GqlRbacGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<FieldPermissionResolver>(FieldPermissionResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should list field permissions', async () => {
    const pagination: PaginationInput = {
      page: 1,
      limit: 20,
    };

    const result = await resolver.fieldPermissions(
      undefined,
      undefined,
      pagination,
      mockUser,
    );

    expect(Array.isArray(result)).toBe(true);
  });

  it('should list field permissions by fieldId', async () => {
    const pagination: PaginationInput = {
      page: 1,
      limit: 20,
    };

    const result = await resolver.fieldPermissions(1, undefined, pagination);

    expect(Array.isArray(result)).toBe(true);
  });

  it('should list field permissions by roleId', async () => {
    const pagination: PaginationInput = {
      page: 1,
      limit: 20,
    };

    const result = await resolver.fieldPermissions(
      undefined,
      2,
      pagination,
      mockUser,
    );

    expect(Array.isArray(result)).toBe(true);
  });

  it('should get single field permission', async () => {
    const result = await resolver.fieldPermission(1, 2, mockUser);

    expect(result).toBeNull();
  });

  it('should set field permission', async () => {
    const input = {
      fieldId: 1,
      roleId: 2,
      canRead: true,
      canWrite: false,
    };

    const result = await resolver.setFieldPermission(input, mockUser);
    expect(result).toMatchObject({ ...permission, isMasked: false, maskChar: '*' });
    expect(service.setFieldPermission).toHaveBeenCalledWith(1, 2, true, false, undefined, undefined);
  });

  it('should remove field permission', async () => {
    const result = await resolver.removeFieldPermission(1, 2, mockUser);

    expect(result).toBe(false);
    expect(service.removeFieldPermission).toHaveBeenCalledWith(1, 2);
  });

  it('should resolve role using DataLoader', async () => {
    const fieldPerm = { id: 1, fieldId: 1, roleId: 2 } as any;

    const result = await resolver.role(fieldPerm, mockContext as any);

    expect(result).toEqual({});
    expect(mockContext.loaders.roleById.load).toHaveBeenCalledWith(2);
  });
});
