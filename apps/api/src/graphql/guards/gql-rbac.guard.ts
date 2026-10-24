import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../../core/services/rbac.service';
import { PERMISSIONS_KEY } from '../../core/decorators/permissions.decorator';

/**
 * GraphQL-aware RBAC guard.
 * Checks permissions from @Permissions decorator metadata.
 * Handles both HTTP and GraphQL execution contexts.
 * Admin/super_admin roles bypass permission checks.
 */
@Injectable()
export class GqlRbacGuard implements CanActivate {
  constructor(
    private rbacService: RbacService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlContext = GqlExecutionContext.create(context);
    const { req } = gqlContext.getContext<{ req: any }>();

    if (!req || !req.user) {
      throw new ForbiddenException('User not authenticated');
    }

    const user = req.user;

    // Get required permissions from handler and class metadata
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Admin/super_admin bypass all permission checks
    if (this.rbacService.isAdminRole(user?.role_name)) {
      return true;
    }

    // Check each required permission
    for (const permission of requiredPermissions) {
      const hasPermission = await this.rbacService.hasPermission(
        user.sub, // Use 'sub' from JWT payload, not 'id'
        permission,
      );
      if (!hasPermission) {
        throw new ForbiddenException(`Missing permission: ${permission}`);
      }
    }

    return true;
  }
}
