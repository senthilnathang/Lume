import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowResolver } from '../../../../src/graphql/grids/flow-grid/resolvers/workflow.resolver';
import { PaginationInput } from '../../../../src/graphql/shared/inputs/pagination.input';

describe('WorkflowResolver', () => {
  let resolver: WorkflowResolver;

  const mockUser = {
    sub: 1,
    email: 'test@test.com',
    role_id: 2,
    role_name: 'admin',
    company_id: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkflowResolver],
    })
      .overrideGuard('GqlJwtGuard')
      .useValue({ canActivate: () => true })
      .overrideGuard('GqlRbacGuard')
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<WorkflowResolver>(WorkflowResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should list workflows with pagination', async () => {
    const pagination: PaginationInput = {
      page: 1,
      limit: 20,
    };

    const result = await resolver.workflows(
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

  it('should list workflows by model', async () => {
    const pagination: PaginationInput = {
      page: 1,
      limit: 20,
    };

    const result = await resolver.workflows(
      'entity',
      undefined,
      pagination,
      mockUser,
      1,
    );

    expect(result.items).toBeDefined();
  });

  it('should list workflows by status', async () => {
    const pagination: PaginationInput = {
      page: 1,
      limit: 20,
    };

    const result = await resolver.workflows(
      undefined,
      'draft',
      pagination,
      mockUser,
      1,
    );

    expect(result.items).toBeDefined();
  });

  it('should get single workflow by id', async () => {
    const result = await resolver.workflow(1, mockUser);

    expect(result).toBeNull();
  });

  it('should create workflow', async () => {
    const input = {
      name: 'Test Workflow',
      model: 'entity',
      description: 'Test workflow',
      states: [{ id: 'draft', label: 'Draft' }],
    };

    expect(() =>
      resolver.createWorkflow(input, mockUser, 1),
    ).rejects.toThrow('Not implemented');
  });

  it('should update workflow', async () => {
    const input = { status: 'active' };

    expect(() =>
      resolver.updateWorkflow(1, input, mockUser, 1),
    ).rejects.toThrow('Not implemented');
  });

  it('should delete workflow', async () => {
    const result = await resolver.deleteWorkflow(1, mockUser, 1);

    expect(result).toBe(false);
  });

  it('should publish workflow', async () => {
    expect(() =>
      resolver.publishWorkflow(1, mockUser, 1),
    ).rejects.toThrow('Not implemented');
  });

  it('should trigger workflow execution', async () => {
    const input = {
      workflowId: 1,
      recordId: 1,
      payload: { status: 'active' },
    };

    const result = await resolver.triggerWorkflow(input, mockUser, 1);

    expect(result).toBe(false);
  });

  it('should throw ForbiddenException when companyId missing', async () => {
    const input = {
      name: 'Test',
      model: 'entity',
    };

    expect(() =>
      resolver.createWorkflow(input, mockUser, null),
    ).rejects.toThrow('Company ID required');
  });
});
