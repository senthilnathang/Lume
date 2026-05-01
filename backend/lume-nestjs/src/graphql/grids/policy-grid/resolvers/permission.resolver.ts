import {
  Resolver,
  Query,
  Args,
  Int,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlJwtGuard } from '../../../guards/gql-jwt.guard';
import { GqlRbacGuard } from '../../../guards/gql-rbac.guard';
import { GqlCurrentUser } from '../../../decorators/gql-current-user.decorator';
import { Permissions } from '../../../core/decorators/permissions.decorator';
import { PaginationInput } from '../../../shared/inputs/pagination.input';
import { PermissionType } from '../types/permission.type';
import { JwtPayload } from '../../../graphql.context';

/**
 * PolicyGrid Permission Resolver
 * Read-only queries for permissions
 * Permissions are system-defined and managed via manifest installation
 */
@Resolver(() => PermissionType)
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class PermissionResolver {
  constructor() {}

  @Query(() => [PermissionType], { name: 'permissions' })
  @Permissions('base.roles.read')
  async permissions(
    @Args('pagination', { nullable: true }) pagination: PaginationInput,
    @Args('category', { nullable: true }) category?: string,
    @GqlCurrentUser() user?: JwtPayload,
  ): Promise<PermissionType[]> {
    // TODO: Delegate to PermissionService.listPermissions(pagination, category)
    // Filter by category if provided
    // Return all active permissions
    return [];
  }

  @Query(() => PermissionType, { name: 'permission', nullable: true })
  @Permissions('base.roles.read')
  async permission(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<PermissionType | null> {
    // TODO: Delegate to PermissionService.getPermission(id)
    return null;
  }
}
