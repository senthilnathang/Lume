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
import { UseGuards } from '@nestjs/common';
import { GqlJwtGuard } from '../../../guards/gql-jwt.guard';
import { GqlRbacGuard } from '../../../guards/gql-rbac.guard';
import { GqlCurrentUser } from '../../../decorators/gql-current-user.decorator';
import { Permissions } from '../../../core/decorators/permissions.decorator';
import { PaginationInput } from '../../../shared/inputs/pagination.input';
import { Paginated } from '../../../shared/types/paginated.type';
import { RoleType } from '../types/role.type';
import { PermissionType } from '../types/permission.type';
import { CreateRoleInput } from '../inputs/create-role.input';
import { UpdateRoleInput } from '../inputs/update-role.input';
import { GqlContext, JwtPayload } from '../../../graphql.context';

/**
 * PolicyGrid Role Resolver
 * Queries and mutations for RBAC role management
 * Delegates to RbacService for business logic
 */
@Resolver(() => RoleType)
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class RoleResolver {
  constructor() {}

  @Query(() => [RoleType], { name: 'roles' })
  @Permissions('base.roles.read')
  async roles(
    @Args('pagination', { nullable: true }) pagination: PaginationInput,
    @GqlCurrentUser() user: JwtPayload,
    @Context() ctx: GqlContext,
  ): Promise<RoleType[]> {
    // TODO: Delegate to RbacService.listRoles(pagination)
    // Filter out system roles if not admin
    // Return paginated role list
    return [];
  }

  @Query(() => RoleType, { name: 'role', nullable: true })
  @Permissions('base.roles.read')
  async role(
    @Args('id', { type: () => Int }) id: number,
    @GqlCurrentUser() user: JwtPayload,
  ): Promise<RoleType | null> {
    // TODO: Delegate to RbacService.getRole(id)
    // Check if system role and user is admin
    return null;
  }

  @Mutation(() => RoleType)
  @Permissions('base.roles.create')
  async createRole(
    @Args('input') input: CreateRoleInput,
    @GqlCurrentUser() user: JwtPayload,
  ): Promise<RoleType> {
    // TODO: Delegate to RbacService.createRole(input, userId)
    // - Validate name is unique
    // - Create role with isSystem = false
    // - Audit log the creation
    throw new Error('Not implemented');
  }

  @Mutation(() => RoleType)
  @Permissions('base.roles.update')
  async updateRole(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateRoleInput,
    @GqlCurrentUser() user: JwtPayload,
  ): Promise<RoleType> {
    // TODO: Delegate to RbacService.updateRole(id, input, userId)
    // - Prevent updating system roles
    // - Audit log the changes
    throw new Error('Not implemented');
  }

  @Mutation(() => Boolean)
  @Permissions('base.roles.delete')
  async deleteRole(
    @Args('id', { type: () => Int }) id: number,
    @GqlCurrentUser() user: JwtPayload,
  ): Promise<boolean> {
    // TODO: Delegate to RbacService.deleteRole(id, userId)
    // - Prevent deleting system roles
    // - Check no users are assigned to this role
    // - Cascade delete RolePermission + EntityFieldPermission entries
    return false;
  }

  @ResolveField('permissions', () => [PermissionType])
  async permissions(
    @Parent() role: RoleType,
    @Context() ctx: GqlContext,
  ): Promise<PermissionType[]> {
    // TODO: Use DataLoader to batch-load permissions for multiple roles
    // Load from RolePermission join table
    return [];
  }
}
