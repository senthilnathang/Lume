import { PrismaService } from '@core/services/prisma.service';
import { RoleManagementService } from '../../../../modules/base/services/role-management.service';
import { FieldPermissionType } from '../types/field-permission.type';
import { normalizePagination } from '../../../shared/inputs/pagination.input';
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
import { Permissions } from '../../../../core/decorators/permissions.decorator';
import { PaginationInput } from '../../../shared/inputs/pagination.input';
import { RoleType } from '../types/role.type';
import { PermissionType } from '../types/permission.type';
import { CreateRoleInput } from '../inputs/create-role.input';
import { UpdateRoleInput } from '../inputs/update-role.input';
import type { GqlContext, JwtPayload } from '../../../graphql.context';

/**
 * PolicyGrid Role Resolver
 * Queries and mutations for RBAC role management
 * Delegates role mutations to RoleManagementService
 */
@Resolver(() => RoleType)
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class RoleResolver {
  constructor(private readonly prisma: PrismaService, private readonly management: RoleManagementService) {}

  private mapRole(role: any) {
    return { ...role, displayName: role.display_name, isSystem: role.is_system ?? false, isActive: role.isActive ?? true };
  }

  private clearRole(ctx: GqlContext | undefined, id: number) {
    ctx?.loaders.roleById.clear(id);
    ctx?.loaders.permissionsByRoleId.clear(id);
    ctx?.loaders.fieldPermissionsByRoleId.clear(id);
  }

  @Query(() => [RoleType], { name: 'roles' })
  @Permissions('base.roles.read')
  async roles(
    @Args('pagination', { nullable: true }) pagination: PaginationInput,
    @GqlCurrentUser() user: JwtPayload,
    @Context() ctx: GqlContext,
  ): Promise<Omit<RoleType, 'permissions' | 'fieldPermissions'>[]> {
    const { page, limit } = normalizePagination(pagination);
    const roles = await this.prisma.role.findMany({ skip: (page - 1) * limit, take: limit, orderBy: { id: 'asc' } });
    return roles.map(role => this.mapRole(role));
  }

  @Query(() => RoleType, { name: 'role', nullable: true })
  @Permissions('base.roles.read')
  async role(
    @Args('id', { type: () => Int }) id: number,
    @GqlCurrentUser() user: JwtPayload,
  ): Promise<RoleType | null> {
    const role = await this.management.get(id);
    return role ? this.mapRole(role) : null;
  }

  @Mutation(() => RoleType)
  @Permissions('base.roles.create')
  async createRole(
    @Args('input') input: CreateRoleInput,
    @GqlCurrentUser() user: JwtPayload,
  ): Promise<RoleType> {
    return this.mapRole(await this.management.create(input, user.sub));
  }

  @Mutation(() => RoleType)
  @Permissions('base.roles.update')
  async updateRole(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateRoleInput,
    @GqlCurrentUser() user: JwtPayload,
    @Context() ctx?: GqlContext,
  ): Promise<RoleType> {
    const role = await this.management.update(id, input, user.sub);
    this.clearRole(ctx, id);
    return this.mapRole(role);
  }

  @Mutation(() => Boolean)
  @Permissions('base.roles.delete')
  async deleteRole(
    @Args('id', { type: () => Int }) id: number,
    @GqlCurrentUser() user: JwtPayload,
    @Context() ctx?: GqlContext,
  ): Promise<boolean> {
    const deleted = await this.management.delete(id, user.sub);
    this.clearRole(ctx, id);
    return deleted;
  }

  @ResolveField('permissions', () => [PermissionType])
  async permissions(
    @Parent() role: RoleType,
    @Context() ctx: GqlContext,
  ): Promise<PermissionType[]> {
    return ctx.loaders.permissionsByRoleId.load(role.id);
  }

  @ResolveField('fieldPermissions', () => [FieldPermissionType])
  async fieldPermissions(@Parent() role: RoleType, @Context() ctx: GqlContext): Promise<FieldPermissionType[]> {
    return ctx.loaders.fieldPermissionsByRoleId.load(role.id);
  }
}
