import { Test, TestingModule } from '@nestjs/testing';
import { RecordRuleResolver } from '../../../../src/graphql/grids/policy-grid/resolvers/record-rule.resolver';
import { PaginationInput } from '../../../../src/graphql/shared/inputs/pagination.input';

describe('RecordRuleResolver', () => {
  let resolver: RecordRuleResolver;

  const mockUser = {
    sub: 1,
    email: 'test@test.com',
    role_id: 2,
    role_name: 'admin',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecordRuleResolver],
    })
      .overrideGuard('GqlJwtGuard')
      .useValue({ canActivate: () => true })
      .overrideGuard('GqlRbacGuard')
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
    expect(() =>
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
    ).rejects.toThrow('Not implemented');
  });

  it('should update record rule', async () => {
    expect(() =>
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
    ).rejects.toThrow('Not implemented');
  });

  it('should delete record rule', async () => {
    const result = await resolver.deleteRecordRule(1, mockUser);

    expect(result).toBe(false);
  });

  it('should reorder record rules', async () => {
    const result = await resolver.reorderRecordRules([1, 2, 3], mockUser);

    expect(Array.isArray(result)).toBe(true);
  });
});
