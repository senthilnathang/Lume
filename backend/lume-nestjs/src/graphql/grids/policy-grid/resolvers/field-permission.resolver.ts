import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
  Context,
} from '@nestjs/graphql';
import { UseGuards, ForbiddenException } from '@nestjs/common';
import { GqlJwtGuard } from '../../../guards/gql-jwt.guard';
import { GqlRbacGuard } from '../../../guards/gql-rbac.guard';
import { GqlCurrentUser } from '../../../decorators/gql-current-user.decorator';
import { Permissions } from '../../../core/decorators/permissions.decorator';
import { PaginationInput } from '../../../shared/inputs/pagination.input';
import { FieldPermissionType } from '../types/field-permission.type';
import { RoleType } from '../types/role.type';
import { SetFieldPermissionInput } from '../inputs/set-field-permission.input';
import { GqlContext, JwtPayload } from '../../../graphql.context';

/**
 * PolicyGrid FieldPermission Resolver
 * Queries and mutations for field-level read/write RBAC
 * Delegates to FieldPermissionService for business logic
 */
@Resolver(() => FieldPermissionType)
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class FieldPermissionResolver {
  constructor() {}

  @Query(() => [FieldPermissionType], { name: 'fieldPermissions' })
  @Permissions('base.field_permissions.read')
  async fieldPermissions(
    @Args('fieldId', { type: () => Int, nullable: true }) fieldId?: number,
    @Args('roleId', { type: () => Int, nullable: true }) roleId?: number,
    @Args('pagination', { nullable: true }) pagination?: PaginationInput,
    @GqlCurrentUser() user?: JwtPayload,
  ): Promise<FieldPermissionType[]> {
    // TODO: Delegate to FieldPermissionService.listFieldPermissions(fieldId, roleId, pagination)
    // Filter by fieldId and/or roleId
    // Return paginated list of field permissions
    return [];
  }

  @Query(() => FieldPermissionType, {
    name: 'fieldPermission',
    nullable: true,
  })
  @Permissions('base.field_permissions.read')
  async fieldPermission(
    @Args('fieldId', { type: () => Int }) fieldId: number,
    @Args('roleId', { type: () => Int }) roleId: number,
    @GqlCurrentUser() user?: JwtPayload,
  ): Promise<FieldPermissionType | null> {
    // TODO: Delegate to FieldPermissionService.getFieldPermission(fieldId, roleId)
    return null;
  }

  @Mutation(() => FieldPermissionType)
  @Permissions('base.field_permissions.write')
  async setFieldPermission(
    @Args('input') input: SetFieldPermissionInput,
    @GqlCurrentUser() user: JwtPayload,
  ): Promise<FieldPermissionType> {
    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    // TODO: Delegate to FieldPermissionService.setFieldPermission(input, userId)
    // - Validate fieldId exists
    // - Validate roleId exists
    // - Create or update EntityFieldPermission row
    // - Audit log the change
    throw new Error('Not implemented');
  }

  @Mutation(() => Boolean)
  @Permissions('base.field_permissions.write')
  async removeFieldPermission(
    @Args('fieldId', { type: () => Int }) fieldId: number,
    @Args('roleId', { type: () => Int }) roleId: number,
    @GqlCurrentUser() user: JwtPayload,
  ): Promise<boolean> {
    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    // TODO: Delegate to FieldPermissionService.removeFieldPermission(fieldId, roleId, userId)
    // - Delete EntityFieldPermission row
    // - Audit log the deletion
    return false;
  }

  @ResolveField('role', () => RoleType, { nullable: true })
  async role(
    @Parent() fieldPerm: FieldPermissionType,
    @Context() ctx: GqlContext,
  ): Promise<RoleType | null> {
    // TODO: Use DataLoader to batch-load roles
    // Load role by roleId from ctx.loaders.roleById
    return null;
  }
}
