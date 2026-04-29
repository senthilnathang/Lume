import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RbacService } from '@core/services/rbac.service';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private rbacService: RbacService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();

    // Get required permissions from handler metadata
    const requiredPermissions = (handler as any).__permissions__ || [];

    if (requiredPermissions.length === 0) {
      return true; // No permissions required
    }

    const user = request.user;
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Admin/super_admin bypass
    if (this.rbacService.isAdminRole(user?.role?.name)) {
      return true;
    }

    // Check each required permission
    for (const permission of requiredPermissions) {
      const hasPermission = await this.rbacService.hasPermission(user.id, permission);
      if (!hasPermission) {
        throw new ForbiddenException(`Missing permission: ${permission}`);
      }
    }

    return true;
  }
}
