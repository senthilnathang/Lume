import { Resolver, Query, Mutation, Subscription, Args, Int } from '@nestjs/graphql';
import { UseGuards, Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { GqlJwtGuard, GqlRbacGuard } from '../../guards/index.js';
import { GqlTenant } from '../../decorators/index.js';
import { PageType } from '../types/page.type.js';
import { PaginationInput } from '../../shared/inputs/pagination.input.js';
import { Paginated } from '../../shared/types/paginated.type.js';
import { CreatePageInput } from '../inputs/create-page.input.js';
import { UpdatePageInput } from '../inputs/update-page.input.js';

@Resolver(() => PageType)
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class PageResolver {
  constructor(@Inject('PubSub') private pubSub: PubSub) {}

  @Query(() => Paginated(PageType))
  async pages(
    @Args('status', { nullable: true }) status?: string,
    @Args('pagination', { nullable: true }) pagination?: PaginationInput,
    @GqlTenant() tenantId?: number,
  ) {
    const limit = Math.min(pagination?.limit || 20, 100);
    const page = pagination?.page || 1;
    // TODO: Implement page service call
    return {
      items: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    };
  }

  @Query(() => PageType, { nullable: true })
  async page(
    @Args('id', { type: () => String }) id: string,
    @GqlTenant() tenantId?: number,
  ) {
    // TODO: Implement page service call
    return null;
  }

  @Query(() => PageType, { nullable: true })
  async pageBySlug(
    @Args('slug') slug: string,
    @GqlTenant() tenantId?: number,
  ) {
    // TODO: Implement page service call
    return null;
  }

  @Mutation(() => PageType)
  async createPage(
    @Args('input') input: CreatePageInput,
    @GqlTenant() tenantId?: number,
  ) {
    // TODO: Implement page service call
    return null;
  }

  @Mutation(() => PageType)
  async updatePage(
    @Args('id', { type: () => String }) id: string,
    @Args('input') input: UpdatePageInput,
    @GqlTenant() tenantId?: number,
  ) {
    // TODO: Implement page service call
    return null;
  }

  @Mutation(() => Boolean)
  async deletePage(
    @Args('id', { type: () => String }) id: string,
    @GqlTenant() tenantId?: number,
  ) {
    // TODO: Implement page service call
    return true;
  }

  @Mutation(() => PageType)
  async publishPage(
    @Args('id', { type: () => String }) id: string,
    @GqlTenant() tenantId?: number,
  ) {
    // TODO: Implement page service call
    return null;
  }

  @Mutation(() => PageType)
  async schedulePage(
    @Args('id', { type: () => String }) id: string,
    @Args('publishAt') publishAt: Date,
    @GqlTenant() tenantId?: number,
  ) {
    // TODO: Implement page service call
    return null;
  }

  @Subscription(() => PageType, {
    filter: (payload, variables, context) => {
      return !context.user?.company_id ? false : true;
    },
  })
  pagePublished(@GqlTenant() tenantId?: number) {
    return this.pubSub.asyncIterableIterator(['PAGE_PUBLISHED']);
  }
}
