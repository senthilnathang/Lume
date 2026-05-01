import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { GqlJwtGuard } from '../../../src/graphql/guards/gql-jwt.guard';

describe('GqlJwtGuard', () => {
  let guard: GqlJwtGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GqlJwtGuard],
    }).compile();

    guard = module.get<GqlJwtGuard>(GqlJwtGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should extract request from GraphQL context', () => {
    const mockReq = {
      user: {
        sub: 1,
        email: 'test@test.com',
        role_name: 'admin',
      },
    };

    const mockContext = {
      req: mockReq,
    };

    const gqlContext = {
      getContext: () => mockContext,
    };

    jest
      .spyOn(GqlExecutionContext, 'create')
      .mockReturnValue(gqlContext as any);

    const mockExecutionContext = {} as ExecutionContext;

    const result = guard.getRequest(mockExecutionContext);

    expect(result).toBe(mockReq);
  });

  it('should bypass public routes', async () => {
    const mockReq = {
      user: null,
    };

    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockReq,
      }),
      getHandler: () => ({
        __public__: true,
      }),
      getClass: () => ({}),
    } as any;

    const reflectorSpy = jest
      .spyOn(guard['reflector'], 'getAllAndOverride')
      .mockReturnValue(true);

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    reflectorSpy.mockRestore();
  });
});
