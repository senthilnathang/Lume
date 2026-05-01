import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlJwtGuard, GqlRbacGuard } from '../../guards/index.js';
import { Permissions, GqlTenant, GqlUser } from '../../decorators/index.js';
import { MarketplacePluginType } from '../types/marketplace-plugin.type.js';
import { MarketplaceCategoryType } from '../types/marketplace-category.type.js';
import { MarketplaceReviewType } from '../types/marketplace-review.type.js';
import { MarketplaceFilterInput } from '../inputs/marketplace-filter.input.js';
import { SubmitReviewInput } from '../inputs/submit-review.input.js';
import { InstallPluginInput } from '../inputs/install-plugin.input.js';
import { PaginatedType } from '../../shared/types/paginated.type.js';
import { MarketplaceService } from '@modules/plugins/services/marketplace.service';
import { PaginationInput } from '../../shared/inputs/pagination.input.js';

@Resolver()
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class MarketplaceResolver {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Query(() => [MarketplacePluginType])
  @Permissions('plugins.marketplace.read')
  async marketplacePlugins(
    @Args('filter', { nullable: true }) filter?: MarketplaceFilterInput,
    @Args('pagination', { nullable: true }) pagination?: PaginationInput,
  ) {
    const options = {
      page: pagination?.page || 1,
      limit: Math.min(pagination?.limit || 20, 100),
      ...filter,
    };

    const result = await this.marketplaceService.listAvailable(options);
    return result.data || [];
  }

  @Query(() => MarketplacePluginType, { nullable: true })
  @Permissions('plugins.marketplace.read')
  async marketplacePlugin(@Args('name', { type: () => String }) name: string) {
    const result = await this.marketplaceService.getPlugin(name);
    return result.data || null;
  }

  @Query(() => [MarketplaceCategoryType])
  @Permissions('plugins.marketplace.read')
  async marketplaceCategories() {
    try {
      // Placeholder - in production, fetch from database
      return [];
    } catch (error) {
      console.error('Fetch categories error:', error);
      return [];
    }
  }

  @Query(() => [MarketplacePluginType])
  @Permissions('plugins.marketplace.read')
  async featuredPlugins(@Args('limit', { type: () => Int, nullable: true }) limit?: number) {
    const result = await this.marketplaceService.getFeaturedPlugins(
      Math.min(limit || 10, 100),
    );
    return result.data || [];
  }

  @Query(() => [MarketplacePluginType])
  @Permissions('plugins.marketplace.read')
  async trendingPlugins(@Args('limit', { type: () => Int, nullable: true }) limit?: number) {
    const result = await this.marketplaceService.getTrendingPlugins(
      Math.min(limit || 10, 100),
    );
    return result.data || [];
  }

  @Mutation(() => MarketplacePluginType, { nullable: true })
  @Permissions('plugins.marketplace.install')
  async installPlugin(
    @Args('input') input: InstallPluginInput,
    @GqlUser() user: any,
  ) {
    const result = await this.marketplaceService.installFromMarketplace(
      input.name,
      input.version,
      user?.sub,
    );

    if (result.success) {
      const plugin = await this.marketplaceService.getPlugin(input.name);
      return plugin.data || null;
    }
    return null;
  }

  @Mutation(() => MarketplaceReviewType, { nullable: true })
  @Permissions('plugins.marketplace.review')
  async submitMarketplaceReview(
    @Args('input') input: SubmitReviewInput,
    @GqlUser() user: any,
  ) {
    const result = await this.marketplaceService.submitReview(
      input.pluginName,
      user?.sub,
      input.rating,
      input.title,
      input.body,
    );

    if (result.success) {
      return {
        id: `review-${Date.now()}`,
        pluginName: input.pluginName,
        userId: user?.sub,
        rating: input.rating,
        title: input.title,
        body: input.body,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return null;
  }
}
