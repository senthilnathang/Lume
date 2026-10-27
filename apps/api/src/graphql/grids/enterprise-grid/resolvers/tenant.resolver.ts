import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards, ForbiddenException } from '@nestjs/common';
import { TenantRegistryService } from '@core/services/tenant-registry.service';
import { GqlJwtGuard, GqlRbacGuard } from '../../../guards/index.js';
import { GqlCurrentUser } from '../../../decorators/index.js';
import { Permissions } from '../../../decorators/index.js';
import type { JwtPayload } from '../../../graphql.context';
import { TenantType } from '../types/tenant.type.js';
import { CreateTenantInput } from '../inputs/create-tenant.input.js';
import { UpdateTenantInput } from '../inputs/update-tenant.input.js';
import { TenantMembershipType } from '../types/tenant-membership.type';

@Resolver(() => TenantType)
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class TenantResolver {
  constructor(private registry: TenantRegistryService) {}
  @Query(() => TenantMembershipType)
  @Permissions('base.tenants.manage')
  async userTenantMembership(@Args('userId', { type: () => Int }) userId: number, @GqlCurrentUser() user?: JwtPayload) {
    if (!user) throw new ForbiddenException('Authentication required');
    return this.registry.membership(userId, user.sub);
  }

  @Mutation(() => TenantMembershipType)
  @Permissions('base.tenants.manage')
  async setUserTenant(@Args('userId', { type: () => Int }) userId: number,
    @Args('tenantId', { type: () => String, nullable: true }) tenantId: string | null | undefined,
    @GqlCurrentUser() user?: JwtPayload) {
    if (!user) throw new ForbiddenException('Authentication required');
    return this.registry.setMembership(userId, tenantId, user.sub);
  }
  @Query(() => [TenantType])
  @Permissions('base.tenants.manage')
  async tenants(@GqlCurrentUser() user?: JwtPayload) {
    if (!user) throw new ForbiddenException('Authentication required');
    return this.registry.list(user.sub);
  }

  @Query(() => TenantType, { nullable: true })
  @Permissions('base.tenants.manage')
  async tenant(
    @Args('id', { type: () => String }) id: string,
    @GqlCurrentUser() user?: JwtPayload,
  ) {
    if (!user) throw new ForbiddenException('Authentication required');
    return this.registry.find(id, user.sub);
  }

  @Mutation(() => TenantType)
  @Permissions('base.tenants.manage')
  async createTenant(
    @Args('input') input: CreateTenantInput,
    @GqlCurrentUser() user?: JwtPayload,
  ) {
    if (!user) throw new ForbiddenException('Authentication required');
    return this.registry.create(input, user.sub);
  }

  @Mutation(() => TenantType)
  @Permissions('base.tenants.manage')
  async updateTenant(
    @Args('id', { type: () => String }) id: string,
    @Args('input') input: UpdateTenantInput,
    @GqlCurrentUser() user?: JwtPayload,
  ) {
    if (!user) throw new ForbiddenException('Authentication required');
    return this.registry.update(id, input, user.sub);
  }

  @Mutation(() => Boolean)
  @Permissions('base.tenants.manage')
  async deleteTenant(
    @Args('id', { type: () => String }) id: string,
    @GqlCurrentUser() user?: JwtPayload,
  ) {
    if (!user) throw new ForbiddenException('Authentication required');
    return this.registry.archive(id, user.sub);
  }
}
