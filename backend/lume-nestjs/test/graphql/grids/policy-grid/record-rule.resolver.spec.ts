import { GqlRbacGuard } from '../../../../src/graphql/guards/gql-rbac.guard';
import { RecordRuleManagementService } from '../../../../src/modules/base/services/record-rule-management.service';
import { jest } from '@jest/globals';
import { GqlJwtGuard } from '../../../../src/graphql/guards/gql-jwt.guard';
import { Test, TestingModule } from '@nestjs/testing';
import { RecordRuleResolver } from '../../../../src/graphql/grids/policy-grid/resolvers/record-rule.resolver';
import { PaginationInput } from '../../../../src/graphql/shared/inputs/pagination.input';

describe('RecordRuleResolver', () => {
  let resolver: RecordRuleResolver;
  const service = {
    list: jest.fn().mockResolvedValue([]), get: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 1 }), update: jest.fn().mockResolvedValue({ id: 1 }),
    delete: jest.fn().mockResolvedValue(true), reorder: jest.fn().mockResolvedValue([]),
  };

  const mockUser = {
    sub: 1,
    email: 'test@test.com',
    role_id: 2,
    role_name: 'admin',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecordRuleResolver, { provide: RecordRuleManagementService, useValue: service }],
    })
      .overrideGuard(GqlJwtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(GqlRbacGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<RecordRuleResolver>(RecordRuleResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should list record rules', async () => {
    const pagination: PaginationInput = {
      page: 1,
      limit: 20,
    };

    const result = await resolver.recordRules(undefined, pagination, mockUser);

    expect(Array.isArray(result)).toBe(true);
  });

  it('should list record rules by modelName', async () => {
    const pagination: PaginationInput = {
      page: 1,
      limit: 20,
    };

    const result = await resolver.recordRules('entity', pagination, mockUser);

    expect(Array.isArray(result)).toBe(true);
  });

  it('should get single record rule by id', async () => {
    const result = await resolver.recordRule(1, mockUser);

    expect(result).toBeNull();
  });

  it('should create record rule', async () => {
    await expect(
      resolver.createRecordRule(
        'test-rule',
        'entity',
        'read',
        '[{"field":"status","value":"active"}]',
        undefined,
        undefined,
        10,
        mockUser,
      ),
    ).resolves.toEqual({ id: 1 });
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'test-rule', sequence: 10 }), 1);
  });

  it('should update record rule', async () => {
    await expect(
      resolver.updateRecordRule(
        1,
        'updated-rule',
        'read',
        undefined,
        undefined,
        undefined,
        true,
        undefined,
        mockUser,
      ),
    ).resolves.toEqual({ id: 1 });
    expect(service.update).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'updated-rule' }), 1);
  });

  it('should delete record rule', async () => {
    const result = await resolver.deleteRecordRule(1, mockUser);

    expect(result).toBe(true);
    expect(service.delete).toHaveBeenCalledWith(1, 1);
  });

  it('should reorder record rules', async () => {
    const result = await resolver.reorderRecordRules([1, 2, 3], mockUser);

    expect(Array.isArray(result)).toBe(true);
  });
});
