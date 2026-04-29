import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { RbacGuard } from '@core/guards/rbac.guard';
import { RbacService } from '@core/services/rbac.service';

describe('RbacGuard', () => {
  let guard: RbacGuard;
  let rbacService: any;

  beforeEach(() => {
    rbacService = {
      hasPermission: jest.fn(),
      isAdminRole: jest.fn(),
    };

    guard = new RbacGuard(rbacService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow admin users', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 1, role_id: 1, role: { name: 'admin' } },
        }),
      }),
      getHandler: () => ({ __permissions__: ['create_user'] }),
    };

    (rbacService.isAdminRole as jest.Mock).mockReturnValue(true);

    const result = await guard.canActivate(mockContext as any);
    expect(result).toBe(true);
  });

  it('should deny users without required permission', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 2, role_id: 2, role: { name: 'user' } },
        }),
      }),
      getHandler: () => ({ __permissions__: ['delete_user'] }),
    };

    (rbacService.isAdminRole as jest.Mock).mockReturnValue(false);
    (rbacService.hasPermission as jest.Mock).mockResolvedValue(false);

    try {
      await guard.canActivate(mockContext as any);
      expect(true).toBe(false); // Should have thrown
    } catch (error) {
      expect(error instanceof ForbiddenException).toBe(true);
      const response = (error as ForbiddenException).getResponse() as any;
      expect(response.message).toContain('Missing permission');
    }
  });

  it('should allow requests with no permission requirements', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 2, role_id: 2, role: { name: 'user' } },
        }),
      }),
      getHandler: () => ({ __permissions__: [] }),
    };

    const result = await guard.canActivate(mockContext as any);
    expect(result).toBe(true);
  });
});
