import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '@core/services/rbac.service';
import { PERMISSIONS_KEY } from '@core/decorators/permissions.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private rbacService: RbacService, private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions?.length) return true;

    const user = context.switchToHttp().getRequest().user;
    if (!user?.id) throw new ForbiddenException('User not authenticated');
    if (this.rbacService.isAdminRole(user.role_name)) return true;

    for (const permission of requiredPermissions) {
      if (!await this.rbacService.hasPermission(user.id, permission)) {
        throw new ForbiddenException(`Missing permission: ${permission}`);
      }
    }
    return true;
  }
}
