import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlJwtGuard, GqlRbacGuard } from '../../guards/index.js';
import { GqlTenant } from '../../decorators/index.js';
import { MenuType } from '../types/menu.type.js';
import { CreateMenuInput } from '../inputs/create-menu.input.js';
import { ReorderMenuInput } from '../inputs/reorder-menu.input.js';

@Resolver(() => MenuType)
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class MenuResolver {
  @Query(() => [MenuType])
  async menus(@GqlTenant() tenantId?: number) {
    // TODO: Implement menu service call
    return [];
  }

  @Query(() => MenuType, { nullable: true })
  async menu(
    @Args('id', { type: () => String }) id: string,
    @GqlTenant() tenantId?: number,
  ) {
    // TODO: Implement menu service call
    return null;
  }

  @Query(() => MenuType, { nullable: true })
  async menuByLocation(
    @Args('location') location: string,
    @GqlTenant() tenantId?: number,
  ) {
    // TODO: Implement menu service call
    return null;
  }

  @Mutation(() => MenuType)
  async createMenu(
    @Args('input') input: CreateMenuInput,
    @GqlTenant() tenantId?: number,
  ) {
    // TODO: Implement menu service call
    return null;
  }

  @Mutation(() => MenuType)
  async updateMenu(
    @Args('id', { type: () => String }) id: string,
    @Args('input') input: CreateMenuInput,
    @GqlTenant() tenantId?: number,
  ) {
    // TODO: Implement menu service call
    return null;
  }

  @Mutation(() => MenuType)
  async reorderMenu(
    @Args('id', { type: () => String }) id: string,
    @Args('input') input: ReorderMenuInput,
    @GqlTenant() tenantId?: number,
  ) {
    // TODO: Implement menu service call
    return null;
  }

  @Mutation(() => Boolean)
  async deleteMenu(
    @Args('id', { type: () => String }) id: string,
    @GqlTenant() tenantId?: number,
  ) {
    // TODO: Implement menu service call
    return true;
  }
}
