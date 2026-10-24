import {
  Resolver,
  Query,
  Args,
  Int,
} from '@nestjs/graphql';
import { BadRequestException, UseGuards } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';
import type { Permission } from '@prisma/client';
import { normalizePagination } from '../../../shared/inputs/pagination.input';
import { GqlJwtGuard } from '../../../guards/gql-jwt.guard';
import { GqlRbacGuard } from '../../../guards/gql-rbac.guard';
import { GqlCurrentUser } from '../../../decorators/gql-current-user.decorator';
import { Permissions } from '../../../../core/decorators/permissions.decorator';
import { PaginationInput } from '../../../shared/inputs/pagination.input';
import { PermissionType } from '../types/permission.type';
import type { JwtPayload } from '../../../graphql.context';

/**
 * PolicyGrid Permission Resolver
 * Read-only queries for permissions
 * Permissions are system-defined and managed via manifest installation
 */
@Resolver(() => PermissionType)
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class PermissionResolver {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(permission: Permission): PermissionType {
    return { ...permission, displayName: permission.display_name, isActive: permission.isActive === true };
  }

  @Query(() => [PermissionType], { name: 'permissions' })
  @Permissions('base.roles.read')
  async permissions(
    @Args('pagination', { nullable: true }) pagination: PaginationInput,
    @Args('category', { nullable: true }) category?: string,
    @GqlCurrentUser() user?: JwtPayload,
  ): Promise<PermissionType[]> {
    const { page, limit } = normalizePagination(pagination);
    const rows = await this.prisma.permission.findMany({
      where: { isActive: true, ...(category == null ? {} : { category }) },
      orderBy: { id: 'asc' }, skip: (page - 1) * limit, take: limit,
    });
    return rows.map(row => this.toGraphQL(row));
  }

  @Query(() => PermissionType, { name: 'permission', nullable: true })
  @Permissions('base.roles.read')
  async permission(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<PermissionType | null> {
    if (!Number.isSafeInteger(id) || id <= 0) throw new BadRequestException('Permission ID must be a positive integer');
    const row = await this.prisma.permission.findFirst({ where: { id, isActive: true } });
    return row ? this.toGraphQL(row) : null;
  }
}
