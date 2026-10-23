import { PrismaService } from '@core/services/prisma.service';
import type { EntityFieldPermission } from '@prisma/client';
import { FieldPermissionService } from '../../../../modules/base/services/field-permission.service';
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
import { UseGuards, ForbiddenException } from '@nestjs/common';
import { GqlJwtGuard } from '../../../guards/gql-jwt.guard';
import { GqlRbacGuard } from '../../../guards/gql-rbac.guard';
import { GqlCurrentUser } from '../../../decorators/gql-current-user.decorator';
import { Permissions } from '../../../../core/decorators/permissions.decorator';
import { PaginationInput } from '../../../shared/inputs/pagination.input';
import { FieldPermissionType } from '../types/field-permission.type';
import { RoleType } from '../types/role.type';
import { SetFieldPermissionInput } from '../inputs/set-field-permission.input';
import type { GqlContext, JwtPayload } from '../../../graphql.context';

/**
 * PolicyGrid FieldPermission Resolver
 * Queries and mutations for field-level read/write RBAC
 * Delegates to FieldPermissionService for business logic
 */
@Resolver(() => FieldPermissionType)
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class FieldPermissionResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: FieldPermissionService,
  ) {}

  private toGraphQL(row: EntityFieldPermission): FieldPermissionType {
    return { ...row, canRead: row.canRead ?? true, canWrite: row.canWrite ?? false,
      isMasked: row.isMasked ?? false, maskChar: row.maskChar ?? '*', updatedAt: row.createdAt };
  }

  @Query(() => [FieldPermissionType], { name: 'fieldPermissions' })
  @Permissions('base.field_permissions.read')
  async fieldPermissions(
    @Args('fieldId', { type: () => Int, nullable: true }) fieldId?: number,
    @Args('roleId', { type: () => Int, nullable: true }) roleId?: number,
    @Args('pagination', { nullable: true }) pagination?: PaginationInput,
    @GqlCurrentUser() user?: JwtPayload,
  ): Promise<FieldPermissionType[]> {
    const { page, limit } = normalizePagination(pagination);
    const rows = await this.prisma.entityFieldPermission.findMany({
      where: { ...(fieldId == null ? {} : { fieldId }), ...(roleId == null ? {} : { roleId }),
        field: { deletedAt: null, entity: { deletedAt: null } } },
      skip: (page - 1) * limit, take: limit, orderBy: { id: 'asc' },
    });
    return rows.map(row => this.toGraphQL(row));
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
    const row = await this.permissions.getFieldPermission(fieldId, roleId);
    return row ? this.toGraphQL(row) : null;
  }

  @Mutation(() => FieldPermissionType)
  @Permissions('base.field_permissions.write')
  async setFieldPermission(
    @Args('input') input: SetFieldPermissionInput,
    @GqlCurrentUser() user: JwtPayload,
    @Context() ctx?: GqlContext,
  ): Promise<FieldPermissionType> {
    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    const result = await this.permissions.setFieldPermission(
      input.fieldId, input.roleId, input.canRead === undefined ? true : input.canRead,
      input.canWrite === undefined ? false : input.canWrite, input.isMasked, input.maskChar,
    );
    ctx?.loaders.fieldPermissionsByRoleId.clear(input.roleId);
    return this.toGraphQL(result.data);
  }

  @Mutation(() => Boolean)
  @Permissions('base.field_permissions.write')
  async removeFieldPermission(
    @Args('fieldId', { type: () => Int }) fieldId: number,
    @Args('roleId', { type: () => Int }) roleId: number,
    @GqlCurrentUser() user: JwtPayload,
    @Context() ctx?: GqlContext,
  ): Promise<boolean> {
    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    const removed = await this.permissions.removeFieldPermission(fieldId, roleId);
    ctx?.loaders.fieldPermissionsByRoleId.clear(roleId);
    return removed;
  }

  @ResolveField('role', () => RoleType, { nullable: true })
  async role(
    @Parent() fieldPerm: FieldPermissionType,
    @Context() ctx: GqlContext,
  ): Promise<RoleType | null> {
    return ctx.loaders.roleById.load(fieldPerm.roleId);
  }
}
