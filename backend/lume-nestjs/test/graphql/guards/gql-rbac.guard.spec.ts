import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Reflector } from '@nestjs/core';
import { GqlRbacGuard } from '../../../src/graphql/guards/gql-rbac.guard';
import { RbacService } from '../../../src/core/services/rbac.service';

describe('GqlRbacGuard', () => {
  let guard: GqlRbacGuard;
  let rbacService: RbacService;
  let reflector: Reflector;

  beforeEach(async () => {
    const mockRbacService = {
      isAdminRole: jest.fn(),
      hasPermission: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GqlRbacGuard,
        {
          provide: RbacService,
          useValue: mockRbacService,
        },
        Reflector,
      ],
    }).compile();

    guard = module.get<GqlRbacGuard>(GqlRbacGuard);
    rbacService = module.get<RbacService>(RbacService);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when no permissions required', async () => {
    const mockReq = {
      user: { sub: 1, role_name: 'member' },
    };

    const mockContext = { req: mockReq };
    const gqlContext = { getContext: () => mockContext };

    jest
      .spyOn(GqlExecutionContext, 'create')
      .mockReturnValue(gqlContext as any);

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(undefined);

    const mockExecutionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
  });

  it('should bypass permissions for admin role', async () => {
    const mockReq = {
      user: { sub: 1, role_name: 'admin' },
    };

    const mockContext = { req: mockReq };
    const gqlContext = { getContext: () => mockContext };

    jest
      .spyOn(GqlExecutionContext, 'create')
      .mockReturnValue(gqlContext as any);

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['base.entities.read']);

    (rbacService.isAdminRole as jest.Mock).mockReturnValue(true);

    const mockExecutionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    expect(rbacService.hasPermission).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException when missing permission', async () => {
    const mockReq = {
      user: { sub: 1, role_name: 'member' },
    };

    const mockContext = { req: mockReq };
    const gqlContext = { getContext: () => mockContext };

    jest
      .spyOn(GqlExecutionContext, 'create')
      .mockReturnValue(gqlContext as any);

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['base.entities.read']);

    (rbacService.isAdminRole as jest.Mock).mockReturnValue(false);
    (rbacService.hasPermission as jest.Mock).mockResolvedValue(false);

    const mockExecutionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;

    await expect(
      guard.canActivate(mockExecutionContext),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user not authenticated', async () => {
    const mockContext = { req: {} };
    const gqlContext = { getContext: () => mockContext };

    jest
      .spyOn(GqlExecutionContext, 'create')
      .mockReturnValue(gqlContext as any);

    const mockExecutionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;

    await expect(
      guard.canActivate(mockExecutionContext),
    ).rejects.toThrow('User not authenticated');
  });
});
