import { jest } from '@jest/globals';
import { Reflector } from '@nestjs/core';
import { RbacGuard } from '@core/guards/rbac.guard';
import { Permissions } from '@core/decorators/permissions.decorator';

@Permissions('base.read')
class ProtectedController {
  inherited() {}
  @Permissions('base.read', 'base.write') write() {}
  @Permissions() unrestricted() {}
}

describe('RbacGuard with decorator metadata', () => {
  const context = (method: string, user?: any): any => ({
    getClass: () => ProtectedController,
    getHandler: () => ProtectedController.prototype[method],
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  });
  const service = {
    isAdminRole: (role: string) => ['admin', 'super_admin'].includes(role),
    hasPermission: jest.fn(async (_id: number, permission: string) => permission === 'base.read'),
  };
  const guard = new RbacGuard(service as any, new Reflector());
  beforeEach(() => service.hasPermission.mockClear());
  it('enforces class metadata and uses the authenticated user ID', async () => {
    await expect(guard.canActivate(context('inherited', { id: 7, role_name: 'member' }))).resolves.toBe(true);
    expect(service.hasPermission).toHaveBeenCalledWith(7, 'base.read');
  });
  it('requires every permission on the method', async () => {
    await expect(guard.canActivate(context('write', { id: 7, role_name: 'member' }))).rejects.toThrow('Missing permission: base.write');
  });
  it('denies protected handlers without an authenticated identity', async () => {
    await expect(guard.canActivate(context('inherited'))).rejects.toThrow('User not authenticated');
    await expect(guard.canActivate(context('inherited', {}))).rejects.toThrow('User not authenticated');
    expect(service.hasPermission).not.toHaveBeenCalled();
  });
  it.each(['admin', 'super_admin'])('recognizes the JWT role_name for %s', async role => {
    await expect(guard.canActivate(context('write', { id: 1, role_name: role }))).resolves.toBe(true);
    expect(service.hasPermission).not.toHaveBeenCalled();
  });
  it('supports a method explicitly clearing class permissions', async () => {
    await expect(guard.canActivate(context('unrestricted'))).resolves.toBe(true);
  });
});
