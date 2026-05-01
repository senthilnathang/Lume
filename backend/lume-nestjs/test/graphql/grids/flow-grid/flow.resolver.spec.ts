import { Test, TestingModule } from '@nestjs/testing';
import { FlowResolver } from '../../../../src/graphql/grids/flow-grid/resolvers/flow.resolver';
import { PaginationInput } from '../../../../src/graphql/shared/inputs/pagination.input';

describe('FlowResolver', () => {
  let resolver: FlowResolver;

  const mockUser = {
    sub: 1,
    email: 'test@test.com',
    role_id: 2,
    role_name: 'admin',
    company_id: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FlowResolver],
    })
      .overrideGuard('GqlJwtGuard')
      .useValue({ canActivate: () => true })
      .overrideGuard('GqlRbacGuard')
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<FlowResolver>(FlowResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should list flows with pagination', async () => {
    const pagination: PaginationInput = {
      page: 1,
      limit: 20,
    };

    const result = await resolver.flows(
      undefined,
      undefined,
      undefined,
      pagination,
      mockUser,
      1,
    );

    expect(result.items).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
  });

  it('should list flows by model', async () => {
    const pagination: PaginationInput = {
      page: 1,
      limit: 20,
    };

    const result = await resolver.flows(
      'entity',
      undefined,
      undefined,
      pagination,
      mockUser,
      1,
    );

    expect(result.items).toBeDefined();
  });

  it('should list flows by trigger type', async () => {
    const pagination: PaginationInput = {
      page: 1,
      limit: 20,
    };

    const result = await resolver.flows(
      undefined,
      'manual',
      undefined,
      pagination,
      mockUser,
      1,
    );

    expect(result.items).toBeDefined();
  });

  it('should list flows by status', async () => {
    const pagination: PaginationInput = {
      page: 1,
      limit: 20,
    };

    const result = await resolver.flows(
      undefined,
      undefined,
      'active',
      pagination,
      mockUser,
      1,
    );

    expect(result.items).toBeDefined();
  });

  it('should get single flow by id', async () => {
    const result = await resolver.flow(1, mockUser);

    expect(result).toBeNull();
  });

  it('should create flow', async () => {
    const input = {
      name: 'Test Flow',
      model: 'entity',
      description: 'Test flow',
      nodes: [{ id: 'node1', type: 'start' }],
    };

    expect(() =>
      resolver.createFlow(input, mockUser, 1),
    ).rejects.toThrow('Not implemented');
  });

  it('should update flow', async () => {
    const input = { status: 'active' };

    expect(() =>
      resolver.updateFlow(1, input, mockUser, 1),
    ).rejects.toThrow('Not implemented');
  });

  it('should delete flow', async () => {
    const result = await resolver.deleteFlow(1, mockUser, 1);

    expect(result).toBe(false);
  });

  it('should publish flow', async () => {
    expect(() =>
      resolver.publishFlow(1, mockUser, 1),
    ).rejects.toThrow('Not implemented');
  });

  it('should throw ForbiddenException when companyId missing', async () => {
    const input = {
      name: 'Test',
      model: 'entity',
    };

    expect(() =>
      resolver.createFlow(input, mockUser, null),
    ).rejects.toThrow('Company ID required');
  });
});
